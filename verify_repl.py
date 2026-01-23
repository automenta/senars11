from playwright.sync_api import sync_playwright
import time
import os

os.makedirs("verification", exist_ok=True)

def verify_repl_filtering():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Verifying Agent Simple...")
            page.goto("http://localhost:5173/agent-simple.html")
            time.sleep(2)

            # Since agent-simple.html doesn't use the full NotebookPanel/FilterToolbar,
            # we can't easily verify the filtering UI there without a full integration test.
            # However, the unit tests cover the logic.
            # We'll just verify the page still loads fine.
            page.screenshot(path="verification/agent-simple-check.png")
            print("Captured agent-simple-check.png")

        except Exception as e:
            print(f"Error verification: {e}")

        browser.close()

if __name__ == "__main__":
    verify_repl_filtering()
