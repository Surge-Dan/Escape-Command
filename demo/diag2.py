"""诊断 localStorage 持久化问题"""
import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/index.html"
KEY = "escape_v17_state"
PRESET_STATE = {
    "onboarded": True, "onboardStep": 3,
    "user": {"avatar": "", "nickname": "出逃者", "city": "杭州", "joinDate": "2024.01.01"},
    "themeId": "default", "currentMode": "micro",
    "currentCommand": None,
    "rerollCount": 3, "rerollMax": 3,
    "dailySeed": 12345, "favorites": [], "records": [],
    "unlockedBadges": [], "execSteps": [], "prepItems": {},
    "moodEntries": [], "settings": {}, "streakDays": 1,
    "leaderboard": [], "feed": [], "partners": [], "dailyCommands": []
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 812})
    page = context.new_page()

    page.goto(URL)
    page.wait_for_timeout(800)

    # 写入前
    before = page.evaluate("localStorage.getItem('" + KEY + "')")
    print("写入前 localStorage:", before[:100] if before else "null")

    # 写入 PRESET_STATE
    state_json = json.dumps(PRESET_STATE)
    print("\nPRESET_STATE JSON 长度:", len(state_json))
    print("PRESET_STATE JSON 前 200 字符:", state_json[:200])

    # 用更安全的方式写入
    page.evaluate("(state) => localStorage.setItem('" + KEY + "', state)", state_json)

    # 写入后立即读取
    after = page.evaluate("localStorage.getItem('" + KEY + "')")
    print("\n写入后 localStorage 长度:", len(after) if after else 0)
    print("写入后 localStorage 前 200 字符:", after[:200] if after else "null")

    # 解析验证
    parsed = page.evaluate("""() => {
        try {
            const s = JSON.parse(localStorage.getItem('""" + KEY + """'));
            return {onboarded: s.onboarded, streak: s.streakDays, nick: s.user?.nickname, mode: s.currentMode};
        } catch(e) { return {error: e.message}; }
    }""")
    print("\n解析后:", parsed)

    # 用 goto 替代 set hash + reload——init() 会读取 PRESET_STATE 并自动设置 hash=#/index
    # 不能 set hash + reload：set hash 会触发 hashchange → onRouteChange → Storage.save 覆盖 PRESET_STATE
    page.goto(URL)
    page.wait_for_timeout(1500)

    # reload 后检查 appState（通过 DOM）
    print("\n=== reload 后 ===")
    print("hash =", page.evaluate("location.hash"))

    # 检查 localStorage 是否还在
    after_reload = page.evaluate("localStorage.getItem('" + KEY + "')")
    print("reload 后 localStorage 长度:", len(after_reload) if after_reload else 0)

    # 解析 reload 后的 state
    parsed_after = page.evaluate("""() => {
        try {
            const s = JSON.parse(localStorage.getItem('""" + KEY + """'));
            return {onboarded: s.onboarded, streak: s.streakDays, nick: s.user?.nickname};
        } catch(e) { return {error: e.message}; }
    }""")
    print("reload 后解析:", parsed_after)

    # 检查 appState（通过全局变量，如果暴露了的话）
    app_state_check = page.evaluate("""() => {
        if (typeof appState !== 'undefined') {
            return {onboarded: appState.onboarded, streak: appState.streakDays, nick: appState.user?.nickname};
        }
        return 'appState not accessible';
    }""")
    print("appState 全局变量:", app_state_check)

    # 模拟点击摇骰子按钮，看是否触发 onboarding
    print("\n=== 模拟摇骰子 ===")
    dice_clicked = page.evaluate("""() => {
        const btn = document.querySelector('[data-action="roll-dice"]');
        if (btn) { console.log('roll-dice button found, classes:', btn.className); btn.click(); return 'clicked'; }
        return 'not found: ' + document.querySelector('[data-action]')?.dataset.action;
    }""")
    print("摇骰子按钮:", dice_clicked)

    page.wait_for_timeout(800)
    print("摇骰子后 hash =", page.evaluate("location.hash"))

    # 再次检查 localStorage
    final = page.evaluate("""() => {
        try {
            const s = JSON.parse(localStorage.getItem('""" + KEY + """'));
            return {onboarded: s.onboarded, streak: s.streakDays, nick: s.user?.nickname};
        } catch(e) { return {error: e.message}; }
    }""")
    print("摇骰子后 localStorage:", final)

    browser.close()
