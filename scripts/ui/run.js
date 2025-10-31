#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

function showUsage() {
    console.log(`
Usage: node scripts/ui/run.js [options]

Options:
  --help, -h        Show this help message
  --dev             Start development mode with hot reloading (default)
  --prod            Start production mode
  --port <port>     Specify port for the server (default: 5173)
  --ws-port <port>  Specify WebSocket port (default: 8080)
  --host <host>     Specify host (default: localhost)

Examples:
  node scripts/ui/run.js --dev
  node scripts/ui/run.js --prod --port 3000
  node scripts/ui/run.js --dev --port 8081 --ws-port 8082
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Default to development mode
let isDevMode = !args.includes('--prod'); // Default to dev mode unless --prod is specified
let port = '5173';
let wsPort = '8080';
let host = 'localhost';

// Parse arguments
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prod') {
        isDevMode = false;
    } else if (args[i] === '--dev') {
        isDevMode = true;
    } else if (args[i] === '--port' && args[i + 1]) {
        port = args[i + 1];
        i++; // Skip next argument since it's the value
    } else if (args[i] === '--ws-port' && args[i + 1]) {
        wsPort = args[i + 1];
        i++; // Skip next argument since it's the value
    } else if (args[i] === '--host' && args[i + 1]) {
        host = args[i + 1];
        i++; // Skip next argument since it's the value
    }
}

console.log(`Starting ${isDevMode ? 'development' : 'production'} UI server...`);
console.log(`Port: ${port}, WebSocket Port: ${wsPort}, Host: ${host}`);

// Set environment variables
process.env.PORT = port;
process.env.VITE_WS_PORT = wsPort;
process.env.VITE_WS_HOST = host;

// Start the web UI
const child = spawn('node', ['webui.js'], {
    stdio: 'inherit',
    cwd: join(__dirname, '../../'),
    env: {
        ...process.env,
        WS_PORT: wsPort,
        WS_HOST: host,
        PORT: port
    }
});

child.on('error', (err) => {
    console.error('Error starting UI server:', err.message);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});