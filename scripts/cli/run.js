#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI runner that can handle different CLI operations
const args = process.argv.slice(2);

function showUsage() {
    console.log(`
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
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Determine which CLI mode to run
let cliModule = 'src/index.js';
let nodeArgs = [];

// Check for dev mode
if (args.includes('--dev') || args.includes('--watch')) {
    nodeArgs.push('--watch');
    // Remove --dev/--watch from args passed to the CLI
    args.splice(args.indexOf('--dev') !== -1 ? args.indexOf('--dev') : args.indexOf('--watch'), 1);
}

// Pass the remaining arguments to the CLI module
const child = spawn('node', [...nodeArgs, cliModule, ...args], {
    stdio: 'inherit',
    cwd: join(__dirname, '../../')
});

child.on('error', (err) => {
    console.error('Error running CLI:', err.message);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});