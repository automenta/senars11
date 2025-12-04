#!/usr/bin/env node

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {showUsageAndExit} from '../utils/script-utils.js';
import {WebSocketMonitor} from '../../agent/src/server/WebSocketMonitor.js';
import {DemoWrapper} from '../../agent/src/demo/DemoWrapper.js';
import {Config} from '../../agent/src/app/Config.js';
import {App} from '../../agent/src/app/App.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
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
  --no-ui           Do not start the UI server (backend only)

Examples:
  node scripts/ui/launcher.js --dev
  node scripts/ui/launcher.js --prod --port 3000
  node scripts/ui/launcher.js --dev --port 8081 --ws-port 8082
  node scripts/ui/launcher.js --graph-ui
`;
    showUsageAndExit(USAGE_MESSAGE);
}

async function startWebSocketServer(config) {
    console.log(`Starting WebSocket server on ${config.webSocket.host}:${config.webSocket.port}...`);

    const app = new App(config);
    const replEngine = await app.start({startAgent: false}); // This is the Agent/NAR

    const monitor = await _initializeWebSocketMonitor(config.webSocket);
    const serverAdapter = await _setupSessionServerAdapter(replEngine, monitor);

    // Hook up ActivityModel stream
    if (app.activityModel) {
        app.activityModel.subscribe((event, data) => {
            if (event === 'add') {
                monitor.bufferEvent('activity.new', data);
            }
        });
    }

    // Handle incoming actions
    monitor.registerClientMessageHandler('activity.action', async (message, client) => {
        if (app.actionDispatcher) {
            const result = await app.actionDispatcher.dispatch(message.payload);
            // Send result back
            monitor._sendToClient(client, {
                type: 'action.result',
                payload: result,
                requestId: message.id
            });
        } else {
             monitor._sendToClient(client, {
                type: 'error',
                payload: 'ActionDispatcher not initialized'
            });
        }
    });

    // Add logging listeners for demo tour
    replEngine.on('task.input', (data) => {
        if (data.source === 'user') {
            console.log(`IN: ${data.originalInput || data.task}`);
        }
    });

    replEngine.on('reasoning.derivation', (data) => {
        const task = data.derivedTask;
        const source = task.stamp ? task.stamp.source : 'UNKNOWN';
        console.log(`OUT: ${task} [${source}]`);
    });

    replEngine.on('question.answered', (data) => {
        const payload = data.payload || data;
        const answer = payload.answer || payload.task || payload;
        console.log(`Answer: ${answer}`);
    });

    // Check for demo argument
    const args = process.argv.slice(2);
    const demoIndex = args.indexOf('--demo');
    const demoName = demoIndex !== -1 ? args[demoIndex + 1] : null;

    const demoWrapper = await _setupDemoWrapper(replEngine, monitor, demoName);

    console.log('WebSocket server started successfully');

    return {nar: replEngine, replEngine, monitor, demoWrapper, app};
}

async function _initializeWebSocketMonitor(webSocketConfig) {
    const monitor = new WebSocketMonitor(webSocketConfig);
    await monitor.start();
    return monitor;
}

async function _setupSessionServerAdapter(replEngine, monitor) {
    const {SessionServerAdapter} = await import('../../agent/src/server/SessionServerAdapter.js');
    const serverAdapter = new SessionServerAdapter(replEngine, monitor);

    serverAdapter.registerWithWebSocketServer();

    monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
        const narInfo = {
            cycleCount: replEngine.cycleCount, // Agent extends NAR
            isRunning: replEngine.isRunning,
            config: replEngine.config,
            stats: serverAdapter.getStats ? serverAdapter.getStats() : replEngine.getStats(),
            reasoningState: replEngine.getReasoningState ? replEngine.getReasoningState() : null
        };

        monitorInstance._sendToClient(client, {
            type: 'narInstance',
            payload: narInfo
        });
    });

    return serverAdapter;
}

async function _setupDemoWrapper(nar, monitor, demoName) {
    const demoWrapper = new DemoWrapper();
    await demoWrapper.initialize(nar, monitor);

    await demoWrapper.sendDemoList();
    demoWrapper.runPeriodicMetricsUpdate();
    nar.start();

    if (demoName) {
        console.log(`Auto-starting demo: ${demoName}`);
        setTimeout(() => {
            demoWrapper.startDemo(demoName);
        }, 1000);
    }

    return demoWrapper;
}

function startUIServer(config) {
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

async function shutdownServices(webSocketServer) {
    if (webSocketServer.replEngine) {
        try {
            const stats = webSocketServer.replEngine.getStats();
            // Simplify stats for log readability
            const simpleStats = {
                cycleCount: stats.cycleCount,
                memory: {
                    concepts: stats.memoryStats?.conceptCount,
                    tasks: stats.taskManagerStats?.totalTasks
                },
                termLayer: stats.termLayerStats,
                streamReasoner: stats.streamReasonerStats
            };
            console.log('Final System Stats:', JSON.stringify(simpleStats, null, 2));
        } catch (e) {
            console.error('Error logging final stats:', e.message);
        }
    }

    const errors = [];

    if (webSocketServer.uiServer) {
        try {
            webSocketServer.uiServer.kill();
        } catch (e) {
            console.error('Error stopping UI server:', e.message);
        }
    }

    try {
        if (webSocketServer.app) {
            await webSocketServer.app.shutdown();
        }
    } catch (appError) {
        console.error('Error shutting down App:', appError.message);
        errors.push(appError);
    }

    try {
        if (webSocketServer.monitor) {
            await webSocketServer.monitor.stop();
        }
    } catch (monitorError) {
        console.error('Error stopping WebSocket monitor:', monitorError.message);
        errors.push(monitorError);
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
        const config = Config.parse(args); // Config.parse takes raw args (slice(2))

        // Check for --no-ui flag
        const startUI = !args.includes('--no-ui');

        webSocketServer = await startWebSocketServer(config);

        await setupGracefulShutdown(webSocketServer);

        if (startUI) {
            const uiServer = startUIServer(config);
            webSocketServer.uiServer = uiServer;
            console.log('Both servers are running. Press Ctrl+C to stop.');
        } else {
            console.log('WebSocket server is running (UI disabled). Press Ctrl+C to stop.');
        }

    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});
