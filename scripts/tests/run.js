#!/usr/bin/env node

import {ScriptUtils} from '../utils/script-utils.js';

const {args, helpRequested} = ScriptUtils.parseArgs(process.argv.slice(2));

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
const VERBOSE_ARGS = ['--verbose', '-v'];

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

const parseArgs = args => {
    let testType = DEFAULT_TEST_TYPE;
    let verbose = args.some(arg => VERBOSE_ARGS.includes(arg));
    let coverage = args.includes('--coverage');
    let watch = args.includes('--watch');

    const foundTestType = ScriptUtils.findArgValue(args, Object.keys(TEST_COMMANDS));
    if (foundTestType) {
        testType = foundTestType;
    }

    return {testType, verbose, coverage, watch};
};

const buildTestArgs = ({verbose, coverage, watch}) => [
    ...(verbose ? ['--verbose'] : []),
    ...(coverage ? ['--coverage'] : []),
    ...(watch ? ['--watch'] : [])
];

if (helpRequested) {
    ScriptUtils.showUsageAndExit(USAGE_MESSAGE);
}

const {testType, verbose, coverage, watch} = parseArgs(args);

const npmScript = TEST_COMMANDS[testType];
if (!npmScript) {
    console.error(`Unknown test type: ${testType}`);
    process.exit(1);
}

const jestArgs = buildTestArgs({verbose, coverage, watch});
console.log(`Running ${npmScript.replace('test:', '')} tests...`);
ScriptUtils.spawnProcess('npm', ['run', npmScript, '--', ...jestArgs]);