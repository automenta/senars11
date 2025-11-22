import {WebSocketServer} from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import {parse} from '../core/parser/narsese.js';

export class Server {
    constructor(reasoner, port = 3000) {
        this.reasoner = reasoner;
        this.port = port;
        this.clients = new Set();

        this.httpServer = http.createServer(this._handleRequest.bind(this));
        this.wss = new WebSocketServer({server: this.httpServer});

        this._setupWebSocket();
        this._setupEventBridge();
    }

    start() {
        this.httpServer.listen(this.port, () => {
            console.log(`Server running at http://localhost:${this.port}`);
        });
    }

    _handleRequest(req, res) {
        // Serve static files from src-next/web
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './src-next/web/index.html';
        else filePath = './src-next/web' + req.url;

        const extname = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
        }[extname] || 'text/plain';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if(error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('File not found');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: '+error.code);
                }
            } else {
                res.writeHead(200, {'Content-Type': contentType});
                res.end(content, 'utf-8');
            }
        });
    }

    _setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            console.log('Client connected');

            // Send initial state/history if needed
            // ws.send(JSON.stringify({type: 'history', data: ...}));

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this._handleMessage(data, ws);
                } catch (e) {
                    console.error('Invalid JSON:', message);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('Client disconnected');
            });
        });
    }

    _handleMessage(data, ws) {
        if (data.type === 'input') {
            try {
                console.log('Received input:', data.content);
                const parsed = parse(data.content, {termFactory: this.reasoner.termFactory});
                this.reasoner.input(parsed);
                this.reasoner.run(10); // Auto-run for demo
            } catch (e) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: e.message
                }));
            }
        }
    }

    _setupEventBridge() {
        // Bridge EventBus -> WebSocket
        this.reasoner.eventBus.on('derivation', (data) => {
            this._broadcast({
                type: 'derivation',
                task: data.task.toString(), // Use toString for now
                term: data.task.term.name,
                source: data.task.stamp.derivations
            });
        });

        this.reasoner.eventBus.on('input', (data) => {
            this._broadcast({
                type: 'input_ack',
                task: data.task.toString()
            });
        });
    }

    _broadcast(msg) {
        const str = JSON.stringify(msg);
        for (const client of this.clients) {
            if (client.readyState === 1) { // OPEN
                client.send(str);
            }
        }
    }
}
