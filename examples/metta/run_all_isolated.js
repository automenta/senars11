#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all .metta files
const findMettaFiles = (dir) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items.flatMap(item => {
        const fullPath = path.join(dir, item.name);
        return item.isDirectory() ? findMettaFiles(fullPath) :
            item.name.endsWith('.metta') ? [fullPath] : [];
    });
};

const files = findMettaFiles(__dirname);
console.log(`Found ${files.length} example files.`);

let failed = 0;
const TIMEOUT = 10000; // 10 seconds per file

for (const file of files) {
    const relativePath = path.relative(__dirname, file);
    console.log(`Running ${relativePath}...`);
    try {
        execFileSync('node', [path.join(__dirname, 'run_one_example.js'), file], {
            timeout: TIMEOUT,
            stdio: 'inherit' // Pipe output to parent
        });
        console.log(`[PASS] ${relativePath}`);
    } catch (e) {
        failed++;
        if (e.code === 'ETIMEDOUT') {
            console.error(`[FAIL] ${relativePath} TIMED OUT`);
        } else {
            console.error(`[FAIL] ${relativePath} Exited with code ${e.status}`);
        }
    }
    console.log('-'.repeat(40));
}

console.log(`Finished. Failed: ${failed}`);
if (failed > 0) process.exit(1);
