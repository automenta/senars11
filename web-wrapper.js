#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketMonitor } from './src/server/WebSocketMonitor.js';
import { NAR } from './src/nar/NAR.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: { enabled: false },
        reasoningAboutReasoning: { enabled: true }
    },
    persistence: {
        defaultPath: './agent.json'
    },
    webSocket: {
        port: process.env.WS_PORT || 8080,
        host: process.env.WS_HOST || 'localhost',
        maxConnections: 20
    }
});

async function startWebSocketServer() {
    console.log('Starting WebSocket server...');
    
    const nar = new NAR(DEFAULT_CONFIG.nar);
    await nar.initialize();

    const monitor = new WebSocketMonitor(DEFAULT_CONFIG.webSocket);
    await monitor.start();
    nar.connectToWebSocketMonitor(monitor);

    // Start the NAR reasoning cycle
    nar.start();

    console.log('WebSocket server started successfully');
    
    return { nar, monitor };
}

function startViteDevServer() {
    console.log('Starting Vite dev server...');
    
    // Change to ui directory and run vite dev server
    const viteProcess = spawn('npx', ['vite', 'dev'], {
        cwd: join(__dirname, 'ui'),
        stdio: 'inherit', // This allows the Vite server to control the terminal properly
        env: { 
            ...process.env,
            // Pass WebSocket connection info to UI
            VITE_WS_HOST: DEFAULT_CONFIG.webSocket.host,
            VITE_WS_PORT: DEFAULT_CONFIG.webSocket.port,
            VITE_WS_PATH: DEFAULT_CONFIG.webSocket.path,
        }
    });

    viteProcess.on('error', (err) => {
        console.error('Error starting Vite server:', err);
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

async function setupGracefulShutdown(webSocketServer) {
    const shutdown = async () => {
        console.log('\nShutting down gracefully...');
        
        // Save NAR state
        try {
            const state = webSocketServer.nar.serialize();
            // Save to default path
            const fs = await import('fs');
            await fs.promises.writeFile(DEFAULT_CONFIG.persistence.defaultPath, JSON.stringify(state, null, 2));
            console.log('Current state saved to agent.json');
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
        
        console.log('Servers stopped successfully');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
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
        // Start WebSocket server
        webSocketServer = await startWebSocketServer();
        
        // Set up graceful shutdown
        await setupGracefulShutdown({
            nar: webSocketServer.nar,
            monitor: webSocketServer.monitor
        });
        
        // Start Vite dev server
        const viteProcess = startViteDevServer();
        
        // Store the websocket server info for shutdown
        webSocketServer.viteProcess = viteProcess;
        
        console.log('Both servers are running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});