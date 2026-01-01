#!/usr/bin/env node

/**
 * SeNARS CLI Entry Point
 *
 * Provides the npx senars command for easy access to SeNARS functionality.
 *
 * Usage:
 *   npx senars demo        # Run instant demo
 *   npx senars repl        # Start REPL
 *   npx senars serve       # Start MCP + WebSocket servers
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

function showHelp() {
    console.log(`
SeNARS CLI - The Next Generation Reasoning System

Usage:
  npx senars [command]

Commands:
  demo        Run instant demo showcasing SeNARS capabilities
  repl        Start interactive REPL
  serve       Start MCP + WebSocket servers
  help        Show this help message

Examples:
  npx senars demo        # Run 3 compelling demos
  npx senars repl        # Start interactive session
  npx senars serve       # Start servers for UI
    `);
}

function runDemo() {
    console.log('🚀 Running SeNARS Instant Demo...');
    console.log('');

    // Import and run the instant demo
    import('../../examples/instant-demo.js').then(async () => {
        const { runAllDemos } = await import('../../examples/instant-demo.js');
        await runAllDemos();
    }).catch(err => {
        console.error('❌ Error running demo:', err);
        process.exit(1);
    });
}

function startRepl() {
    // Spawn the agent REPL
    const replPath = path.join(__dirname, '..', '..', 'agent', 'src', 'bin', 'cli.js');
    const child = spawn('node', [replPath, ...args.slice(1)], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..')
    });

    child.on('error', (err) => {
        console.error('❌ Error starting REPL:', err.message);
        process.exit(1);
    });

    child.on('close', (code) => {
        process.exit(code);
    });
}

function startServe() {
    console.log('📡 Starting SeNARS servers...');

    // Start the UI server which includes WebSocket functionality
    const serverPath = path.join(__dirname, '..', '..', 'ui', 'server.js');
    const child = spawn('node', [serverPath], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..')
    });

    child.on('error', (err) => {
        console.error('❌ Error starting server:', err.message);
        process.exit(1);
    });

    child.on('close', (code) => {
        process.exit(code);
    });
}

// Execute the appropriate command
switch (command) {
    case 'demo':
        runDemo();
        break;
    case 'repl':
        startRepl();
        break;
    case 'serve':
        startServe();
        break;
    case 'help':
    case '--help':
    case '-h':
    default:
        showHelp();
        break;
}