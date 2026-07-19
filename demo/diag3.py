"""验证根因假设：page.reload 前的 location.hash 设置触发了 onRouteChange → Storage.save 覆盖 PRESET_STATE"""
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


def read_state(page):
    return page.evaluate("""() => {
        try {
            const s = JSON.parse(localStorage.getItem('""" + KEY + """'));
            return {
                onboarded: s.onboarded,
                streak: s.streakDays,
                nick: s.user?.nickname,
                len: localStorage.getItem('""" + KEY + """').length
            };
        } catch(e) { return {error: e.message}; }
    }""")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 812})
    page = context.new_page()

    print("=== 实验 A：旧方式（reload 前 set hash）—— 复现 bug ===")
    page.goto(URL)
    page.wait_for_timeout(800)
    # 清空 localStorage
    page.evaluate("localStorage.clear()")

    # 写入 PRESET_STATE
    page.evaluate("(s) => localStorage.setItem('" + KEY + "', s)", json.dumps(PRESET_STATE))
    print("写入后:", read_state(page))

    # 旧方式：set hash → reload
    page.evaluate("location.hash = '#/index'")
    page.wait_for_timeout(300)  # 让 hashchange 触发 onRouteChange → Storage.save
    print("set hash 后 (hashchange 已触发):", read_state(page))
    page.reload()
    page.wait_for_timeout(1500)
    print("reload 后 hash =", page.evaluate("location.hash"))
    print("reload 后 state:", read_state(page))

    print("\n=== 实验 B：新方式（直接 goto，不 set hash）—— 验证修复 ===")
    # 清空 localStorage，重新开始
    page.evaluate("localStorage.clear()")
    page.evaluate("location.hash = ''")
    page.wait_for_timeout(300)

    # 写入 PRESET_STATE
    page.evaluate("(s) => localStorage.setItem('" + KEY + "', s)", json.dumps(PRESET_STATE))
    print("写入后:", read_state(page))

    # 新方式：直接 goto（fresh navigation，init 会读取 PRESET_STATE）
    page.goto(URL)
    page.wait_for_timeout(1500)
    print("goto 后 hash =", page.evaluate("location.hash"))
    print("goto 后 state:", read_state(page))

    # 验证 appState 全局变量
    app_state = page.evaluate("""() => {
        if (typeof appState !== 'undefined') {
            return {onboarded: appState.onboarded, streak: appState.streakDays, nick: appState.user?.nickname};
        }
        return 'appState not accessible';
    }""")
    print("goto 后 appState:", app_state)

    print("\n=== 实验 C：goto 后模拟摇骰子 ===")
    dice_clicked = page.evaluate("""() => {
        const btn = document.querySelector('[data-action="roll-dice"]');
        if (btn) { btn.click(); return 'clicked'; }
        return 'not found';
    }""")
    print("摇骰子按钮:", dice_clicked)
    page.wait_for_timeout(800)
    print("摇骰子后 hash =", page.evaluate("location.hash"))
    print("摇骰子后 state:", read_state(page))

    browser.close()
