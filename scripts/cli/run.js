#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI runner that can handle different CLI operations
const args = process.argv.slice(2);

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

const CLI_CONFIG = {
    module: 'src/index.js',
    baseDir: join(__dirname, '../../'),
    devArgs: ['--dev', '--watch'],
    helpArgs: ['--help', '-h']
};

function showUsage() {
    console.log(USAGE_MESSAGE);
}

/**
 * Check if help was requested
 */
function isHelpRequested(args) {
    return args.some(arg => CLI_CONFIG.helpArgs.includes(arg));
}

/**
 * Process arguments to extract dev mode and other options
 */
function processArgs(args) {
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
}

/**
 * Run the CLI process
 */
function runCLI(nodeArgs, remainingArgs) {
    const child = spawn('node', [...nodeArgs, CLI_CONFIG.module, ...remainingArgs], {
        stdio: 'inherit',
        cwd: CLI_CONFIG.baseDir
    });

    child.on('error', (err) => {
        console.error('Error running CLI:', err.message);
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

    const { nodeArgs, remainingArgs } = processArgs(args);
    runCLI(nodeArgs, remainingArgs);
}

main();