/**
 * @file test-utils.js
 * @description Shared utilities for UI tests
 */

import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

// Default test configuration
export const DEFAULT_TEST_CONFIG = {
    uiPort: 8200,
    wsPort: 8201,
    timeout: 15000
};

// Shared browser instance management
let sharedBrowser = null;

/**
 * Get or create a shared browser instance
 * @returns {Promise<Object>} Puppeteer browser instance
 */
export async function getSharedBrowser() {
    if (!sharedBrowser) {
        sharedBrowser = await puppeteer.launch({
            headless: 'new',  // Use the new headless mode to avoid deprecation warnings
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
    }
    return sharedBrowser;
}

/**
 * Close shared browser instance
 */
export async function closeSharedBrowser() {
    if (sharedBrowser) {
        await sharedBrowser.close();
        sharedBrowser = null;
    }
}

/**
 * Create a new page instance
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Promise<Object>} Puppeteer page instance
 */
export async function createPage(browser) {
    const page = await browser.newPage();
    
    // Set up error tracking
    const errors = [];
    page.on('pageerror', error => {
        errors.push(error.message);
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    
    page.testErrors = errors;
    return page;
}

/**
 * Wait for UI to connect to backend
 * @param {Object} page - Puppeteer page instance
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForConnection(page, timeout = 15000) {
    await page.waitForFunction(() => {
        const statusElement = document.querySelector('#connection-status');
        return statusElement && 
               statusElement.textContent.toLowerCase().includes('connected');
    }, { timeout });
}

/**
 * Send a command to the UI
 * @param {Object} page - Puppeteer page instance
 * @param {string} command - Command to send
 */
export async function sendCommand(page, command) {
    await page.type('#command-input', command);
    await page.click('#send-button');
    // Small delay to allow command to be processed
    await setTimeout(500);
}

/**
 * Wait for text to appear in logs
 * @param {Object} page - Puppeteer page instance
 * @param {string} expectedText - Text to wait for
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForLogText(page, expectedText, timeout = 10000) {
    await page.waitForFunction(
        (text) => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes(text);
        },
        { timeout },
        expectedText
    );
}

/**
 * Get logs content
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<string>} Logs content
 */
export async function getLogsContent(page) {
    return await page.$eval('#logs-container', el => el.textContent);
}

/**
 * Verify connection status
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if connected
 */
export async function isConnectionEstablished(page) {
    const connectionStatus = await page.$eval('#connection-status', el => el.textContent);
    return connectionStatus.toLowerCase().includes('connected');
}

/**
 * Verify UI element exists and is visible
 * @param {Object} page - Puppeteer page instance
 * @param {string} selector - Element selector
 * @returns {Promise<boolean>} True if element exists and is visible
 */
export async function elementExistsAndVisible(page, selector) {
    try {
        const element = await page.$(selector);
        if (!element) return false;
        
        const isVisible = await element.isIntersectingViewport();
        return isVisible;
    } catch {
        return false;
    }
}

/**
 * Test class for UI functionality
 */
export class UITestRunner {
    constructor(config = DEFAULT_TEST_CONFIG) {
        this.config = config;
        this.browser = null;
        this.page = null;
    }

    async setup() {
        this.browser = await getSharedBrowser();
        this.page = await createPage(this.browser);
        
        // Navigate to UI
        await this.page.goto(`http://localhost:${this.config.uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: this.config.timeout
        });

        // Wait for connection
        await waitForConnection(this.page, this.config.timeout);
    }

    async teardown() {
        if (this.page) {
            // Don't close page as it's shared
        }
    }

    async isConnected() {
        return await isConnectionEstablished(this.page);
    }

    async executeCommand(command) {
        await sendCommand(this.page, command);
    }

    async waitForResponse(expectedText) {
        await waitForLogText(this.page, expectedText);
    }

    async getLogs() {
        return await getLogsContent(this.page);
    }

    async testConnection() {
        test('Connection to real backend is established', async () => {
            const connected = await this.isConnected();
            expect(connected).toBe(true);
        });
    }

    async testCommandExecution(command, expectedInResponse) {
        await this.executeCommand(command);
        await this.waitForResponse(expectedInResponse);
        const logs = await this.getLogs();
        expect(logs).toContain(`> ${command}`);
        expect(logs).toContain(expectedInResponse);
    }

    async testUIControls() {
        // Test refresh functionality
        await this.page.click('#refresh-graph');
        await setTimeout(1000);
        
        const logsAfterRefresh = await this.getLogs();
        expect(logsAfterRefresh).toContain('Graph refresh requested');
        
        // Test live toggle
        const initialText = await this.page.$eval('#toggle-live', el => el.textContent);
        await this.page.click('#toggle-live');
        await setTimeout(500);
        const updatedText = await this.page.$eval('#toggle-live', el => el.textContent);
        
        expect(updatedText).not.toBe(initialText);
    }
    
    async testQuickCommands() {
        await this.page.select('#quick-commands', '<{test} --> value> .');
        await this.page.click('#exec-quick');
        
        await waitForLogText(this.page, 'test');
        const logs = await getLogsContent(this.page);
        expect(logs).toContain('test');
    }
    
    async testDebugCommands() {
        await this.executeCommand('/state');
        await waitForLogText(this.page, 'Connection:');
        const logs = await getLogsContent(this.page);
        expect(logs).toContain('Connection: connected');
    }
}