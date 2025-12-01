#!/usr/bin/env node

import {chromium} from 'playwright';
import fs from 'fs/promises';

class ScreenshotGenerator {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.screenshots = [];
    }

    async initialize() {
        console.log('Initializing screenshot generator (Playwright)...');

        // Create output directories
        await fs.mkdir('test-results/screenshots', {recursive: true});

        // Launch browser
        this.browser = await chromium.launch({
            headless: true // Run headless for CI/server environments
        });

        this.context = await this.browser.newContext({
            viewport: {width: 1280, height: 720}
        });

        this.page = await this.context.newPage();

        console.log('✓ Screenshot generator initialized');
    }

    async captureScreenshots(url, duration = 30000, interval = 2000, prefix = 'screenshot') {
        console.log(`Capturing screenshots from ${url} for ${duration}ms...`);

        try {
            await this.page.goto(url, {waitUntil: 'networkidle'});
        } catch (e) {
            console.log(`Navigation note: ${e.message} - continuing anyway`);
        }

        const startTime = Date.now();
        let count = 0;

        while (Date.now() - startTime < duration) {
            const timestamp = Date.now();
            const screenshotPath = `test-results/screenshots/${prefix}_${count.toString().padStart(3, '0')}_${timestamp}.png`;

            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            this.screenshots.push(screenshotPath);
            console.log(`✓ Screenshot ${count + 1} saved: ${screenshotPath}`);

            count++;
            await this.delay(interval);
        }

        console.log(`\n📊 Captured ${count} screenshots`);
        return this.screenshots;
    }

    async capturePriorityFluctuations(url, duration = 30000) {
        console.log('Capturing priority fluctuation visualizations...');

        try {
            await this.page.goto(url, {waitUntil: 'networkidle'});
            // Wait for page to load completely
            await this.page.waitForSelector('[data-testid="task-monitor-container"]', {timeout: 10000});
        } catch (e) {
            console.log(`Navigation/Selector note: ${e.message} - continuing anyway`);
        }

        const startTime = Date.now();
        let count = 0;

        while (Date.now() - startTime < duration) {
            // Look for elements that show priority changes
            const timestamp = Date.now();
            const screenshotPath = `test-results/screenshots/priority_fluctuation_${count.toString().padStart(3, '0')}_${timestamp}.png`;

            // Highlight priority-related elements temporarily
            await this.page.evaluate(() => {
                // Add temporary visual indicators for priority elements
                const priorityElements = document.querySelectorAll('[data-testid*="task-priority"]');
                priorityElements.forEach(el => {
                    el.style.border = '2px solid #ff0000';
                    el.style.backgroundColor = '#ffe6e6';
                });

                // Add a timestamp overlay
                const overlay = document.createElement('div');
                overlay.id = 'timestamp-overlay';
                overlay.textContent = new Date().toLocaleTimeString();
                overlay.style.position = 'fixed';
                overlay.style.top = '10px';
                overlay.style.right = '10px';
                overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                overlay.style.color = 'white';
                overlay.style.padding = '5px 10px';
                overlay.style.borderRadius = '5px';
                overlay.style.zIndex = '9999';
                overlay.style.fontFamily = 'Arial, sans-serif';
                overlay.style.fontSize = '14px';
                document.body.appendChild(overlay);

                // Remove overlay after 1 second
                setTimeout(() => {
                    const overlay = document.getElementById('timestamp-overlay');
                    if (overlay) overlay.remove();
                }, 1000);
            });

            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            // Remove highlights
            await this.page.evaluate(() => {
                const priorityElements = document.querySelectorAll('[data-testid*="task-priority"]');
                priorityElements.forEach(el => {
                    el.style.border = '';
                    el.style.backgroundColor = '';
                });
            });

            this.screenshots.push(screenshotPath);
            console.log(`✓ Priority screenshot ${count + 1} saved: ${screenshotPath}`);

            count++;
            await this.delay(1500); // 1.5 second interval for priority changes
        }

        console.log(`\n📊 Captured ${count} priority fluctuation screenshots`);
        return this.screenshots;
    }

    async captureDerivations(url, duration = 30000) {
        console.log('Capturing derivation process...');

        try {
            await this.page.goto(url, {waitUntil: 'networkidle'});
            // Wait for page to load
            await this.page.waitForSelector('[data-testid="narsese-input-container"]', {timeout: 10000});
        } catch (e) {
            console.log(`Navigation/Selector note: ${e.message} - continuing anyway`);
        }

        const startTime = Date.now();
        let count = 0;

        while (Date.now() - startTime < duration) {
            const timestamp = Date.now();
            const screenshotPath = `test-results/screenshots/derivation_${count.toString().padStart(3, '0')}_${timestamp}.png`;

            // Highlight derivation-related elements
            await this.page.evaluate(() => {
                // Add temporary highlights for derivation elements
                const derivationElements = document.querySelectorAll('[data-testid*="task-"]'); // All task elements
                derivationElements.forEach(el => {
                    el.style.border = '2px solid #00ff00';
                    el.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
                });

                // Add timestamp overlay
                const overlay = document.createElement('div');
                overlay.id = 'derivation-timestamp';
                overlay.textContent = `Derivation - ${new Date().toLocaleTimeString()}`;
                overlay.style.position = 'fixed';
                overlay.style.top = '10px';
                overlay.style.left = '10px';
                overlay.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
                overlay.style.color = 'black';
                overlay.style.padding = '5px 10px';
                overlay.style.borderRadius = '5px';
                overlay.style.zIndex = '9999';
                overlay.style.fontFamily = 'Arial, sans-serif';
                overlay.style.fontSize = '14px';
                document.body.appendChild(overlay);

                setTimeout(() => {
                    const overlay = document.getElementById('derivation-timestamp');
                    if (overlay) overlay.remove();
                }, 1000);
            });

            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            // Remove highlights
            await this.page.evaluate(() => {
                const derivationElements = document.querySelectorAll('[data-testid*="task-"]');
                derivationElements.forEach(el => {
                    el.style.border = '';
                    el.style.boxShadow = '';
                });
            });

            this.screenshots.push(screenshotPath);
            console.log(`✓ Derivation screenshot ${count + 1} saved: ${screenshotPath}`);

            count++;
            await this.delay(2000); // 2 second interval for derivations
        }

        console.log(`\n📊 Captured ${count} derivation screenshots`);
        return this.screenshots;
    }

    async generateMovie(outputPath = 'test-results/videos/demo-movie.mp4', fps = 2) {
        console.log('⚠️ Movie generation skipped as per configuration.');
        return null;
    }

    async generateGif(outputPath = 'test-results/videos/demo-animation.gif', fps = 2) {
        console.log('⚠️ GIF generation skipped as per configuration.');
        return null;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('✓ Screenshot generator cleaned up');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Command line interface
async function runGenerator() {
    const generator = new ScreenshotGenerator();

    try {
        await generator.initialize();

        // Determine what to capture based on command line arguments
        const args = process.argv.slice(2);
        const mode = args[0] || 'all';
        const url = args[1] || 'http://localhost:5173';

        switch (mode) {
            case 'screenshots':
                await generator.captureScreenshots(url, 30000, 2000, 'demo');
                break;

            case 'priority':
                await generator.capturePriorityFluctuations(url, 30000);
                break;

            case 'derivations':
                await generator.captureDerivations(url, 30000);
                break;

            case 'movie':
                // Treat movie requests as screenshot requests
                console.log('Movie mode requested: generating screenshots only.');
                await generator.captureScreenshots(url, 30000, 1000, 'movie_frame');
                break;

            case 'gif':
                console.log('GIF mode requested: generating screenshots only.');
                await generator.captureScreenshots(url, 15000, 500, 'gif_frame');
                break;

            case 'all':
            default:
                // Capture different types of visualizations
                await generator.captureScreenshots(url, 10000, 2000, 'overview');
                await generator.capturePriorityFluctuations(url, 10000);
                await generator.captureDerivations(url, 10000);
                break;
        }

        console.log('\n🎉 Screenshot generation completed!');
        console.log(`📁 Screenshots: ${generator.screenshots.length} files`);

    } catch (error) {
        console.error('❌ Generator error:', error);
        process.exit(1);
    } finally {
        await generator.cleanup();
    }
}

// Execute
runGenerator();
