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

            print("Layout loaded. Checking for REPL input...")
            # Check for REPL input
            page.wait_for_selector(".repl-input-area", state="visible", timeout=10000)

            # Debug: print HTML of repl input area
            repl_html = page.inner_html(".repl-input-area")
            # print(f"REPL HTML: {repl_html}")

            print("Typing layout command...")
            # Try a more generic selector or ensure it waits for the specific textarea
            textarea = page.locator(".repl-input-area textarea")
            textarea.wait_for(state="visible", timeout=10000)
            textarea.fill("/layout full-repl")

            # Click execute button
            # We look for the button with the text "Execute" or use the click on button logic
            print("Clicking execute...")
            # REPLInput creates a button "▶️ Execute (Ctrl+Enter)"
            # Use partial text match
            page.get_by_text("Execute", exact=False).first.click()

            # Wait a bit for layout change
            time.sleep(2)

            print("Taking screenshot...")
            page.screenshot(path="full_demo_screenshot.png")
            print("Verification passed!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="error_screenshot.png")
            try:
                print(f"REPL HTML on error: {page.inner_html('.repl-input-area')}")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    run()
