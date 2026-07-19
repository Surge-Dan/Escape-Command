"""
v17 HTML Demo 深度对抗式审查 E2E 测试
覆盖完整出逃流程 + 边界 case + 视觉一致性
"""
import json
import time
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
    "unlockedBadges": [], "execSteps": [], "prepItems": [False, False, False, False],
    "moodEntries": [], "settings": {}, "streakDays": 1,
    "leaderboard": [], "feed": [], "partners": [], "dailyCommands": []
}

results = []


def log(item, status, evidence=""):
    results.append({"item": item, "status": status, "evidence": evidence})
    marker = "PASS" if status == "PASS" else "FAIL" if status == "FAIL" else "WARN" if status == "WARN" else "INFO"
    print(f"[{marker}] {item}: {evidence[:200] if evidence else ''}")


def click_action(page, action, wait=500):
    return page.evaluate(
        "(action) => { const btn = document.querySelector('[data-action=\"' + action + '\"]'); if (btn) { btn.click(); return true; } return false; }",
        action
    )


def get_state(page):
    js = (
        "() => { try { const s = JSON.parse(localStorage.getItem('" + KEY + "')); "
        "return { onboarded: s.onboarded, rerollCount: s.rerollCount, "
        "currentCommand: s.currentCommand ? {id: s.currentCommand.id, type: s.currentCommand.type, mode: s.currentCommand.mode} : null, "
        "favorites: s.favorites, records: s.records ? s.records.length : 0, "
        "unlockedBadges: s.unlockedBadges, totalEscapes: s.totalEscapes, "
        "streakDays: s.streakDays, themeId: s.themeId, currentMode: s.currentMode, "
        "execSteps: s.execSteps ? s.execSteps.length : 0, execStepsDone: s.execStepsDone, "
        "prepItems: s.prepItems, mapMode: s.mapMode, moodEntries: s.moodEntries ? s.moodEntries.length : 0 }; "
        "} catch(e) { return {error: e.message}; } }"
    )
    return page.evaluate(js)


def goto_hash(page, hash_val, wait=600):
    page.evaluate(f"location.hash = '#/{hash_val}'")
    page.wait_for_timeout(wait)


def set_state_field(page, **fields):
    """直接修改 localStorage 中的 state 字段"""
    field_js = ", ".join(f"s.{k} = {json.dumps(v)}" for k, v in fields.items())
    page.evaluate(
        "(code) => { const s = JSON.parse(localStorage.getItem('" + KEY + "')); "
        "eval('s.' + code); "
        "localStorage.setItem('" + KEY + "', JSON.stringify(s)); }",
        field_js
    )


