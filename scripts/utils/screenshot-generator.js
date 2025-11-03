#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

class ScreenshotMovieGenerator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshots = [];
        this.videoPath = '';
    }

    async initialize() {
        console.log('Initializing screenshot/movie generator...');

        // Create output directories
        await fs.mkdir('test-results/screenshots', {recursive: true});
        await fs.mkdir('test-results/videos', {recursive: true});

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: false, // Set to true if you don't want to see the browser
            defaultViewport: {width: 1280, height: 720},
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        console.log('✓ Screenshot/movie generator initialized');
    }

    async captureScreenshots(url, duration = 30000, interval = 2000, prefix = 'screenshot') {
        console.log(`Capturing screenshots from ${url} for ${duration}ms...`);

        await this.page.goto(url, {waitUntil: 'networkidle2'});

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

    async generateMovie(outputPath = 'test-results/videos/demo-movie.mp4', fps = 2) {
        if (this.screenshots.length === 0) {
            throw new Error('No screenshots available to generate movie');
        }

        console.log(`Generating movie from ${this.screenshots.length} screenshots...`);

        // Sort screenshots by filename to ensure correct order
        const sortedScreenshots = this.screenshots.sort();

        // Create a list file for ffmpeg
        const listFilePath = 'test-results/screenshots/list.txt';
        const listContent = sortedScreenshots.map(screenshot => `file '${screenshot}'`).join('\n');
        await fs.writeFile(listFilePath, listContent);

        // Generate movie using ffmpeg
        const fpsOption = `fps=${fps},scale=1280:720`;
        const cmd = `ffmpeg -r ${fps} -f concat -safe 0 -i "${listFilePath}" -r ${fps} -vf "${fpsOption}" -c:v libx264 -pix_fmt yuv420p -y "${outputPath}"`;

        try {
            await execAsync(cmd);
            console.log(`✓ Movie generated: ${outputPath}`);
            this.videoPath = outputPath;
            return outputPath;
        } catch (error) {
            console.error('Error generating movie:', error);
            throw error;
        }
    }

    async capturePriorityFluctuations(url, duration = 30000) {
        console.log('Capturing priority fluctuation visualizations...');

        await this.page.goto(url, {waitUntil: 'networkidle2'});

        // Wait for page to load completely
        await this.page.waitForSelector('[data-testid="task-monitor-container"]', {timeout: 10000});

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

        await this.page.goto(url, {waitUntil: 'networkidle2'});

        // Wait for page to load
        await this.page.waitForSelector('[data-testid="narsese-input-container"]', {timeout: 10000});

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

    async generateGif(outputPath = 'test-results/videos/demo-animation.gif', fps = 2) {
        if (this.screenshots.length === 0) {
            throw new Error('No screenshots available to generate GIF');
        }

        console.log(`Generating animated GIF from ${this.screenshots.length} screenshots...`);

        // Create a list file for ffmpeg
        const listFilePath = 'test-results/screenshots/gif_list.txt';
        const listContent = this.screenshots.map(screenshot => `file '${screenshot}'`).join('\n');
        await fs.writeFile(listFilePath, listContent);

        // Generate GIF using ffmpeg
        const cmd = `ffmpeg -r ${fps} -f concat -safe 0 -i "${listFilePath}" -r ${fps} -vf "scale=1280:720,fps=${fps}" -y "${outputPath}"`;

        try {
            await execAsync(cmd);
            console.log(`✓ Animated GIF generated: ${outputPath}`);
            return outputPath;
        } catch (error) {
            console.error('Error generating GIF:', error);
            throw error;
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('✓ Screenshot/movie generator cleaned up');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Command line interface
async function runGenerator() {
    const generator = new ScreenshotMovieGenerator();

    try {
        await generator.initialize();

        // Determine what to capture based on command line arguments
        const args = process.argv.slice(2);
        const mode = args[0] || 'all';
        const url = args[1] || 'http://localhost:5174'; // Default to our demo UI

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
                await generator.captureScreenshots(url, 30000, 1000, 'movie_frame');
                await generator.generateMovie();
                break;

            case 'gif':
                await generator.captureScreenshots(url, 15000, 500, 'gif_frame');
                await generator.generateGif();
                break;

            case 'all':
            default:
                // Capture different types of visualizations
                await generator.captureScreenshots(url, 10000, 2000, 'overview');
                await generator.capturePriorityFluctuations(url, 10000);
                await generator.captureDerivations(url, 10000);

                // Generate outputs
                if (generator.screenshots.length > 0) {
                    await generator.generateMovie('test-results/videos/demo-combined.mp4');
                    await generator.generateGif('test-results/videos/demo-combined.gif');
                }
                break;
        }

        console.log('\n🎉 Screenshot/movie generation completed!');
        console.log(`📁 Screenshots: ${generator.screenshots.length} files`);
        if (generator.videoPath) {
            console.log(`🎬 Movie: ${generator.videoPath}`);
        }

    } catch (error) {
        console.error('❌ Generator error:', error);
        process.exit(1);
    } finally {
        await generator.cleanup();
    }
}

// Execute
runGenerator();