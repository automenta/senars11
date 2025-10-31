#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

const USAGE_MESSAGE = `
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
  node scripts/tests/run.js --core
  node scripts/tests/run.js --ui
  node scripts/tests/run.js --all --verbose
  node scripts/tests/run.js --unit --coverage
  node scripts/tests/run.js --e2e --watch
`;

const DEFAULT_TEST_TYPE = 'core';
const HELP_ARGS = ['--help', '-h'];
const VERBOSE_ARGS = ['--verbose', '-v'];
const OPTION_ARGS = ['--coverage', '--watch', ...VERBOSE_ARGS];

const TEST_COMMANDS = {
    'core': 'test:core',
    'ui': 'test:ui',
    'unit': 'test:unit',
    'integration': 'test:integration',
    'property': 'test:property',
    'automated': 'test:automated',
    'all': 'test:all',
    'e2e': 'test:e2e'
};

function showUsage() {
    console.log(USAGE_MESSAGE);
}

/**
 * Check if help was requested
 */
function isHelpRequested(args) {
    return args.some(arg => HELP_ARGS.includes(arg));
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    let testType = DEFAULT_TEST_TYPE;
    let verbose = args.some(arg => VERBOSE_ARGS.includes(arg));
    let coverage = args.includes('--coverage');
    let watch = args.includes('--watch');

    for (let i = 0; i < args.length; i++) {
        if (Object.keys(TEST_COMMANDS).includes(args[i].replace(/^--/, ''))) {
            testType = args[i].replace(/^--/, '');
        }
    }

    return { testType, verbose, coverage, watch };
}

/**
 * Build test arguments based on options
 */
function buildTestArgs({ verbose, coverage, watch }) {
    const jestArgs = [];
    if (verbose) jestArgs.push('--verbose');
    if (coverage) jestArgs.push('--coverage');
    if (watch) jestArgs.push('--watch');
    return jestArgs;
}

/**
 * Start the test runner
 */
function runTests(npmScript, jestArgs) {
    console.log(`Running ${npmScript.replace('test:', '')} tests...`);

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
}

function main() {
    if (isHelpRequested(args)) {
        showUsage();
        process.exit(0);
    }

    const { testType, verbose, coverage, watch } = parseArgs(args);
    
    const npmScript = TEST_COMMANDS[testType];
    if (!npmScript) {
        console.error(`Unknown test type: ${testType}`);
        process.exit(1);
    }

    const jestArgs = buildTestArgs({ verbose, coverage, watch });
    runTests(npmScript, jestArgs);
}

main();