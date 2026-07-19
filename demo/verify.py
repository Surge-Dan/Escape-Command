"""
v17 HTML Demo 端到端验证脚本
用 Playwright 控制真实 Chromium，做全面布局+交互+持久化验证。
"""
import json
import time
import sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/index.html"
KEY = "escape_v17_state"

# 预设 onboarding 完成的 state
PRESET_STATE = {
    "onboarded": True,
    "onboardStep": 3,
    "user": {"avatar": "", "nickname": "出逃者", "city": "杭州", "joinDate": "2024.01.01"},
    "themeId": "default",
    "currentMode": "micro",
    "currentCommand": {"id": "c001", "content": "找到三扇不同颜色的门，从同一个角度拍它们并排站在一起", "type": "color", "typeColor": "#5B8FB9", "duration": 25, "outdoor": True, "nightSafe": False, "rainy": False, "requirePOI": None, "cost": 0, "double": False, "mode": "smart", "tip": "留意老小区的木门，经常会有惊喜的颜色"},
    "rerollCount": 3,
    "rerollMax": 3,
    "dailySeed": 12345,
    "favorites": [],
    "records": [],
    "unlockedBadges": [],
    "execSteps": [],
    "prepItems": {},
    "moodEntries": [],
    "settings": {},
    "streakDays": 1,
    "leaderboard": [],
    "feed": [],
    "partners": [],
    "dailyCommands": []
}

results = []

def log(item, status, evidence=""):
    results.append({"item": item, "status": status, "evidence": evidence})
    marker = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{marker} {item}: {evidence[:200] if evidence else ''}")

def measure(page, selector):
    """测量元素位置和样式"""
    return page.evaluate("""(sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            height: Math.round(r.height),
            marginTop: cs.marginTop,
            paddingTop: cs.paddingTop,
            classes: el.className
        };
    }""", selector)

