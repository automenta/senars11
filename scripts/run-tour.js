#!/usr/bin/env node

import {spawn} from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const timedMode = args.includes('--timed') || args.includes('--time');
const logOnlyMode = args.includes('--log-only') || args.includes('-l'); // Log-only mode without screenshots

const TOURS = [
    {id: 'tour', duration: 40000},
    {id: 'basic-reasoning', duration: 30000}, // examples/basic-reasoning.nars
    {id: 'decision-making', duration: 30000}  // examples/decision-making.nars - replaced syllogism-demo
];

async function runCommand(command, args, options = {}) {
    console.log(`> ${command} ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: 'inherit',
            ...options
        });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command exited with code ${code}`));
        });

        proc.on('error', (err) => reject(err));
    });
}

async function runTour(tour) {
    console.log(`\n========================================`);
    let modeLabel = '';
    if (!timedMode && !logOnlyMode) modeLabel = ' (Event-Driven Mode)';
    else if (logOnlyMode) modeLabel = ' (Log-Only Mode)';
    console.log(`Starting Tour: ${tour.id}${modeLabel}`);
    console.log(`========================================\n`);

    const outputDir = path.join(rootDir, 'test-results', tour.id);
    const screenshotsDir = path.join(outputDir, 'screenshots');
    const logFile = path.join(outputDir, 'demo.log');

    // Ensure directories exist
    await fs.mkdir(outputDir, {recursive: true});

    // Start Server
    console.log(`Starting server for demo: ${tour.id}...`);
    const logStream = await fs.open(logFile, 'w');

    const serverProcess = spawn('node', ['scripts/ui/launcher.js', '--demo', tour.id], {
        cwd: rootDir,
        stdio: ['ignore', logStream.fd, logStream.fd] // Redirect stdout/stderr to log file
    });

    console.log(`Server started (PID: ${serverProcess.pid}). Waiting for initialization...`);

    try {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

        // Run Visualization - different logic for log-only vs event-driven vs timed mode
        if (logOnlyMode) {
            console.log('Running in log-only mode (no screenshots)...');
            // Just wait for the demo to run without capturing screenshots - use shorter duration
            const logOnlyDuration = Math.min(5000, tour.duration); // Max 5 seconds for log-only mode
            await new Promise(resolve => setTimeout(resolve, logOnlyDuration));
        } else {
            console.log(timedMode ? 'Capturing timed screenshots...' : 'Capturing event-driven screenshots...');
            try {
                if (timedMode) {
                    // Timed mode: capture screenshots at intervals for the duration
                    await runCommand('node', [
                        'scripts/utils/visualize.js',
                        '--type', 'screenshots',
                        '--duration', tour.duration.toString(),
                        '--interval', '1500',
                        '--output', screenshotsDir
                    ], {cwd: rootDir});
                } else {
                    // Event-driven mode: capture screenshots based on NAR clock tick events
                    await runEventDrivenScreenshots(tour, screenshotsDir);
                }
            } catch (e) {
                console.error('Visualization failed:', e);
                // Continue to clean up
            }
        }

        // Check CPU Usage
        console.log('Checking CPU usage...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Quiescence wait

        try {
            // Using ps to get CPU usage of the server process
            // BSD style (macOS/Linux) `ps -p PID -o %cpu`
            const ps = spawn('ps', ['-p', serverProcess.pid, '-o', '%cpu']);
            let psOutput = '';

            ps.stdout.on('data', (data) => psOutput += data.toString());

            await new Promise(resolve => ps.on('close', resolve));

            const lines = psOutput.trim().split('\n');
            const cpuUsage = lines.length > 1 ? lines[1].trim() : 'Unknown';

            const cpuMsg = `Final CPU Usage (PID ${serverProcess.pid}): ${cpuUsage}%`;
            console.log(cpuMsg);

            // Append CPU usage to log file
            await fs.appendFile(logFile, `\n${cpuMsg}\n`);

        } catch (e) {
            console.error('Failed to check CPU usage:', e.message);
        }

    } finally {
        // Kill Server
        console.log('Stopping server...');
        serverProcess.kill();
        await logStream.close();
    }

    // Generate Composite (skip in log-only mode)
    if (!logOnlyMode) {
        console.log('Generating composite image...');
        try {
            await runCommand('node', [
                'scripts/utils/generate-composite.js',
                '--input', screenshotsDir,
                '--output', outputDir
            ], {cwd: rootDir});
        } catch (e) {
            console.error('Composite generation failed:', e);
        }
    } else {
        console.log('Skipping composite generation in log-only mode...');
    }

    console.log(`Tour ${tour.id} completed. Results in ${outputDir}`);
}

async function runEventDrivenScreenshots(tour, screenshotsDir) {
    console.log(`Starting event-driven screenshot capture for tour: ${tour.id}`);

    // Reduce duration to 10 seconds to avoid long running tests
    const maxDuration = 10000; // 10 seconds instead of 30-40 seconds

    // Wait a bit to ensure the demo has started
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create WebSocket connection to listen for NAR cycle events
    const WebSocket = (await import('ws')).default;

    // Connect to WebSocket server (default port 8080 with path /ws)
    const ws = new WebSocket('ws://localhost:8080/ws');

    let screenshotCount = 0;
    const screenshotPromises = [];

    // Wait for WebSocket connection to be ready
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('Connected to WebSocket server, subscribing to events...');
            // Subscribe to NAR cycle events and other relevant events
            ws.send(JSON.stringify({
                type: 'subscribe',
                eventTypes: ['nar.cycle.step', 'streamReasoner.step', 'reasoning.derivation', 'task.input', 'task.added', 'system.started']
            }));
            resolve();
        });

        ws.on('error', (error) => {
            console.error('WebSocket connection error:', error);
            reject(error);
        });
    });

    return new Promise((resolve, reject) => {
        // Set a timeout for the entire process (much shorter duration)
        const timeoutId = setTimeout(() => {
            console.log(`Event-driven capture timeout after ${maxDuration}ms`);
            ws.close();
            resolve();
        }, maxDuration);

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());

                // Capture screenshot on various NAR events, not just cycle steps
                if (message.type &&
                    (message.type === 'nar.cycle.step' ||
                     message.type === 'streamReasoner.step' ||
                     message.type === 'reasoning.derivation' ||
                     message.type === 'task.input' ||
                     message.type === 'task.added')) {

                    screenshotCount++;
                    console.log(`Capturing screenshot #${screenshotCount} on ${message.type} event...`);

                    const screenshotPromise = runCommand('node', [
                        'scripts/utils/visualize.js',
                        '--type', 'single-screenshot',
                        '--url', 'http://localhost:5173',
                        '--output', path.join(screenshotsDir, `screenshot_${screenshotCount.toString().padStart(4, '0')}_${Date.now()}.png`)
                    ], {cwd: rootDir});

                    screenshotPromises.push(screenshotPromise);

                    // Clear timeout and resolve early if we have enough screenshots or have reached a reasonable limit
                    if (screenshotCount >= 20) { // Reduced limit to avoid too many screenshots
                        console.log(`Screenshot limit reached (${screenshotCount}), stopping...`);
                        clearTimeout(timeoutId);
                        ws.close();
                        resolve();
                    }
                }
            } catch (e) {
                console.error('Error processing WebSocket message:', e);
            }
        });

        ws.on('close', () => {
            console.log(`WebSocket closed after capturing ${screenshotCount} screenshots`);
            Promise.allSettled(screenshotPromises)
                .then(() => resolve())
                .catch(err => reject(err));
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        });
    });
}

async function main() {
    let modeString = 'event-driven';
    if (timedMode) modeString = 'timed';
    else if (logOnlyMode) modeString = 'log-only';

    // Filter TOURS based on command-line arguments
    const specifiedTours = args.filter(arg => !arg.startsWith('-'));
    let toursToRun = TOURS;

    if (specifiedTours.length > 0) {
        toursToRun = TOURS.filter(tour => specifiedTours.includes(tour.id));
        if (toursToRun.length === 0) {
            console.error(`Error: No matching tours found for: ${specifiedTours.join(', ')}`);
            console.log(`Available tours: ${TOURS.map(t => t.id).join(', ')}`);
            process.exit(1);
        }
    }

    console.log(`Starting tour script in ${modeString} mode`);

    try {
        await fs.mkdir(path.join(rootDir, 'test-results'), {recursive: true});

        for (const tour of toursToRun) {
            await runTour(tour);
        }

        console.log('\nAll tours completed successfully!');

    } catch (error) {
        console.error('Error running tours:', error);
        process.exit(1);
    }
}

main();
