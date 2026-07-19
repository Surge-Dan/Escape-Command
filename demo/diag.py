"""诊断 profile 页面的 page-body padding-top 问题"""
import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/index.html"
KEY = "escape_v17_state"
PRESET_STATE = {
    "onboarded": True, "onboardStep": 3,
    "user": {"avatar": "", "nickname": "出逃者", "city": "杭州"},
    "themeId": "default", "currentMode": "micro",
    "currentCommand": None, "rerollCount": 3, "rerollMax": 3,
    "dailySeed": 12345, "favorites": [], "records": [],
    "unlockedBadges": [], "execSteps": {}, "prepItems": {},
    "moodEntries": [], "settings": {}, "streakDays": 1,
    "leaderboard": [], "feed": [], "partners": [], "dailyCommands": []
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 812})
    page = context.new_page()

    page.goto(URL)
    page.wait_for_timeout(800)

    # 预设 state
    page.evaluate("() => { localStorage.setItem('" + KEY + "', '" + json.dumps(PRESET_STATE) + "'); }")
    page.reload()
    page.wait_for_timeout(1500)

    print("After reload, hash =", page.evaluate("location.hash"))

    # 强制跳到 profile
    page.evaluate("location.hash = '#/profile'")
    page.wait_for_timeout(1500)

    print("\n=== Profile 页面诊断 ===")
    print("hash =", page.evaluate("location.hash"))
    print("#app innerHTML length =", page.evaluate("document.querySelector('#app').innerHTML.length"))
    print(".page className =", page.evaluate("document.querySelector('.page').className"))

    # 详细测量 page-body
    diag = page.evaluate("""() => {
        const pb = document.querySelector('.page-body');
        if (!pb) return 'NO .page-body';
        const r = pb.getBoundingClientRect();
        const cs = getComputedStyle(pb);
        return {
            rect: {top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height},
            computed: {
                paddingTop: cs.paddingTop,
                marginTop: cs.marginTop,
                display: cs.display,
                position: cs.position,
                flex: cs.flex,
                overflow: cs.overflow
            },
            parent: pb.parentElement ? {
                tag: pb.parentElement.tagName,
                className: pb.parentElement.className,
                display: getComputedStyle(pb.parentElement).display,
                flexDirection: getComputedStyle(pb.parentElement).flexDirection
            } : null,
            children: Array.from(pb.children).map(c => ({
                tag: c.tagName,
                className: c.className,
                paddingTop: getComputedStyle(c).paddingTop
            })),
            innerHTML_first_300: pb.innerHTML.substring(0, 300)
        };
    }""")
    print("\n.page-body 详情:")
    print(json.dumps(diag, indent=2, ensure_ascii=False))

    # 同时检查 statusbar
    sb = page.evaluate("""() => {
        const el = document.querySelector('.statusbar');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
            rect: {top: r.top, height: r.height, bottom: r.bottom},
            display: cs.display,
            position: cs.position,
            zIndex: cs.zIndex
        };
    }""")
    print("\n.statusbar 详情:")
    print(json.dumps(sb, indent=2, ensure_ascii=False))

    # 检查所有 padding 相关 CSS 规则
    print("\n=== 检查匹配 .page-body 的所有 CSS 规则 ===")
    rules = page.evaluate("""() => {
        const results = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText && rule.selectorText.includes('page-body')) {
                        results.push({
                            selector: rule.selectorText,
                            paddingTop: rule.style.paddingTop || null
                        });
                    }
                }
            } catch(e) { results.push({error: e.message, sheet: sheet.href}); }
        }
        return results;
    }""")
    print(json.dumps(rules, indent=2, ensure_ascii=False))

    # 测试切换到 settings 页面对比
    page.evaluate("location.hash = '#/settings'")
    page.wait_for_timeout(1000)
    print("\n=== Settings 页面对比 ===")
    print(".page className =", page.evaluate("document.querySelector('.page').className"))
    pb_settings = page.evaluate("""() => {
        const pb = document.querySelector('.page-body');
        const cs = getComputedStyle(pb);
        return {paddingTop: cs.paddingTop, rect_top: pb.getBoundingClientRect().top};
    }""")
    print("settings .page-body:", pb_settings)

    browser.close()
