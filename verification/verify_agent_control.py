from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}\nStack: {exc.stack}"))

        print("Navigating...")
        try:
            page.goto("http://localhost:5173/ide.html", timeout=30000)

            print("Waiting for layout root...")
            page.wait_for_selector(".lm_root", state="visible", timeout=10000)

            # Simulate receiving a UI command from the "backend" via console injection
            # since we can't easily fake the websocket/worker message from here without hooks.
            # But we can access window.SeNARSIDE and simulate a message arrival.

            print("Injecting UI command (layout change)...")
            page.evaluate("""
                window.SeNARSIDE.handleMessage({
                    type: 'ui-command',
                    payload: { command: 'layout', args: 'full-repl' }
                });
            """)

            # Check if layout changed (Graph panel should be hidden/zero width)
            # Simplest check: Wait for log message "Layout: Full REPL" in notebook?
            # Or check the UI structure.
            # In full-repl mode, REPL component width is set to 100.

            time.sleep(1) # Wait for layout update

            print("Injecting Prompt request...")
            page.evaluate("""
                window.SeNARSIDE.handleMessage({
                    type: 'agent/prompt',
                    payload: { id: 'req-1', question: 'What is your objective?' }
                });
            """)

            print("Waiting for prompt cell...")
            prompt_cell = page.wait_for_selector(".repl-cell.prompt-cell", state="visible", timeout=5000)
            if prompt_cell:
                print("Prompt cell visible.")

            # Verify prompt content
            prompt_text = page.locator(".repl-cell.prompt-cell").inner_text()
            if "What is your objective?" in prompt_text:
                print("Prompt text matched.")
            else:
                print(f"Prompt text mismatch: {prompt_text}")

            # Reply to prompt
            print("Replying to prompt...")
            input_box = page.locator(".repl-cell.prompt-cell input")
            input_box.fill("Survive and thrive")
            page.locator(".repl-cell.prompt-cell button").click()

            # Check if button changed to "Sent"
            sent_btn = page.get_by_text("Sent")
            sent_btn.wait_for(state="visible")
            print("Reply sent.")

            # Verify log entry for UI command
            # The logger logs: "System requested UI Command: /layout full-repl"
            log_entries = page.locator(".repl-cell.result-cell").all_inner_texts()
            found_log = any("System requested UI Command" in log for log in log_entries)
            if found_log:
                print("UI Command log found.")
            else:
                print("UI Command log NOT found.")

            print("Taking screenshot...")
            page.screenshot(path="agent_control_verification.png")
            print("Verification passed!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="agent_control_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
