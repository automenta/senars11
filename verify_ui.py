from playwright.sync_api import sync_playwright
import time
import os

os.makedirs("verification", exist_ok=True)

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Verify Agent Simple
        print("Verifying Agent Simple...")
        try:
            page.goto("http://localhost:5173/agent-simple.html")
            time.sleep(2) # Wait for modules to load and render
            page.screenshot(path="verification/agent-simple.png")

            # Type a message
            page.fill("input", "Hello Agent")
            page.click("button")
            time.sleep(2) # Wait for agent response simulation
            page.screenshot(path="verification/agent-simple-response.png")
        except Exception as e:
            print(f"Error verification agent-simple: {e}")

        # Verify Metrics Dashboard
        print("Verifying Metrics Dashboard...")
        try:
            page.goto("http://localhost:5173/metrics-dashboard.html")
            time.sleep(2) # Wait for update
            page.screenshot(path="verification/metrics-dashboard.png")
        except Exception as e:
            print(f"Error verification metrics-dashboard: {e}")

        browser.close()

if __name__ == "__main__":
    verify_ui()
