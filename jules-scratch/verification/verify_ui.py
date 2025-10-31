
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for 30 seconds to ensure all asynchronous operations have completed.
    # This is a debugging step to observe the final state of the UI.
    page.wait_for_timeout(30000)

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
