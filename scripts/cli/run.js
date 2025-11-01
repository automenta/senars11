#!/usr/bin/env node

import { parseArgs, showUsageAndExit, spawnProcess, BASE_DIR } from '../utils/script-utils.js';

// CLI runner that can handle different CLI operations
const { args, helpRequested } = parseArgs(process.argv.slice(2));

const USAGE_MESSAGE = `
Usage: node scripts/cli/run.js [options]

Options:
  --help, -h        Show this help message
  --interactive     Start interactive CLI session
  --script <file>   Run a script file
  --eval <code>     Evaluate code directly
  --repl            Start REPL mode
  --dev             Start in development mode with file watching

Examples:
  node scripts/cli/run.js --interactive
  node scripts/cli/run.js --script myscript.nal
  node scripts/cli/run.js --eval "(a --> b)."
  node scripts/cli/run.js --repl
  node scripts/cli/run.js --dev
`;

const CLI_CONFIG = Object.freeze({
    module: BASE_DIR + '/src/index.js'
});

const processArgs = args => {
    let nodeArgs = [];
    const remainingArgs = [...args]; // Create a copy to avoid modifying original

    // Check for dev mode and extract node args
    if (args.includes('--dev') || args.includes('--watch')) {
        nodeArgs.push('--watch');
        // Remove --dev/--watch from args passed to the CLI
        const devIndex = args.indexOf('--dev') !== -1 ? args.indexOf('--dev') : args.indexOf('--watch');
        remainingArgs.splice(devIndex, 1);
    }

    return { nodeArgs, remainingArgs };
};

if (helpRequested) {
    showUsageAndExit(USAGE_MESSAGE);
}

const { nodeArgs, remainingArgs } = processArgs(args);
spawnProcess('node', [...nodeArgs, CLI_CONFIG.module, ...remainingArgs]);