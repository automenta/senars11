#!/usr/bin/env node

/**
 * Consolidated Web UI Launcher
 * Provides a parameterized foundation for launching any data-driven UI with WebSocket connectivity
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {parseArgs as parseCliArgs, showUsageAndExit} from '../utils/script-utils.js';
import {WebSocketMonitor} from '../../src/server/WebSocketMonitor.js';
import {DemoWrapper} from '../../src/demo/DemoWrapper.js';
import {SessionBuilder} from '../../src/session/SessionBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {args: cliArgs, helpRequested} = parseCliArgs(process.argv.slice(2));

const USAGE_MESSAGE = `
Usage: node scripts/ui/launcher.js [options]

Options:
  --help, -h        Show this help message
  --dev             Start development mode with hot reloading (default)
  --prod            Start production mode
  --port <port>     Specify port for the UI server (default: 5173)
  --ws-port <port>  Specify WebSocket port (default: 8080)
  --host <host>     Specify host (default: localhost)
  --graph-ui        Launch with Graph UI layout
  --layout <name>   Specify layout (default, self-analysis, graph)

Examples:
  node scripts/ui/launcher.js --dev
  node scripts/ui/launcher.js --prod --port 3000
  node scripts/ui/launcher.js --dev --port 8081 --ws-port 8082
  node scripts/ui/launcher.js --graph-ui
`;

// Parse arguments to support flexible server configuration
const args = cliArgs;

const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true}
    },
    persistence: {
        defaultPath: './agent.json'
    },
    webSocket: {
        port: parseInt(process.env.WS_PORT) || 8080,
        host: process.env.WS_HOST || '0.0.0.0',
        maxConnections: 20
    },
    ui: {
        port: parseInt(process.env.PORT) || 5173
    }
});

/**
 * Parse command line arguments to support flexible configuration
 */
function parseArgs(args) {
    let config = {...DEFAULT_CONFIG};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--ws-port':
                if (args[i + 1]) {
                    config = updateConfig(config, 'webSocket', 'port', parseInt(args[i + 1]));
                    i++;
                }
                break;
            case '--port':
                if (args[i + 1]) {
                    config = updateConfig(config, 'ui', 'port', parseInt(args[i + 1]));
                    i++;
                }
                break;
            case '--host':
                if (args[i + 1]) {
                    config = updateConfig(config, 'webSocket', 'host', args[i + 1]);
                    i++;
                }
                break;
            case '--graph-ui':
                config = updateConfig(config, 'ui', 'layout', 'graph');
                break;
            case '--layout':
                if (args[i + 1]) {
                    config = updateConfig(config, 'ui', 'layout', args[i + 1]);
                    i++;
                }
                break;
        }
    }

    return config;
}

function updateConfig(config, section, key, value) {
    return {
        ...config,
        [section]: {
            ...config[section],
            [key]: value
        }
    };
}

if (helpRequested) {
    showUsageAndExit(USAGE_MESSAGE);
}

/**
 * Initialize and start the WebSocket server
 */
async function startWebSocketServer(config = DEFAULT_CONFIG) {
    console.log(`Starting WebSocket server on ${config.webSocket.host}:${config.webSocket.port}...`);

    // Use SessionBuilder to create the engine
    const replEngine = await _createReplEngine(config);
    const monitor = await _initializeWebSocketMonitor(config.webSocket);
    const serverAdapter = await _setupSessionServerAdapter(replEngine, monitor);
    const demoWrapper = await _setupDemoWrapper(replEngine.nar, monitor);

    console.log('WebSocket server started successfully');

    return {nar: replEngine.nar, replEngine, monitor, demoWrapper};
}

async function _createReplEngine(config) {
    const builder = new SessionBuilder({
        nar: config.nar,
        persistence: config.persistence,
        // Add default LM config if not present, though typically disabled in this launcher context unless args say otherwise
        lm: {
             enabled: false, // Default to false for web launcher unless extended
             ...config.lm
        }
    });

    return await builder.build();
}

async function _initializeWebSocketMonitor(webSocketConfig) {
    const monitor = new WebSocketMonitor(webSocketConfig);
    await monitor.start();
    return monitor;
}

