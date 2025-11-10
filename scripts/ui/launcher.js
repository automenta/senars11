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
import {NAR} from '../../src/nar/NAR.js';
import {DemoWrapper} from '../../src/demo/DemoWrapper.js';

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
  --repl            Launch with REPL UI (serves ui/repl directory)

Examples:
  node scripts/ui/launcher.js --dev
  node scripts/ui/launcher.js --prod --port 3000
  node scripts/ui/launcher.js --dev --port 8081 --ws-port 8082
  node scripts/ui/launcher.js --graph-ui
  node scripts/ui/launcher.js --repl
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
        host: process.env.WS_HOST || 'localhost',
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
        if (args[i] === '--ws-port' && args[i + 1]) {
            config = {
                ...config,
                webSocket: {
                    ...config.webSocket,
                    port: parseInt(args[i + 1])
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--port' && args[i + 1]) {
            config = {
                ...config,
                ui: {
                    ...config.ui,
                    port: parseInt(args[i + 1])
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--host' && args[i + 1]) {
            config = {
                ...config,
                webSocket: {
                    ...config.webSocket,
                    host: args[i + 1]
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--graph-ui') {
            config = {
                ...config,
                ui: {
                    ...config.ui,
                    layout: 'graph'
                }
            };
        } else if (args[i] === '--layout' && args[i + 1]) {
            config = {
                ...config,
                ui: {
                    ...config.ui,
                    layout: args[i + 1]
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--repl') {
            config = {
                ...config,
                ui: {
                    ...config.ui,
                    mode: 'repl'
                }
            };
        }
    }

    return config;
}

if (helpRequested) {
    showUsageAndExit(USAGE_MESSAGE);
}

/**
 * Initialize and start the WebSocket server
 */
async function startWebSocketServer(config = DEFAULT_CONFIG) {
    console.log(`Starting WebSocket server on ${config.webSocket.host}:${config.webSocket.port}...`);

    const nar = new NAR(config.nar);
    await nar.initialize();

    const monitor = new WebSocketMonitor(config.webSocket);
    await monitor.start();
    nar.connectToWebSocketMonitor(monitor);

    // Check if we're in REPL mode to use the proper message handler
    if (config.ui.mode === 'repl') {
        try {
            // Import and use WebRepl for handling REPL messages
            const {WebRepl} = await import('../../src/repl/WebRepl.js');
            const webRepl = new WebRepl(nar, monitor);
            
            // Register WebRepl with the WebSocket server
            webRepl.registerWithWebSocketServer();
            
            // Register a handler for NAR instance requests from the UI
            monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
                try {
                    // For security reasons, we only send information that's safe for the UI, not the full NAR instance
                    const narInfo = {
                        cycleCount: nar.cycleCount,
                        isRunning: nar.isRunning,
                        config: nar.config.toJSON(),
                        stats: webRepl.getStats(),
                        reasoningState: nar.getReasoningState ? nar.getReasoningState() : null
                    };

                    monitorInstance._sendToClient(client, {
                        type: 'narInstance',
                        payload: narInfo
                    });
                } catch (error) {
                    console.error('Error handling requestNAR:', error);
                    monitorInstance._sendToClient(client, {
                        type: 'error',
                        payload: { error: error.message }
                    });
                }
            });
        } catch (error) {
            console.error('Error initializing WebRepl in launcher:', error);
            // Fallback to standard handler if WebRepl initialization fails
            monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
                const narInfo = {
                    cycleCount: nar.cycleCount,
                    isRunning: nar.isRunning,
                    config: nar.config.toJSON(),
                    stats: nar.getStats(),
                    reasoningState: nar.getReasoningState ? nar.getReasoningState() : null
                };

                monitorInstance._sendToClient(client, {
                    type: 'narInstance',
                    payload: narInfo
                });
            });
        }
    } else {
        // Register a handler for NAR instance requests from the UI
        monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
            // For security reasons, we only send information that's safe for the UI, not the full NAR instance
            const narInfo = {
                cycleCount: nar.cycleCount,
                isRunning: nar.isRunning,
                config: nar.config.toJSON(),
                stats: nar.getStats(),
                reasoningState: nar.getReasoningState ? nar.getReasoningState() : null
            };

            monitorInstance._sendToClient(client, {
                type: 'narInstance',
                payload: narInfo
            });
        });
    }

    // Initialize DemoWrapper to provide remote control and introspection
    const demoWrapper = new DemoWrapper();
    await demoWrapper.initialize(nar, monitor);

    // Send list of available demos to connected UIs
    await demoWrapper.sendDemoList();

    // Start periodic metrics updates
    demoWrapper.runPeriodicMetricsUpdate();

    // Start the NAR reasoning cycle
    nar.start();

    console.log('WebSocket server started successfully');

    return {nar, monitor, demoWrapper};
}

/**
 * Start the Vite development server
 */
function startViteDevServer(config = DEFAULT_CONFIG) {
    console.log(`Starting Vite dev server on port ${config.ui.port}...`);

    // Determine command based on whether we're in repl mode
    const isReplMode = config.ui.mode === 'repl';
    const viteArgs = isReplMode
        ? ['vite', 'dev', '--port', config.ui.port.toString(), '--config', 'vite.config.repl.js']
        : ['vite', 'dev', '--port', config.ui.port.toString()];

    // Change to ui directory and run vite dev server
    const viteProcess = spawn('npx', viteArgs, {
        cwd: join(__dirname, '../../ui'),
        stdio: 'inherit', // This allows the Vite server to control the terminal properly
        env: {
            ...process.env,
            // Pass WebSocket connection info to UI
            VITE_WS_HOST: config.webSocket.host,
            VITE_WS_PORT: config.webSocket.port.toString(),
            VITE_WS_PATH: DEFAULT_CONFIG.webSocket.path || undefined,
            PORT: config.ui.port.toString(), // Also set PORT for compatibility
            VITE_DEFAULT_LAYOUT: config.ui.layout || 'default',
            VITE_UI_MODE: config.ui.mode || 'default'
        }
    });

    viteProcess.on('error', (err) => {
        console.error('Error starting Vite server:', err.message);
        process.exit(1);
    });

    viteProcess.on('close', (code) => {
        console.log(`Vite server exited with code ${code}`);
        // Don't exit the main process if vite server closes, just log it
        // This allows graceful shutdown to be triggered by user pressing Ctrl+C
        console.log('Vite server closed. Press Ctrl+C to shut down the WebSocket server as well.');
    });

    return viteProcess;
}

/**
 * Save the NAR state to file
 */
async function saveNarState(nar) {
    const fs = await import('fs');
    const state = nar.serialize();
    await fs.promises.writeFile(DEFAULT_CONFIG.persistence.defaultPath, JSON.stringify(state, null, 2));
    console.log('Current state saved to agent.json');
}

/**
 * Shutdown sequence for all services
 */
async function shutdownServices(webSocketServer) {
    // Save NAR state
    try {
        await saveNarState(webSocketServer.nar);
    } catch (saveError) {
        console.error('Error saving state on shutdown:', saveError.message);
    }

    // Stop WebSocket server
    if (webSocketServer.monitor) {
        await webSocketServer.monitor.stop();
    }

    if (webSocketServer.nar) {
        webSocketServer.nar.stop();
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
            monitor: webSocketServer.monitor
        });

        // Start Vite dev server
        const viteProcess = startViteDevServer(config);

        // Store the websocket server info for shutdown
        webSocketServer.viteProcess = viteProcess;

        console.log('Both servers are running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Failed to start servers:', error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});