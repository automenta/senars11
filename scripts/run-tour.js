#!/usr/bin/env node

import {spawn} from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TOURS = [
    {id: 'tour', duration: 40000},
    {id: 'basic-reasoning', duration: 30000}, // examples/basic-reasoning.nars
    {id: 'syllogism-demo', duration: 30000}   // examples/syllogism-demo.js
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
    console.log(`Starting Tour: ${tour.id}`);
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

        // Run Visualization
        console.log('Capturing screenshots...');
        try {
            await runCommand('node', [
                'scripts/utils/visualize.js',
                '--type', 'screenshots',
                '--duration', tour.duration.toString(),
                '--interval', '1500',
                '--output', screenshotsDir
            ], {cwd: rootDir});
        } catch (e) {
            console.error('Visualization failed:', e);
            // Continue to clean up
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

    // Generate Composite
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

    console.log(`Tour ${tour.id} completed. Results in ${outputDir}`);
}

async function main() {
    try {
        await fs.mkdir(path.join(rootDir, 'test-results'), {recursive: true});

        for (const tour of TOURS) {
            await runTour(tour);
        }

        console.log('\nAll tours completed successfully!');

    } catch (error) {
        console.error('Error running tours:', error);
        process.exit(1);
    }
}

main();
