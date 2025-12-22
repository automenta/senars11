#!/usr/bin/env node
/**
 * LM Demo Supervisor
 * Runs isolated demo processes to ensure robustness and clean termination.
 */

import {spawn} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEMOS = [
    {
        name: 'System Verification',
        script: 'demos/demo-system-verification.js',
        timeout: 120000, // Allow time for model download
        description: 'Verifies full system stack (App + Agent + LM + Inference).'
    },
    {
        name: 'NAL Context & Reasoning',
        script: 'demos/demo-nal-reasoning.js',
        timeout: 30000,
        description: 'Verifies neuro-symbolic reasoning capabilities.'
    }
];

const log = (msg) => console.log(`[Supervisor] ${msg}`);

async function runDemo(demo) {
    return new Promise((resolve) => {
        log(`\n═══════════════════════════════════════════════════`);
        log(`Running: ${demo.name}`);
        log(`Description: ${demo.description}`);
        log(`Timeout: ${demo.timeout / 1000}s`);
        log(`───────────────────────────────────────────────────`);

        const child = spawn('node', [path.join(__dirname, demo.script)], {
            stdio: 'inherit', // Stream output directly
            cwd: process.cwd()
        });

        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            log(`❌ TIMEOUT: Killing proces ${child.pid}...`);
            child.kill('SIGKILL');
        }, demo.timeout);

        child.on('close', (code) => {
            clearTimeout(timer);
            if (timedOut) {
                resolve({success: false, error: 'Timeout'});
            } else if (code !== 0) {
                log(`❌ Failed with exit code ${code}`);
                resolve({success: false, error: `Exit Code ${code}`});
            } else {
                log(`✅ Passed`);
                resolve({success: true});
            }
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            log(`❌ Spawn Error: ${err.message}`);
            resolve({success: false, error: err.message});
        });
    });
}

async function main() {
    const results = [];

    for (const demo of DEMOS) {
        const result = await runDemo(demo);
        results.push({...demo, ...result});

        if (!result.success) {
            log(`⚠️  Stopping early due to failure.`);
            break;
        }
    }

    log(`\n═══════════════════════════════════════════════════`);
    log(`Summary`);
    log(`═══════════════════════════════════════════════════`);

    let allPassed = true;
    for (const r of results) {
        const icon = r.success ? '✅' : '❌';
        const msg = r.success ? 'Passed' : `Failed (${r.error})`;
        console.log(`${icon} ${r.name}: ${msg}`);
        if (!r.success) allPassed = false;
    }

    if (!allPassed) process.exit(1);
    process.exit(0);
}

main();

