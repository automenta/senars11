#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

function showUsage() {
    console.log(`
Usage: node scripts/tests/run.js [options]

Options:
  --help, -h          Show this help message
  --core              Run core tests (default)
  --ui                Run UI tests
  --e2e               Run end-to-end tests
  --unit              Run unit tests only
  --integration       Run integration tests only
  --property          Run property-based tests only
  --all               Run all tests
  --automated         Run automated test framework
  --verbose, -v       Verbose output
  --coverage          Generate coverage report
  --watch             Watch mode

Examples:
  node bin/tests/run.js --core
  node bin/tests/run.js --ui
  node bin/tests/run.js --all --verbose
  node bin/tests/run.js --unit --coverage
  node bin/tests/run.js --e2e --watch
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Parse arguments
let testType = 'core'; // default
let verbose = args.includes('--verbose') || args.includes('-v');
let coverage = args.includes('--coverage');
let watch = args.includes('--watch');

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--core') {
        testType = 'core';
    } else if (args[i] === '--ui') {
        testType = 'ui';
    } else if (args[i] === '--e2e') {
        testType = 'e2e';
    } else if (args[i] === '--unit') {
        testType = 'unit';
    } else if (args[i] === '--integration') {
        testType = 'integration';
    } else if (args[i] === '--property') {
        testType = 'property';
    } else if (args[i] === '--all') {
        testType = 'all';
    } else if (args[i] === '--automated') {
        testType = 'automated';
    }
}

// Map test types to npm scripts
const testCommands = {
    'core': 'test:core',
    'ui': 'test:ui',
    'unit': 'test:unit',
    'integration': 'test:integration',
    'property': 'test:property',
    'automated': 'test:automated',
    'all': 'test:all',
    'e2e': 'test:e2e'
};

let npmScript = testCommands[testType];

if (!npmScript) {
    console.error(`Unknown test type: ${testType}`);
    process.exit(1);
}

// Add additional flags based on options
let jestArgs = [];
if (verbose) jestArgs.push('--verbose');
if (coverage) jestArgs.push('--coverage');
if (watch) jestArgs.push('--watch');

console.log(`Running ${testType} tests...`);

// Start the appropriate test command
const child = spawn('npm', ['run', npmScript, '--', ...jestArgs], {
    stdio: 'inherit',
    cwd: join(__dirname, '../../')
});

child.on('error', (err) => {
    console.error('Error running tests:', err.message);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});