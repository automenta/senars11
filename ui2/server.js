import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReplEngine } from '../src/repl/ReplEngine.js';
import { WebSocketMonitor } from '../src/server/WebSocketMonitor.js';
import { WebRepl } from '../src/repl/WebRepl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const HTTP_PORT = 8080;
const WS_PORT = 8081;

// Create HTTP server to serve static files
const server = http.createServer((req, res) => {
    let filePath = req.url;

    // Default to index.html if requesting the root
    if (filePath === '/' || filePath === '/index.html') {
        filePath = './index.html';
    }

    // If the path doesn't have an extension, assume it's HTML
    if (!path.extname(filePath)) {
        filePath += '.html';
    }

    const fullPath = path.join(__dirname, filePath);

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            // Set content type based on file extension
            let contentType = 'text/html';
            if (fullPath.endsWith('.js')) {
                contentType = 'application/javascript';
            } else if (fullPath.endsWith('.css')) {
                contentType = 'text/css';
            } else if (fullPath.endsWith('.json')) {
                contentType = 'application/json';
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

async function startBackend() {
    console.log(`Starting SeNARS Backend...`);

    const config = {
        nar: {
            lm: { enabled: false },
            reasoningAboutReasoning: { enabled: true }
        },
        webSocket: {
            port: WS_PORT,
            host: '0.0.0.0',
            maxConnections: 20
        }
    };

    // Initialize ReplEngine
    const replEngine = new ReplEngine(config);
    await replEngine.initialize();

    // Initialize WebSocketMonitor
    const monitor = new WebSocketMonitor(config.webSocket);
    await monitor.start();
    replEngine.nar.connectToWebSocketMonitor(monitor);

    // Initialize WebRepl
    const webRepl = new WebRepl(replEngine, monitor);
    webRepl.registerWithWebSocketServer();

    // Register NAR instance handler
    monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
        const narInfo = {
            cycleCount: replEngine.nar.cycleCount,
            isRunning: replEngine.nar.isRunning,
            config: replEngine.nar.config.toJSON(),
            stats: webRepl.getStats ? webRepl.getStats() : replEngine.getStats(),
            reasoningState: replEngine.nar.getReasoningState ? replEngine.nar.getReasoningState() : null
        };

        monitorInstance._sendToClient(client, {
            type: 'narInstance',
            payload: narInfo
        });
    });

    // Start NAR
    replEngine.nar.start();
    console.log(`SeNARS Backend started. WebSocket on port ${WS_PORT}`);
}

// Start servers
server.listen(HTTP_PORT, () => {
    console.log(`UI Server running at http://localhost:${HTTP_PORT}`);
    startBackend().catch(err => {
        console.error('Failed to start backend:', err);
    });
});