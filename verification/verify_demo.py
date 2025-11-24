
from playwright.sync_api import sync_playwright
import time

def verify_demo_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to http://localhost:5173/demo.html")
            page.goto("http://localhost:5173/demo.html")
            page.wait_for_load_state("networkidle")

            print("Page title:", page.title())

            # Wait for content to load
            time.sleep(2)

            # Screenshot of the main view
            page.screenshot(path="verification/demo_ui_main.png")
            print("Main view screenshot saved.")

            # Click the metrics tab if available
            # I need to find the selector. Based on my changes to DemoControls/DemoRunnerApp,
            # I should look for the button with specific ID or class.
            # In ui/demo.html I didn't verify the button IDs.
            # Let's try to find buttons with text "Metrics" or "Graph"

            metrics_btn = page.get_by_text("Metrics")
            if metrics_btn.count() > 0:
                metrics_btn.first.click()
                time.sleep(0.5)
                page.screenshot(path="verification/demo_ui_metrics.png")
                print("Metrics view screenshot saved.")
            else:
                print("Metrics button not found")

        except Exception as e:
            print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    verify_demo_ui()