def preset_state(page, state=None):
    """预设 state 并 reload"""
    s = state or PRESET_STATE
    page.evaluate(
        "(json) => localStorage.setItem('" + KEY + "', json)",
        json.dumps(s)
    )
    page.goto(URL)
    page.wait_for_timeout(1000)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 812})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("pageerror", lambda err: console_errors.append(f"[pageerror] {str(err)}"))

        print("\n========== Phase 1: Onboarding flow ==========")
        # 清空开始
        page.goto(URL)
        page.wait_for_timeout(800)
        page.evaluate("localStorage.clear()")
        page.goto(URL)
        page.wait_for_timeout(800)

        hash_val = page.evaluate("location.hash")
        log("First entry redirects to onboarding", "PASS" if "onboarding" in hash_val else "FAIL", f"hash={hash_val}")

        # 3 次 "继续"
        for i in range(3):
            clicked = click_action(page, "onboard-next", wait=400)
            log(f"Onboarding step {i+1} clicked", "PASS" if clicked else "FAIL", f"clicked={clicked}")

        # "开始出逃"
        clicked = click_action(page, "onboard-finish", wait=800)
        hash_val = page.evaluate("location.hash")
        log("Onboarding finished -> index", "PASS" if "index" in hash_val else "FAIL", f"hash={hash_val}")

        state = get_state(page)
        log("state.onboarded=true after onboarding", "PASS" if state["onboarded"] else "FAIL", f"state={state}")
        page.screenshot(path="screenshots/e2e-01-home-after-onboard.png")

        print("\n========== Phase 2: Full escape flow ==========")
        # 摇骰子
        clicked = click_action(page, "roll-dice", wait=100)
        log("Click roll-dice", "PASS" if clicked else "FAIL", f"clicked={clicked}")
        # 600ms loading + 1200ms generating = 1800ms
        page.wait_for_timeout(2000)

        hash_val = page.evaluate("location.hash")
        log("After dice -> back to index", "PASS" if "index" in hash_val else "FAIL", f"hash={hash_val}")

        state = get_state(page)
        log("currentCommand generated", "PASS" if state["currentCommand"] else "FAIL", f"cmd={state['currentCommand']}")
        log("rerollCount -= 1 (now 2)", "PASS" if state["rerollCount"] == 2 else "FAIL", f"rerollCount={state['rerollCount']}")
        page.screenshot(path="screenshots/e2e-02-after-dice.png")

        # 点击 escape-card 进入 command-detail（不是 start-escape！）
        clicked = click_action(page, "view-command", wait=800)
        hash_val = page.evaluate("location.hash")
        log("Click view-command -> command-detail", "PASS" if "command-detail" in hash_val else "FAIL", f"hash={hash_val}")

        # 在 command-detail 页点击 "接受指令"
        clicked = click_action(page, "start-escape", wait=800)
        hash_val = page.evaluate("location.hash")
        log("Click start-escape -> escape-prep", "PASS" if "escape-prep" in hash_val else "FAIL", f"hash={hash_val}")

        state = get_state(page)
        log("execSteps init to 4 items", "PASS" if state["execSteps"] == 4 else "FAIL", f"execSteps={state['execSteps']}")

        # 切换 prep items
        prep_count = page.evaluate("() => document.querySelectorAll('[data-action=\"toggle-prep\"]').length")
        log("escape-prep has 4 prep items", "PASS" if prep_count == 4 else "FAIL", f"prep_count={prep_count}")

        for i in range(4):
            page.evaluate(
                "(i) => { const btns = document.querySelectorAll('[data-action=\"toggle-prep\"]'); if (btns[i]) btns[i].click(); }",
                i
            )
            page.wait_for_timeout(100)

        state = get_state(page)
        all_prep_done = all(state.get("prepItems", []))
        log("All 4 prep items toggled to done", "PASS" if all_prep_done else "FAIL", f"prepItems={state.get('prepItems')}")

        # 点击出发
        clicked = page.evaluate("() => { const btn = document.querySelector('[data-action=\"navigate\"][data-route=\"executing\"]'); if (btn) { btn.click(); return true; } return false; }")
        page.wait_for_timeout(800)
        hash_val = page.evaluate("location.hash")
        log("Click 'depart' -> executing", "PASS" if "executing" in hash_val else "FAIL", f"hash={hash_val}")

        # 切换 4 步骤
        step_count = page.evaluate("() => document.querySelectorAll('[data-action=\"toggle-step\"]').length")
        log("executing has 4 steps", "PASS" if step_count == 4 else "FAIL", f"step_count={step_count}")

        for i in range(4):
            page.evaluate(
                "(i) => { const btns = document.querySelectorAll('[data-action=\"toggle-step\"]'); if (btns[i]) btns[i].click(); }",
                i
            )
            page.wait_for_timeout(100)

        finish_visible = page.evaluate("() => { const wrap = document.querySelector('.exec-finish-wrap'); if (!wrap) return false; return wrap.classList.contains('show'); }")
        log("Finish button appears after 4 steps done", "PASS" if finish_visible else "FAIL", f"finish_visible={finish_visible}")
        page.screenshot(path="screenshots/e2e-03-executing-all-done.png")

        # 完成出逃
        clicked = click_action(page, "finish-escape", wait=100)
        page.wait_for_timeout(1200)
        hash_val = page.evaluate("location.hash")
        log("finish-escape -> timeline", "PASS" if "timeline" in hash_val else "FAIL", f"hash={hash_val}")

        state = get_state(page)
        log("records +1", "PASS" if state["records"] >= 1 else "FAIL", f"records={state['records']}")
        log("totalEscapes +1", "PASS" if state["totalEscapes"] >= 1 else "FAIL", f"totalEscapes={state['totalEscapes']}")
        log("first_escape badge unlocked", "PASS" if "first_escape" in state["unlockedBadges"] else "FAIL", f"unlockedBadges={state['unlockedBadges']}")
        log("currentCommand reset to null", "PASS" if state["currentCommand"] is None else "FAIL", f"currentCommand={state['currentCommand']}")
        page.screenshot(path="screenshots/e2e-04-timeline.png")

        print("\n========== Phase 3: Edge case - reroll exhaustion ==========")
        # 设置 rerollCount=0 并 reload
        page.evaluate(
            "(json) => { const s = JSON.parse(localStorage.getItem('" + KEY + "')); Object.assign(s, JSON.parse(json)); localStorage.setItem('" + KEY + "', JSON.stringify(s)); }",
            json.dumps({"rerollCount": 0, "currentCommand": None})
        )
        page.goto(URL)
        page.wait_for_timeout(1000)

        clicked = click_action(page, "roll-dice", wait=500)
        custom_visible = page.evaluate("() => { const sheet = document.querySelector('#customSheet'); if (!sheet) return false; return sheet.classList.contains('show'); }")
        log("Reroll exhausted opens customSheet", "PASS" if custom_visible else "FAIL", f"custom_visible={custom_visible}")

        # 关闭 sheet
        page.evaluate("() => { const sheet = document.querySelector('#customSheet'); if (sheet) sheet.classList.remove('show'); }")

        print("\n========== Phase 4: Favorites toggle ==========")
        preset_state(page)
        click_action(page, "roll-dice", wait=100)
        page.wait_for_timeout(2000)

        # 先到 command-detail 页才能看到 toggle-fav
        click_action(page, "view-command", wait=800)
        hash_val = page.evaluate("location.hash")
        log("Navigate to command-detail for fav test", "PASS" if "command-detail" in hash_val else "FAIL", f"hash={hash_val}")

        fav_exists = page.evaluate("() => !!document.querySelector('[data-action=\"toggle-fav\"]')")
        log("Command card has favorite button", "PASS" if fav_exists else "FAIL", f"fav_exists={fav_exists}")

        if fav_exists:
            page.evaluate("() => { const btn = document.querySelector('[data-action=\"toggle-fav\"]'); if (btn) btn.click(); }")
            page.wait_for_timeout(300)
            state = get_state(page)
            log("Click favorite -> favorites+1", "PASS" if len(state["favorites"]) >= 1 else "FAIL", f"favorites={state['favorites']}")

            page.evaluate("() => { const btn = document.querySelector('[data-action=\"toggle-fav\"]'); if (btn) btn.click(); }")
            page.wait_for_timeout(300)
            state = get_state(page)
            log("Click favorite again -> removed", "PASS" if len(state["favorites"]) == 0 else "FAIL", f"favorites={state['favorites']}")

        print("\n========== Phase 5: 3 themes switch ==========")
        themes = [
            ("default", "#c8956e"),
            ("warm-orange", "#d98a5c"),
            ("lavender", "#9b7bb8")
        ]

        for theme_id, expected_brand in themes:
            # 修改 state 然后 goto
            page.evaluate(
                "(json) => { const s = JSON.parse(localStorage.getItem('" + KEY + "')); Object.assign(s, JSON.parse(json)); localStorage.setItem('" + KEY + "', JSON.stringify(s)); }",
                json.dumps({"themeId": theme_id})
            )
            page.goto(URL)
            page.wait_for_timeout(1000)

            brand_color = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--brand')")
            brand_clean = brand_color.strip().lower()
            log(f"Theme {theme_id} applied (--brand={expected_brand})", "PASS" if brand_clean == expected_brand else "FAIL", f"actual={brand_clean}")
            page.screenshot(path=f"screenshots/e2e-05-theme-{theme_id}.png")

        print("\n========== Phase 6: Map mode switch ==========")
        # 回默认主题
        page.evaluate(
            "(json) => { const s = JSON.parse(localStorage.getItem('" + KEY + "')); Object.assign(s, JSON.parse(json)); localStorage.setItem('" + KEY + "', JSON.stringify(s)); }",
            json.dumps({"themeId": "default"})
        )
        page.goto(URL)
        page.wait_for_timeout(800)
        goto_hash(page, "map", wait=800)

        # 切换卫星
        page.evaluate("() => { const btn = document.querySelector('[data-action=\"map-mode\"][data-id=\"satellite\"]'); if (btn) btn.click(); }")
        page.wait_for_timeout(400)
        map_mode = page.evaluate("(key) => { const s = JSON.parse(localStorage.getItem(key)); return s.mapMode; }", KEY)
        log("Switch to satellite mode", "PASS" if map_mode == "satellite" else "FAIL", f"mapMode={map_mode}")

        # 切换路线
        page.evaluate("() => { const btn = document.querySelector('[data-action=\"map-mode\"][data-id=\"route\"]'); if (btn) btn.click(); }")
        page.wait_for_timeout(400)
        map_mode = page.evaluate("(key) => { const s = JSON.parse(localStorage.getItem(key)); return s.mapMode; }", KEY)
        log("Switch to route mode", "PASS" if map_mode == "route" else "FAIL", f"mapMode={map_mode}")
        page.screenshot(path="screenshots/e2e-06-map-route.png")

        print("\n========== Phase 7: Mood journal save ==========")
        goto_hash(page, "mood-journal", wait=800)

        mood_selected = page.evaluate("() => { const btn = document.querySelector('[data-action=\"select-mood\"]'); if (btn) { btn.click(); return true; } return false; }")
        page.wait_for_timeout(300)

        save_clicked = page.evaluate("() => { const btn = document.querySelector('[data-action=\"save-mood\"]'); if (btn) { btn.click(); return true; } return false; }")
        page.wait_for_timeout(500)

        state = get_state(page)
        log("Mood journal save action", "PASS" if save_clicked else "FAIL", f"save_clicked={save_clicked}, moodEntries={state.get('moodEntries')}")

        print("\n========== Phase 8: Profile edit save ==========")
        goto_hash(page, "edit-profile", wait=800)

        nickname_input = page.evaluate("() => !!document.querySelector('#editName, input[type=\"text\"]')")
        log("Edit profile has nickname input", "PASS" if nickname_input else "WARN", f"nickname_input={nickname_input}")

        save_clicked = page.evaluate("() => { const btn = document.querySelector('[data-action=\"save-profile\"]'); if (btn) { btn.click(); return true; } return false; }")
        page.wait_for_timeout(500)
        log("Save profile button clickable", "PASS" if save_clicked else "FAIL", f"save_clicked={save_clicked}")

        print("\n========== Phase 9: Console errors summary ==========")
        if console_errors:
            log(f"Runtime console errors ({len(console_errors)})", "WARN", " | ".join(console_errors[:5]))
        else:
            log("No console errors throughout", "PASS")

        # 总结
        print("\n" + "=" * 60)
        pass_count = sum(1 for r in results if r["status"] == "PASS")
        fail_count = sum(1 for r in results if r["status"] == "FAIL")
        warn_count = sum(1 for r in results if r["status"] == "WARN")

        print(f"\nE2E adversarial review results:")
        print(f"  PASS: {pass_count}")
        print(f"  FAIL: {fail_count}")
        print(f"  WARN: {warn_count}")
        print(f"  Total: {len(results)}")

        if fail_count > 0:
            print(f"\nFailed items:")
            for r in results:
                if r["status"] == "FAIL":
                    print(f"  - {r['item']}: {r['evidence']}")

        with open("e2e-report.json", "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\nReport: e2e-report.json")

        browser.close()


if __name__ == "__main__":
    main()
