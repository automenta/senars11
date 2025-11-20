import {expect} from '@playwright/test';

export class NarPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.commandInput = page.locator('#command-input');
        this.sendButton = page.locator('#send-button');
        this.logsContainer = page.locator('#logs-container');
        this.connectionStatus = page.locator('#connection-status');
        this.graphContainer = page.locator('#graph-container');
    }

    async goto() {
        await this.page.goto('/');
    }

    async waitForConnection() {
        await expect(this.connectionStatus).toContainText('Connected', {ignoreCase: true, timeout: 15000});
    }

    /**
     * @param {string} command
     */
    async sendCommand(command) {
        await this.commandInput.fill(command);
        await this.sendButton.click({force: true});
    }

    /**
     * @param {string} text
     * @param {number} [timeout=5000]
     */
    async expectLog(text, timeout = 5000) {
        await expect(this.logsContainer).toContainText(text, {timeout});
    }

    async checkGraphHasContent() {
        await expect(this.graphContainer).toBeVisible();
    }

    async clearLogs() {
        // Capture the initial state and then click clear
        await this.page.click('#clear-logs', {force: true});

        // Wait for the log clearing to complete and the "Cleared logs" message to appear
        // We need to wait for the element to contain the "Cleared logs" text
        await expect(this.logsContainer).toContainText('Cleared logs', { timeout: 10000 });
    }

    async refreshGraph() {
        await this.page.click('#refresh-graph', {force: true});
        // Wait a bit for the click to process and then expect the log message
        await this.page.waitForTimeout(100);
        await this.expectLog('Graph refresh requested', 10000); // Use longer timeout for reliability
    }
}
