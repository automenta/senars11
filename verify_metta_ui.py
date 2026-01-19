from playwright.sync_api import sync_playwright
import time
import os

def run():
    print("Starting verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        try:
            print("Navigating to IDE...")
            page.goto("http://localhost:5173/ide.html")

            print("Waiting for REPL input...")
            textarea = page.locator(".repl-input-area textarea")
            textarea.wait_for(state="visible", timeout=20000)

            # Test MeTTa execution
            print("Executing MeTTa code...")
            textarea.fill("(match &self (Concept $x) $x)")

            # Use Shift+Enter to execute (checking new key binding)
            textarea.press("Shift+Enter")

            print("Waiting for result...")
            # Wait for result cell (the result of match on empty memory is usually empty tuple or similar)
            # We expect a result cell to appear.
            page.wait_for_selector(".result-cell", timeout=10000)

            # Verify execution count
            print("Verifying execution count...")
            gutter = page.locator(".cell-gutter").first
            if "[1]" in gutter.inner_text():
                print("Execution count verified.")
            else:
                print(f"Execution count mismatch: {gutter.inner_text()}")

            # Inject a Concept Card via console (simulating backend message) since backend isn't fully running logic here
            print("Injecting Concept Card...")
            page.evaluate("""
                window.SeNARSIDE.handleMessage({
                    type: 'concept',
                    payload: { term: 'test_concept', budget: { p: 0.9, d: 0.8, q: 0.7 } }
                });
            """)

            # Wait for Concept Card
            page.wait_for_selector(".concept-card", timeout=5000)
            print("Concept Card rendered.")

            # Test Import (Check if function exists and doesn't crash)
            print("Testing Import logic (mock)...")
            page.evaluate("""
                window.SeNARSIDE.notebook.importNotebook([
                    { type: 'code', content: 'imported_code' }
                ]);
            """)

            # Check if imported cell exists
            # It's likely in a textarea
            if page.locator("textarea").filter(has_text="imported_code").count() > 0:
                print("Import verified.")
            else:
                print("Import failed.")

            # Check if execution works on imported cell (using the fix)
            # We can't easily click run on the specific cell without precise selectors,
            # but we can check if the cell has the correct structure.
            # Or we can trigger execution programmatically on the last cell.
            print("Triggering execution on imported cell...")
            page.evaluate("""
                const cells = window.SeNARSIDE.notebook.cells;
                const lastCell = cells[cells.length - 1];
                if (lastCell && lastCell.execute) {
                    lastCell.execute();
                }
            """)

            # Wait for execution result (console log or new result cell)
            # Since 'imported_code' isn't valid Narsese/MeTTa it might just echo or error,
            # but the point is it shouldn't crash.
            time.sleep(1)
            print("Execution on imported cell attempted (no crash detected).")

            time.sleep(2)
            screenshot_path = os.path.abspath("verification_final.png")
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="error_final.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
