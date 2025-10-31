#!/usr/bin/env node

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {WebSocketMonitor} from './src/server/WebSocketMonitor.js';
import {NAR} from './src/nar/NAR.js';
import {DemoWrapper} from './src/demo/DemoWrapper.js';
import {config, getConfig, DEFAULT_CONFIG as SHARED_CONFIG} from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse arguments to support flexible server configuration
const args = process.argv.slice(2);

// Base default config with nar settings which is specific to this app
const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true}
    },
    ...getConfig()  // Include the shared config
});

/**
 * Parse command line arguments to support flexible configuration
 */
function parseArgs(args) {
    let appConfig = {...getConfig()};
    
    // Keep the NAR configuration separate since it's not in the shared config
    const narConfig = {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true}
    };
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--ws-port' && args[i + 1]) {
            appConfig = {
                ...appConfig,
                webSocket: {
                    ...appConfig.webSocket,
                    port: parseInt(args[i + 1])
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--port' && args[i + 1]) {
            appConfig = {
                ...appConfig,
                ui: {
                    ...appConfig.ui,
                    port: parseInt(args[i + 1])
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--host' && args[i + 1]) {
            appConfig = {
                ...appConfig,
                webSocket: {
                    ...appConfig.webSocket,
                    host: args[i + 1]
                }
            };
            i++; // Skip next argument since it's the value
        }
    }
    
    // Return combined config with both app and NAR settings
    return {
        nar: narConfig,
        persistence: appConfig.persistence,
        webSocket: appConfig.webSocket,
        ui: appConfig.ui
    };
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
function startViteDevServer(serverConfig) {
    console.log(`Starting Vite dev server on port ${serverConfig.ui.port}...`);

    // Change to ui directory and run vite dev server
    const viteProcess = spawn('npx', ['vite', 'dev', '--port', serverConfig.ui.port.toString()], {
        cwd: join(__dirname, 'ui'),
        stdio: 'inherit', // This allows the Vite server to control the terminal properly
        env: {
            ...process.env,
            // Pass WebSocket connection info to UI
            VITE_WS_HOST: serverConfig.webSocket.host,
            VITE_WS_PORT: serverConfig.webSocket.port.toString(),
            VITE_WS_PATH: serverConfig.webSocket.path,
            PORT: serverConfig.ui.port.toString() // Also set PORT for compatibility
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
 * Setup graceful shutdown handlers
 */
async function setupGracefulShutdown(webSocketServer) {
    const shutdown = async () => {
        console.log('\nShutting down gracefully...');

        // Save NAR state
        try {
            const state = webSocketServer.nar.serialize();
            // Save to default path from config
            const fs = await import('fs');
            await fs.promises.writeFile(webSocketServer.persistence.defaultPath || './agent.json', JSON.stringify(state, null, 2));
            console.log('Current state saved to agent.json');
        } catch (saveError) {
            console.error('Error saving state on shutdown:', saveError?.message || saveError);
        }

        // Stop WebSocket server
        if (webSocketServer.monitor) {
            await webSocketServer.monitor.stop();
        }

        if (webSocketServer.nar) {
            webSocketServer.nar.stop();
        }

        console.log('Servers stopped successfully');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error?.message || error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason?.message || reason);
        process.exit(1);
    });
}

async function main() {
    let webSocketServer;

    try {
        // Parse command line arguments for flexible configuration
        const serverConfig = parseArgs(args);
        
        // Start WebSocket server with the parsed config
        webSocketServer = await startWebSocketServer(serverConfig);

        // Set up graceful shutdown
        await setupGracefulShutdown(webSocketServer);

        // Start Vite dev server
        const viteProcess = startViteDevServer(serverConfig);

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