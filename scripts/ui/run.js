#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

const USAGE_MESSAGE = `
Usage: node scripts/ui/run.js [options]

Options:
  --help, -h        Show this help message
  --dev             Start development mode with hot reloading (default)
  --prod            Start production mode
  --port <port>     Specify port for the UI server (default: 5173)
  --ws-port <port>  Specify WebSocket port (default: 8080)
  --host <host>     Specify host (default: localhost)

Examples:
  node scripts/ui/run.js --dev
  node scripts/ui/run.js --prod --port 3000
  node scripts/ui/run.js --dev --port 8081 --ws-port 8082
`;

const DEFAULT_CONFIG = Object.freeze({
    isDevMode: true,
    port: 5173,
    wsPort: 8080,
    host: 'localhost'
});

/**
 * Print usage information
 */
function showUsage() {
    console.log(USAGE_MESSAGE);
}

/**
 * Check if help was requested
 */
function isHelpRequested(args) {
    return args.includes('--help') || args.includes('-h');
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    let isDevMode = DEFAULT_CONFIG.isDevMode;
    let port = DEFAULT_CONFIG.port;
    let wsPort = DEFAULT_CONFIG.wsPort;
    let host = DEFAULT_CONFIG.host;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--prod') {
            isDevMode = false;
        } else if (args[i] === '--dev') {
            isDevMode = true;
        } else if (args[i] === '--port' && args[i + 1]) {
            port = parseInt(args[i + 1]);
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--ws-port' && args[i + 1]) {
            wsPort = parseInt(args[i + 1]);
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--host' && args[i + 1]) {
            host = args[i + 1];
            i++; // Skip next argument since it's the value
        }
    }
    
    // Default to dev mode unless --prod was explicitly specified
    if (!args.includes('--prod') && !args.includes('--dev')) {
        isDevMode = DEFAULT_CONFIG.isDevMode;
    }

    return { isDevMode, port, wsPort, host };
}

/**
 * Start the UI server with proper argument forwarding
 */
function startUIServer({ port, wsPort, host }) {
    console.log(`Starting ${port === DEFAULT_CONFIG.port && wsPort === DEFAULT_CONFIG.wsPort && host === DEFAULT_CONFIG.host ? 
        (DEFAULT_CONFIG.isDevMode ? 'development' : 'production') : 
        'custom'} UI server...`);
    console.log(`UI Port: ${port}, WebSocket Port: ${wsPort}, Host: ${host}`);

    const spawnArgs = ['--port', port.toString(), '--ws-port', wsPort.toString(), '--host', host];
    
    const child = spawn('node', ['webui.js', ...spawnArgs], {
        stdio: 'inherit',
        cwd: join(__dirname, '../../'),
        env: {
            ...process.env,
            WS_PORT: wsPort.toString(),
            WS_HOST: host,
            PORT: port.toString()
        }
    });

    child.on('error', (err) => {
        console.error('Error starting UI server:', err.message);
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

    const config = parseArgs(args);
    startUIServer(config);
}

main();