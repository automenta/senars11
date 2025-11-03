#!/usr/bin/env node

import { parseArgs as parseCliArgs, showUsageAndExit, parseKeyValueArgs, spawnProcess, BASE_DIR } from '../utils/script-utils.js';

const { args, helpRequested } = parseCliArgs(process.argv.slice(2));

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

const parseArgs = args => {
    let isDevMode = DEFAULT_CONFIG.isDevMode;
    let port = DEFAULT_CONFIG.port;
    let wsPort = DEFAULT_CONFIG.wsPort;
    let host = DEFAULT_CONFIG.host;

    // Parse key-value arguments
    const keyValueArgs = parseKeyValueArgs(args, {
        '--port': 'port',
        '--ws-port': 'wsPort',
        '--host': 'host'
    });
    
    // Override defaults with parsed values if provided
    if (keyValueArgs.port) port = parseInt(keyValueArgs.port);
    if (keyValueArgs.wsPort) wsPort = parseInt(keyValueArgs.wsPort);
    if (keyValueArgs.host) host = keyValueArgs.host;

    // Check for boolean flags
    if (args.includes('--prod')) {
        isDevMode = false;
    } else if (args.includes('--dev')) {
        isDevMode = true;
    }
    
    // Default to dev mode unless --prod was explicitly specified
    if (!args.includes('--prod') && !args.includes('--dev')) {
        isDevMode = DEFAULT_CONFIG.isDevMode;
    }

    return { isDevMode, port, wsPort, host };
};

if (helpRequested) {
    showUsageAndExit(USAGE_MESSAGE);
}

const config = parseArgs(args);
const { port, wsPort, host } = config;

console.log(`Starting ${port === DEFAULT_CONFIG.port && wsPort === DEFAULT_CONFIG.wsPort && host === DEFAULT_CONFIG.host ? 
    (DEFAULT_CONFIG.isDevMode ? 'development' : 'production') : 
    'custom'} UI server...`);
console.log(`UI Port: ${port}, WebSocket Port: ${wsPort}, Host: ${host}`);

const spawnArgs = ['--port', port.toString(), '--ws-port', wsPort.toString(), '--host', host];

spawnProcess('node', [BASE_DIR + '/webui.js', ...spawnArgs], {
    env: {
        ...process.env,
        WS_PORT: wsPort.toString(),
        WS_HOST: host,
        PORT: port.toString()
    }
});