#!/usr/bin/env node

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

async function startWebSocketServer(config = DEFAULT_CONFIG) {
    console.log(`Starting WebSocket server on ${config.webSocket.host}:${config.webSocket.port}...`);

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
        lm: {
             enabled: false,
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
    const {SessionServerAdapter} = await import('../../src/server/SessionServerAdapter.js');
    const serverAdapter = new SessionServerAdapter(replEngine, monitor);

    serverAdapter.registerWithWebSocketServer();

    monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
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
    const demoWrapper = new DemoWrapper();
    await demoWrapper.initialize(nar, monitor);

    await demoWrapper.sendDemoList();
    demoWrapper.runPeriodicMetricsUpdate();
    nar.start();

    return demoWrapper;
}

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
    try {
        const fs = await import('fs');
        const state = nar.serialize();
        if (state) {
            await fs.promises.writeFile(DEFAULT_CONFIG.persistence.defaultPath, JSON.stringify(state, null, 2));
            console.log('Current state saved to agent.json');
        }

        if (replEngine) {
            await replEngine.save();
        }
    } catch (error) {
        console.error('Error saving state:', error.message);
        throw error;
    }
}

async function shutdownServices(webSocketServer) {
    const errors = [];

    try {
        await saveNarState(webSocketServer.nar, webSocketServer.replEngine);
    } catch (saveError) {
        console.error('Error saving state on shutdown:', saveError.message);
        errors.push(saveError);
    }

    try {
        if (webSocketServer.replEngine) {
            await webSocketServer.replEngine.shutdown();
        }
    } catch (engineError) {
        console.error('Error shutting down ReplEngine:', engineError.message);
        errors.push(engineError);
    }

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
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});
