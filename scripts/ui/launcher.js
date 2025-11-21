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

    const monitor = new WebSocketMonitor(config.webSocket);
    await monitor.start();

    // Ensure 'main' session is created
    let mainSession = monitor.sessionManager.getSession('main');
    if (!mainSession) {
        // Try creating it explicitly if start() didn't do it
        mainSession = await monitor.sessionManager.createSession('main');
    }

    // The error "Cannot read properties of undefined (reading 'nar')" happened in the previous attempt.
    // It was likely mainSession being undefined.
    // The `start()` method in WebSocketMonitor is async and calls `createSession`,
    // but we access `monitor.sessionManager.getSession('main')` immediately after await start().
    // If createSession failed or is pending inside start (unlikely with await), mainSession might be missing.
    // OR, maybe sessionManager.createSession('main') failed?

    if (!mainSession) {
        throw new Error("Failed to initialize main session");
    }

    const {WebRepl} = await import('../../src/repl/WebRepl.js');

    const replEngineAdapter = {
        nar: mainSession.nar,
        initialize: async () => {},
        save: async () => {},
        shutdown: async () => {},
        getStats: () => mainSession.nar.getStats()
    };

    const webRepl = new WebRepl(replEngineAdapter, monitor);

    if (typeof webRepl.registerWithWebSocketServer === 'function') {
         webRepl.registerWithWebSocketServer();
    } else {
        monitor.attachReplMessageHandler(webRepl);
    }

    monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
        const sessionId = monitor.clientSessions.get(client) || 'main';
        const session = monitor.sessionManager.getSession(sessionId);
        const nar = session ? session.nar : mainSession.nar;

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

    const demoWrapper = new DemoWrapper();
    await demoWrapper.initialize(mainSession.nar, monitor);
    await demoWrapper.sendDemoList();
    demoWrapper.runPeriodicMetricsUpdate();

    mainSession.nar.start();

    console.log('WebSocket server started successfully');

    return {nar: mainSession.nar, replEngine: replEngineAdapter, monitor, demoWrapper};
}

/**
 * Start the UI server as a child process
 */
function startUIServer(config = DEFAULT_CONFIG) {
    console.log(`Starting UI server on port ${config.ui.port}...`);

    const env = {
        ...process.env,
        HTTP_PORT: config.ui.port.toString(),
        WS_PORT: config.webSocket.port.toString()
    };

    const serverProcess = spawn('node', ['server.js'], {
        cwd: join(__dirname, '../../ui'),
        stdio: 'inherit',
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

async function saveNarState(nar, replEngine = null) {
    // Persistence handled by SessionManager in future
}

async function shutdownServices(webSocketServer) {
    try {
        await saveNarState(webSocketServer.nar, webSocketServer.replEngine);
    } catch (saveError) {
        console.error('Error saving state on shutdown:', saveError.message);
    }

    if (webSocketServer.replEngine && webSocketServer.replEngine.shutdown) {
        await webSocketServer.replEngine.shutdown();
    }

    if (webSocketServer.monitor) {
        await webSocketServer.monitor.stop();
    }
}

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
        const config = parseArgs(args);
        webSocketServer = await startWebSocketServer(config);

        await setupGracefulShutdown({
            nar: webSocketServer.nar,
            replEngine: webSocketServer.replEngine,
            monitor: webSocketServer.monitor
        });

        const uiServer = startUIServer(config);
        webSocketServer.uiServer = uiServer;

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