async function _setupSessionServerAdapter(replEngine, monitor) {
    // Import and initialize SessionServerAdapter (formerly WebRepl)
    const {SessionServerAdapter} = await import('../../src/server/SessionServerAdapter.js');
    const serverAdapter = new SessionServerAdapter(replEngine, monitor);

    // Register adapter with the WebSocket server to provide comprehensive message support
    serverAdapter.registerWithWebSocketServer();

    // Register a handler for NAR instance requests from the UI
    monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
        // For security reasons, we only send information that's safe for the UI, not the full NAR instance
        const narInfo = {
            cycleCount: replEngine.nar.cycleCount,
            isRunning: replEngine.nar.isRunning,
            config: replEngine.nar.config.toJSON(),
            stats: serverAdapter.getStats ? serverAdapter.getStats() : replEngine.getStats(),
            reasoningState: replEngine.nar.getReasoningState ? replEngine.nar.getReasoningState() : null
        };

        monitorInstance._sendToClient(client, {
            type: 'narInstance',
            payload: narInfo
        });
    });

    return serverAdapter;
}

async function _setupDemoWrapper(nar, monitor) {
    // Initialize DemoWrapper to provide remote control and introspection
    const demoWrapper = new DemoWrapper();
    await demoWrapper.initialize(nar, monitor);

    // Send list of available demos to connected UIs
    await demoWrapper.sendDemoList();

    // Start periodic metrics updates
    demoWrapper.runPeriodicMetricsUpdate();

    // Start the NAR reasoning cycle
    nar.start();

    return demoWrapper;
}

/**
 * Start the UI server as a child process
 */
function startUIServer(config = DEFAULT_CONFIG) {
    console.log(`Starting UI server on port ${config.ui.port}...`);

    // Set up environment variables for the UI server
    const env = {
        ...process.env,
        HTTP_PORT: config.ui.port.toString(),
        WS_PORT: config.webSocket.port.toString()
    };

    // Run the UI server as a child process
    const serverProcess = spawn('node', ['server.js'], {
        cwd: join(__dirname, '../../ui'),
        stdio: 'inherit', // This allows the UI server to control the terminal properly
        env: env
    });

    serverProcess.on('error', (err) => {
        console.error('Error starting UI server:', err.message);
        process.exit(1);
    });

    serverProcess.on('close', (code) => {
        console.log(`UI server exited with code ${code}`);
        console.log('UI server closed. Press Ctrl+C to shut down the WebSocket server as well.');
    });

    return serverProcess;
}

/**
 * Save the NAR state to file
 */
async function saveNarState(nar, replEngine = null) {
    try {
        const fs = await import('fs');
        const state = nar.serialize();
        if (state) {
            await fs.promises.writeFile(DEFAULT_CONFIG.persistence.defaultPath, JSON.stringify(state, null, 2));
            console.log('Current state saved to agent.json');
        }

        // Also save ReplEngine state if available
        if (replEngine) {
            await replEngine.save();
        }
    } catch (error) {
        console.error('Error saving state:', error.message);
        throw error;
    }
}

/**
 * Shutdown sequence for all services
 */
async function shutdownServices(webSocketServer) {
    const errors = [];

    // Save NAR state
    try {
        await saveNarState(webSocketServer.nar, webSocketServer.replEngine);
    } catch (saveError) {
        console.error('Error saving state on shutdown:', saveError.message);
        errors.push(saveError);
    }

    // Shutdown ReplEngine if available
    try {
        if (webSocketServer.replEngine) {
            await webSocketServer.replEngine.shutdown();
        }
    } catch (engineError) {
        console.error('Error shutting down ReplEngine:', engineError.message);
        errors.push(engineError);
    }

    // Stop WebSocket server
    try {
        if (webSocketServer.monitor) {
            await webSocketServer.monitor.stop();
        }
    } catch (monitorError) {
        console.error('Error stopping WebSocket monitor:', monitorError.message);
        errors.push(monitorError);
    }

    try {
        if (webSocketServer.nar) {
            webSocketServer.nar.stop();
        }
    } catch (narError) {
        console.error('Error stopping NAR:', narError.message);
        errors.push(narError);
    }

    if (errors.length > 0) {
        throw new Error(`Shutdown completed with ${errors.length} errors`);
    }
}

/**
 * Setup graceful shutdown handlers
 */
async function setupGracefulShutdown(webSocketServer) {
    const shutdown = async () => {
        console.log('\nShutting down gracefully...');
        await shutdownServices(webSocketServer);
        console.log('Servers stopped successfully');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error.message);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}

async function main() {
    let webSocketServer;

    try {
        // Parse command line arguments for flexible configuration
        const config = parseArgs(args);

        // Start WebSocket server with the parsed config
        webSocketServer = await startWebSocketServer(config);

        // Set up graceful shutdown
        await setupGracefulShutdown({
            nar: webSocketServer.nar,
            replEngine: webSocketServer.replEngine,
            monitor: webSocketServer.monitor
        });

        // Start UI server
        const uiServer = startUIServer(config);

        // Store the websocket server info for shutdown
        webSocketServer.uiServer = uiServer;

        console.log('Both servers are running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});