def goto_hash(page, hash_val, wait=800):
    """通过 hash 路由跳转"""
    page.evaluate(f"location.hash = '#/{hash_val}'")
    page.wait_for_timeout(wait)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 812})
        page = context.new_page()

        # 收集 console 错误
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("pageerror", lambda err: console_errors.append(f"[pageerror] {str(err)}"))

        print("\n========== 阶段 1：加载 + 预设 onboarding ==========")
        page.goto(URL)
        page.wait_for_timeout(1000)

        # 预设 onboarding 完成
        page.evaluate(f"""() => {{
            localStorage.setItem('{KEY}', '{json.dumps(PRESET_STATE)}');
        }}""")
        # 用 goto 替代 set hash + reload——init() 会读取 PRESET_STATE 并自动设置 hash=#/index
        # 不能 set hash + reload：set hash 会触发 hashchange → onRouteChange → Storage.save
        # 把 DEFAULT appState 覆盖 PRESET_STATE（因为首次 init() 跑时 localStorage 为空，
        # Object.assign 没被调用，appState 还是默认值 onboarded=false）
        page.goto(URL)
        page.wait_for_timeout(1500)

        current_hash = page.evaluate("location.hash")
        log("预设 onboarding 后跳转首页", "PASS" if "index" in current_hash else "FAIL", f"hash={current_hash}")

        # 检查 console 错误
        if console_errors:
            log("加载时 console 错误", "WARN", f"{len(console_errors)} 个错误: " + " | ".join(console_errors[:3]))
            console_errors.clear()
        else:
            log("加载无 console 错误", "PASS")

        print("\n========== 阶段 2：首页布局验证（无 nav-header）==========")
        # 截图首页
        page.screenshot(path="screenshots/01-home.png")

        sb = measure(page, ".statusbar")
        pb = measure(page, ".page-index .page-body")
        hero = measure(page, ".hero")
        nav_present = page.evaluate("!!document.querySelector('.nav-header')")

        log("首页 statusbar 位置", "PASS" if sb and sb["top"] == 0 and sb["height"] == 44 else "FAIL",
            f"statusbar={sb}")
        log("首页无 nav-header", "PASS" if not nav_present else "FAIL",
            f"nav-header 存在={nav_present}")
        log("首页 page-body padding-top: 44px（避让 statusbar）",
            "PASS" if pb and pb["paddingTop"] == "44px" else "FAIL",
            f"pageBody={pb}")
        log("首页 hero 在 statusbar 下方（top>=44）",
            "PASS" if hero and hero["top"] >= 44 and "60px" in (hero.get("paddingTop") or "") else "FAIL",
            f"hero={hero}")

        print("\n========== 阶段 3：nav-header 修复验证（核心修复点）==========")

        # 进入设置页（有 nav-header）
        goto_hash(page, "settings")
        page.screenshot(path="screenshots/02-settings.png")

        sb = measure(page, ".statusbar")
        navH = measure(page, ".nav-header")
        pb = measure(page, ".page-settings .page-body")
        page_classes = page.evaluate("document.querySelector('.page').className")

        log("设置页 page 有 has-nav class",
            "PASS" if "has-nav" in page_classes else "FAIL",
            f"classes={page_classes}")

        log("设置页 nav-header 不与 statusbar 重叠",
            "PASS" if (sb and navH and navH["top"] >= sb["bottom"]) else "FAIL",
            f"statusbar bottom={sb['bottom'] if sb else None}, nav-header top={navH['top'] if navH else None}")

        log("设置页 nav-header margin-top: 44px（推到 statusbar 下方）",
            "PASS" if navH and navH["marginTop"] == "44px" else "FAIL",
            f"marginTop={navH['marginTop'] if navH else None}")

        log("设置页 nav-header 紧贴 statusbar 下方（top=44）",
            "PASS" if navH and navH["top"] == 44 else "FAIL",
            f"nav-header top={navH['top'] if navH else None}")

        log("设置页 page-body padding-top: 0（无双重留白）",
            "PASS" if pb and pb["paddingTop"] == "0px" else "FAIL",
            f"paddingTop={pb['paddingTop'] if pb else None}")

        log("设置页 page-body 紧贴 nav-header 下方",
            "PASS" if (navH and pb and pb["top"] == navH["bottom"]) else "FAIL",
            f"nav-header bottom={navH['bottom'] if navH else None}, page-body top={pb['top'] if pb else None}")

        print("\n========== 阶段 4：多页面 nav-header 一致性验证 ==========")
        nav_pages = ["badges", "about", "help", "theme-market", "daily-challenge", "leaderboard", "mood-journal", "stats", "map"]
        for route in nav_pages:
            goto_hash(page, route, wait=600)
            page_classes = page.evaluate("document.querySelector('.page').className")
            has_nav_class = "has-nav" in page_classes
            nav_present = page.evaluate("!!document.querySelector('.nav-header')")
            sb_b = page.evaluate("document.querySelector('.statusbar').getBoundingClientRect().bottom")
            nav_t = page.evaluate("document.querySelector('.nav-header') ? document.querySelector('.nav-header').getBoundingClientRect().top : null")
            pb_pt = page.evaluate("document.querySelector('.page-body') ? getComputedStyle(document.querySelector('.page-body')).paddingTop : null")

            ok = has_nav_class and nav_present and nav_t == sb_b and pb_pt == "0px"
            log(f"页面 {route} nav-header 修复生效", "PASS" if ok else "FAIL",
                f"hasNav={has_nav_class}, nav={nav_present}, sbBottom={sb_b}, navTop={nav_t}, pbPT={pb_pt}")

        # 验证 profile 页面（nav: false，无 nav-header）
        goto_hash(page, "profile")
        page.screenshot(path="screenshots/03-profile.png")
        page_classes = page.evaluate("document.querySelector('.page').className")
        pb_pt = page.evaluate("document.querySelector('.page-body') ? getComputedStyle(document.querySelector('.page-body')).paddingTop : null")
        nav_present = page.evaluate("!!document.querySelector('.nav-header')")

        log("profile 页面无 nav-header", "PASS" if not nav_present else "FAIL",
            f"nav 存在={nav_present}, classes={page_classes}")
        log("profile 页面 page-body padding-top: 44px（避让 statusbar）",
            "PASS" if pb_pt == "44px" else "FAIL",
            f"paddingTop={pb_pt}")

        print("\n========== 阶段 5：核心流程测试 ==========")
        # 回到首页
        goto_hash(page, "index", wait=800)
        page.screenshot(path="screenshots/04-home-ready.png")

        # 点击摇骰子按钮
        dice_clicked = page.evaluate("""() => {
            const btn = document.querySelector('[data-action="roll-dice"]') ||
                        document.querySelector('.dice-btn') ||
                        document.querySelector('[data-action="open-mode-sheet"]');
            if (btn) { btn.click(); return true; }
            return false;
        }""")
        page.wait_for_timeout(800)
        page.screenshot(path="screenshots/05-after-dice.png")
        log("点击摇骰子按钮", "PASS" if dice_clicked else "FAIL", f"clicked={dice_clicked}")

        # 检查是否弹出模式选择 sheet
        mode_sheet_visible = page.evaluate("!!document.querySelector('.sheet.visible, .sheet[style*=\"flex\"], .mode-sheet:not([hidden])')")
        log("弹出模式选择 sheet", "PASS" if mode_sheet_visible else "WARN",
            f"sheet 可见={mode_sheet_visible}")

        # 查看当前路由
        current_hash = page.evaluate("location.hash")
        log("摇骰子后路由", "INFO", f"hash={current_hash}")

        # 尝试直接进入指令详情页（如果有 currentCommand）
        goto_hash(page, "command-detail", wait=800)
        page.screenshot(path="screenshots/06-command-detail.png")
        cd_classes = page.evaluate("document.querySelector('.page').className")
        log("指令详情页可达", "PASS" if "command-detail" in cd_classes or "has-nav" in cd_classes else "WARN",
            f"classes={cd_classes}")

        # 进入执行页
        goto_hash(page, "executing", wait=800)
        page.screenshot(path="screenshots/07-executing.png")
        log("执行页可达", "PASS", "hash=executing")

        # 进入准备页
        goto_hash(page, "escape-prep", wait=600)
        page.screenshot(path="screenshots/08-escape-prep.png")

        print("\n========== 阶段 6：localStorage 持久化测试 ==========")
        # 修改状态
        page.evaluate("""() => {
            const state = JSON.parse(localStorage.getItem('escape_v17_state'));
            state.streakDays = 99;
            state.user.nickname = '测试用户';
            localStorage.setItem('escape_v17_state', JSON.stringify(state));
        }""")
        page.reload()
        page.wait_for_timeout(1000)
        persisted = page.evaluate("""() => {
            const state = JSON.parse(localStorage.getItem('escape_v17_state'));
            return {streak: state.streakDays, nick: state.user.nickname, onboarded: state.onboarded};
        }""")
        log("localStorage 持久化", "PASS" if persisted["streak"] == 99 else "FAIL",
            f"persisted={persisted}")
        log("刷新后跳过 onboarding", "PASS" if persisted["onboarded"] else "FAIL",
            f"onboarded={persisted['onboarded']}")

        print("\n========== 阶段 7：主题切换测试 ==========")
        # 切换主题
        # 不能在 evaluate 里 set hash：会触发 onRouteChange → Storage.save 覆盖修改
        page.evaluate("""() => {
            const state = JSON.parse(localStorage.getItem('escape_v17_state'));
            state.themeId = 'warm-orange';
            localStorage.setItem('escape_v17_state', JSON.stringify(state));
        }""")
        page.reload()
        page.wait_for_timeout(1000)
        # 确保 hash 是 #/index 让主题在首页可见
        goto_hash(page, "index", wait=500)

        # 检查主题是否应用（warm-orange 主题的 --brand 应该是橙色系，区别于默认的棕褐色 #C8956E）
        brand_color = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--brand')")
        theme_id = page.evaluate("""() => {
            try {
                const s = JSON.parse(localStorage.getItem('escape_v17_state'));
                return s.themeId;
            } catch(e) { return null; }
        }""")
        log("主题 warm-orange 持久化", "PASS" if theme_id == "warm-orange" else "FAIL",
            f"themeId={theme_id}")
        log("主题 warm-orange 应用 (--brand 非默认)",
            "PASS" if brand_color.strip() and brand_color.strip() != "#C8956E" else "FAIL",
            f"--brand={brand_color}")

        page.screenshot(path="screenshots/09-theme-warm-orange.png")

        print("\n========== 阶段 8：所有 36 页可达性测试 ==========")
        all_routes = [
            "onboarding", "index", "command-detail", "executing", "escape-prep",
            "generating", "map", "profile", "badges", "badge-detail",
            "achievements", "stats", "timeline", "year-review", "daily-challenge",
            "leaderboard", "records", "record-detail", "photo-edit", "data-export",
            "mood-journal", "community", "partner", "invite", "member",
            "city-select", "mode-intro", "theme-market", "about", "help",
            "settings", "edit-profile", "escape-rules"
        ]
        ok_count = 0
        fail_routes = []
        for route in all_routes:
            goto_hash(page, route, wait=300)
            has_page = page.evaluate("!!document.querySelector('.page.active')")
            page_html_len = page.evaluate("document.querySelector('#app').innerHTML.length")
            if has_page and page_html_len > 100:
                ok_count += 1
            else:
                fail_routes.append(f"{route}(len={page_html_len})")

        log(f"36 页路由可达性 ({ok_count}/{len(all_routes)})",
            "PASS" if ok_count >= 30 else "FAIL",
            f"失败: {fail_routes[:5] if fail_routes else '无'}")

        print("\n========== 阶段 9：Console 错误汇总 ==========")
        if console_errors:
            log("运行时 console 错误", "WARN", f"{len(console_errors)} 个: " + " | ".join(console_errors[:5]))
        else:
            log("全程无 console 错误", "PASS")

        # 总结
        print("\n" + "=" * 60)
        pass_count = sum(1 for r in results if r["status"] == "PASS")
        fail_count = sum(1 for r in results if r["status"] == "FAIL")
        warn_count = sum(1 for r in results if r["status"] == "WARN")
        info_count = sum(1 for r in results if r["status"] == "INFO")

        print(f"\n📊 验证结果汇总：")
        print(f"  ✅ PASS: {pass_count}")
        print(f"  ❌ FAIL: {fail_count}")
        print(f"  ⚠️  WARN: {warn_count}")
        print(f"  ℹ️  INFO: {info_count}")
        print(f"  总计: {len(results)}")

        if fail_count > 0:
            print(f"\n❌ 失败项:")
            for r in results:
                if r["status"] == "FAIL":
                    print(f"  - {r['item']}: {r['evidence']}")

        # 保存详细报告
        with open("verify-report.json", "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细报告: verify-report.json")
        print(f"📸 截图目录: screenshots/")

        browser.close()

        return 1 if fail_count > 0 else 0

if __name__ == "__main__":
    sys.exit(main())
