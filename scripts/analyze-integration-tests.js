#!/usr/bin/env node
import {execSync} from 'child_process';
import {readdirSync, statSync} from 'fs';
import {join} from 'path';

const results = [];
const testDir = 'tests/integration';

function findTests(dir) {
    const files = [];
    const items = readdirSync(dir);

    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...findTests(fullPath));
        } else if (item.endsWith('.test.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

const tests = findTests(testDir);
console.log(`Found ${tests.length} test files\n`);

for (const testFile of tests) {
    const start = Date.now();
    let status = 'PASS';
    let error = '';

    try {
        execSync(
            `NODE_NO_WARNINGS=1 NODE_OPTIONS=--experimental-vm-modules npx jest --config jest.integration.config.js "${testFile}" --silent`,
            {timeout: 10000, stdio: 'pipe'}
        );
    } catch (e) {
        status = e.code === 124 || e.killed ? 'TIMEOUT' : 'FAIL';
        error = e.message.slice(0, 200);
    }

    const duration = Date.now() - start;
    results.push({testFile, status, duration, error});

    const symbol = status === 'PASS' ? '✓' : status === 'TIMEOUT' ? '⏱' : '✗';
    console.log(`${symbol} ${testFile.padEnd(80)} ${duration}ms`);
}

console.log('\n=== SUMMARY ===');
console.log(`Total: ${results.length}`);
console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}`);
console.log(`Failed: ${results.filter(r => r.status === 'FAIL').length}`);
console.log(`Timeout: ${results.filter(r => r.status === 'TIMEOUT').length}`);

const slow = results.filter(r => r.duration > 5000);
if (slow.length > 0) {
    console.log(`\n=== SLOW TESTS (>5s) ===`);
    slow.forEach(r => console.log(`${r.testFile}: ${r.duration}ms`));
}

const failed = results.filter(r => r.status === 'FAIL' || r.status === 'TIMEOUT');
if (failed.length > 0) {
    console.log(`\n=== FAILED/TIMEOUT TESTS ===`);
    failed.forEach(r => console.log(`${r.testFile}: ${r.status}`));
}
