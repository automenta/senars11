import {WebSocketServer} from 'ws';
import {EventEmitter} from 'events';
import {ClientMessageHandlers} from './ClientMessageHandlers.js';
import {DEFAULT_CLIENT_CAPABILITIES, WEBSOCKET_CONFIG} from '../config/constants.js';
import {SessionManager} from '../session/SessionManager.js';

const DEFAULT_OPTIONS = Object.freeze({
    port: WEBSOCKET_CONFIG.defaultPort,
    host: WEBSOCKET_CONFIG.defaultHost,
    path: WEBSOCKET_CONFIG.defaultPath,
    maxConnections: WEBSOCKET_CONFIG.maxConnections,
    minBroadcastInterval: WEBSOCKET_CONFIG.minBroadcastInterval,
    messageBufferSize: WEBSOCKET_CONFIG.messageBufferSize,
    rateLimitWindowMs: WEBSOCKET_CONFIG.rateLimitWindowMs,
    maxMessagesPerWindow: WEBSOCKET_CONFIG.maxMessagesPerWindow
});

class WebSocketMonitor {
    constructor(options = {}) {
        this.port = options.port ?? DEFAULT_OPTIONS.port;
        this.host = options.host ?? DEFAULT_OPTIONS.host;
        this.path = options.path ?? DEFAULT_OPTIONS.path;
        this.maxConnections = options.maxConnections ?? DEFAULT_OPTIONS.maxConnections;
        this.eventFilter = options.eventFilter ?? null;

        this.clients = new Set();
        this.eventEmitter = new EventEmitter();
        this.server = null;
        this.clientMessageHandlers = new Map();

        // Initialize SessionManager
        this.sessionManager = new SessionManager(options.config || {});
        this.clientSessions = new Map(); // ws -> sessionId

        this.messageHandlers = new ClientMessageHandlers(this);

        this.metrics = this._initializeMetrics();
        this.clientRateLimiters = new Map();
        this.rateLimitWindowMs = options.rateLimitWindowMs ?? DEFAULT_OPTIONS.rateLimitWindowMs;
        this.maxMessagesPerWindow = options.maxMessagesPerWindow ?? DEFAULT_OPTIONS.maxMessagesPerWindow;
        this.messageBufferSize = options.messageBufferSize ?? DEFAULT_OPTIONS.messageBufferSize;

        this.clientCapabilities = new Map();

        // Add event buffer for batching
        this.eventBuffer = new Map(); // sessionId -> buffer array
    }

    _initializeMetrics() {
        return {
            startTime: Date.now(),
            messagesSent: 0,
            messagesReceived: 0,
            errorCount: 0,
            clientConnectionCount: 0,
            clientDisconnectionCount: 0,
            broadcastPerformance: [],
            clientMessageCounts: new Map(),
            lastWindowReset: Date.now()
        };
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = new WebSocketServer({
                port: this.port,
                host: this.host,
                path: this.path,
                maxPayload: WEBSOCKET_CONFIG.maxPayload
            });

            this.server.on('connection', async (ws, request) => {
                if (this.clients.size >= this.maxConnections) {
                    ws.close(1013, 'Server busy, too many connections');
                    return;
                }

                this.clients.add(ws);
                this.metrics.clientConnectionCount++;

                const clientId = this._generateClientId();
                ws.clientId = clientId;

                this.clientRateLimiters.set(clientId, {
                    messageCount: 0,
                    lastReset: Date.now()
                });

                // Default to a main session if none exists, or create one
                // For simplicity, we can create a default session 'main' immediately if not present
                let session = this.sessionManager.getSession('main');
                if (!session) {
                    session = await this.sessionManager.createSession('main');
                    this._listenToSession(session);
                }

                // Auto-connect client to 'main' session initially
                this.clientSessions.set(ws, 'main');
                session.addClient(ws);

                this._sendToClient(ws, {
                    type: 'connection',
                    data: {
                        clientId,
                        sessionId: 'main',
                        timestamp: Date.now(),
                        message: 'Connected to SeNARS monitoring server',
                        serverVersion: '10.0.0',
                        capabilities: DEFAULT_CLIENT_CAPABILITIES
                    }
                });

                ws.on('message', (data) => {
                    if (!this._isClientRateLimited(clientId)) {
                        this.metrics.messagesReceived++;
                        this._handleClientMessage(ws, data);
                    } else {
                        console.warn(`Rate limit exceeded for client: ${clientId}`);
                        this._sendToClient(ws, {
                            type: 'error',
                            message: 'Rate limit exceeded',
                            code: 429
                        });
                    }
                });

                ws.on('close', () => {
                    const sessionId = this.clientSessions.get(ws);
                    if (sessionId) {
                        const s = this.sessionManager.getSession(sessionId);
                        if (s) s.removeClient(ws);
                    }
                    this.clientSessions.delete(ws);
                    this.clients.delete(ws);
                    this.clientRateLimiters.delete(clientId);
                    this.clientCapabilities.delete(clientId);
                    this.metrics.clientDisconnectionCount++;
                    this.eventEmitter.emit('clientDisconnected', {clientId, timestamp: Date.now()});
                });

                this.eventEmitter.emit('clientConnected', {clientId, timestamp: Date.now()});
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                reject(error);
            });

            this.server.on('listening', () => {
                console.log(`WebSocket monitoring server started on ws://${this.host}:${this.port}${this.path}`);

                // Start batching interval to send accumulated events per session
                setInterval(() => {
                   this._processEventBuffers();
                }, 150);

                resolve();
            });
        });
    }

    _isClientRateLimited(clientId) {
        const now = Date.now();
        const clientLimiter = this.clientRateLimiters.get(clientId);

        if (!clientLimiter) return false;

        if (now - clientLimiter.lastReset > this.rateLimitWindowMs) {
            clientLimiter.messageCount = 0;
            clientLimiter.lastReset = now;
        }

        clientLimiter.messageCount++;
        return clientLimiter.messageCount > this.maxMessagesPerWindow;
    }

    _processEventBuffers() {
        for (const [sessionId, buffer] of this.eventBuffer.entries()) {
            if (buffer.length > 0) {
                const batch = [...buffer];
                this.eventBuffer.set(sessionId, []);

                const session = this.sessionManager.getSession(sessionId);
                if (session) {
                     for (const client of session.clients) {
                         if (client.readyState === client.OPEN) {
                             this._sendToClient(client, {
                                 type: 'eventBatch',
                                 data: batch,
                                 timestamp: Date.now(),
                                 sessionId
                             });
                             this.metrics.messagesSent++;
                         }
                     }
                }
            }
        }
    }

    async stop() {
        return new Promise((resolve) => {
            for (const client of this.clients) {
                client.close(1001, 'Server shutting down');
            }

            this.clients.clear();
            this.clientRateLimiters.clear();
            this.clientCapabilities.clear();

            this.sessionManager.destroyAll();

            if (this.server) {
                this.server.close(() => {
                    console.log('WebSocket monitoring server stopped');
                    resolve();
                });
            } else {
                console.log('WebSocket monitoring server stopped');
                resolve();
            }
        });
    }

    _sendToClient(client, message) {
        try {
            if (client && typeof client.send === 'function' && client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error sending message to client:', error);
        }
    }

    _generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _handleClientMessage(client, data) {
        try {
            const rawData = data.toString();
            if (!rawData.trim()) return;

            const message = JSON.parse(rawData);
            if (!message.type) {
                this._sendToClient(client, { type: 'error', message: 'Invalid message format' });
                return;
            }

            // Handle Session management messages
            if (message.type.startsWith('session/')) {
                this._handleSessionMessage(client, message);
                return;
            }

            this._routeMessage(client, message);
        } catch (error) {
            this.metrics.errorCount++;
            this._handleMessageError(client, error);
        }
    }

    async _handleSessionMessage(client, message) {
        const command = message.type.split('/')[1];

        try {
            if (command === 'create') {
                const session = await this.sessionManager.createSession(message.sessionId, message.config);
                this._listenToSession(session);
                this._sendToClient(client, { type: 'session/created', sessionId: session.id });
            } else if (command === 'list') {
                const sessions = this.sessionManager.listSessions();
                this._sendToClient(client, { type: 'session/list', sessions });
            } else if (command === 'connect') {
                const session = this.sessionManager.getSession(message.sessionId);
                if (session) {
                    // Remove from old session
                    const oldSessionId = this.clientSessions.get(client);
                    if (oldSessionId) {
                        const oldSession = this.sessionManager.getSession(oldSessionId);
                        if (oldSession) oldSession.removeClient(client);
                    }

                    this.clientSessions.set(client, session.id);
                    session.addClient(client);
                    this._sendToClient(client, { type: 'session/connected', sessionId: session.id });

                    // Send snapshot immediately
                    const nar = session.nar;
                    const concepts = Array.from(nar.memory.concepts.values());
                    const tasks = Array.from(nar.memory.tasks.values());
                    this._sendToClient(client, {
                        type: 'memorySnapshot',
                        payload: { concepts, tasks }
                    });
                } else {
                    this._sendToClient(client, { type: 'error', message: `Session ${message.sessionId} not found` });
                }
            }
        } catch (err) {
             this._sendToClient(client, { type: 'error', message: err.message });
        }
    }

    _routeMessage(client, message) {
        const sessionId = this.clientSessions.get(client);
        const session = this.sessionManager.getSession(sessionId);

        if (!session) {
             this._sendToClient(client, { type: 'error', message: 'No active session for client' });
             return;
        }

        // Route to specific handlers based on message type, injecting the session's NAR
        // This mimics the old behavior but scoped to the session's NAR

        if (message.type === 'narseseInput') {
             this.messageHandlers.handleNarseseInput(client, message, session.nar);
        } else if (message.type.startsWith('control/')) {
             this._handleControlMessage(client, message, session.nar);
        } else {
             // Handle other message types, potentially via ReplMessageHandler if registered
             if (this._replMessageHandler) {
                 // NOTE: This assumes ReplMessageHandler is stateless or global.
                 // For correct multi-session support, ReplMessageHandler needs to be session-aware
                 // or we need a separate one per session.
                 // As a stopgap, we can try to use it, but it might control the wrong engine if not careful.
                 // Since we registered WebRepl with a dummy engine pointing to main session,
                 // this will mostly control main session.
                 // TODO: Refactor WebRepl to be session-aware.

                 this._replMessageHandler.processMessage(message).then(result => {
                      this._sendToClient(client, result);
                 });
             }
        }
    }

    attachReplMessageHandler(handler) {
        this._replMessageHandler = handler;
    }

    registerClientMessageHandler(type, handler) {
        this.clientMessageHandlers.set(type, handler);
    }

    _handleControlMessage(client, message, nar) {
        const command = message.type.split('/')[1];
        if (!nar) return;

        switch (command) {
            case 'start':
                nar.start();
                this._sendToClient(client, { type: 'control/ack', payload: { command: 'start', status: 'started' } });
                break;
            case 'stop':
                nar.stop();
                this._sendToClient(client, { type: 'control/ack', payload: { command: 'stop', status: 'stopped' } });
                break;
            case 'step':
                nar.step();
                this._sendToClient(client, { type: 'control/ack', payload: { command: 'step', status: 'stepped' } });
                break;
            case 'reset':
                nar.reset();
                this._sendToClient(client, { type: 'control/ack', payload: { command: 'reset', status: 'reset' } });
                break;
             case 'refresh':
                const concepts = Array.from(nar.memory.concepts.values());
                const tasks = Array.from(nar.memory.tasks.values());
                this._sendToClient(client, {
                    type: 'memorySnapshot',
                    payload: {
                        concepts,
                        tasks,
                    }
                });
                break;
        }
    }

    _handleMessageError(client, error) {
         this._sendToClient(client, {type: 'error', message: error.message});
    }

    listenToNAR(nar) {
        // This method is legacy/compatibility.
        // In the new Session architecture, we use _listenToSession
        // But if called (e.g. by existing tests), we can wrap it in a session?
        // Or just ignore if SessionManager handles it.
        console.warn("listenToNAR called directly - this is deprecated in favor of SessionManager");
    }

    _listenToSession(session) {
        const nar = session.nar;
        if (!nar || !nar._eventBus) return;

        if (!this.eventBuffer.has(session.id)) {
            this.eventBuffer.set(session.id, []);
        }

        const buffer = this.eventBuffer.get(session.id);

        // Subscribe to NAR events
         for (const eventType of ['task.input', 'task.processed', 'cycle.start', 'cycle.complete', 'task.added', 'belief.added', 'question.answered', 'system.started', 'system.stopped', 'system.reset', 'system.loaded', 'reasoning.step', 'concept.created', 'task.completed', 'reasoning.derivation']) {
            nar._eventBus.on(eventType, (data, options = {}) => {
                buffer.push({
                    type: eventType,
                    data: data,
                    timestamp: Date.now(),
                    traceId: options.traceId
                });
            });
        }
    }

    // Add required method for WebRepl
    _broadcastToSubscribedClients(message) {
        // Broadcast to all clients in the relevant session
        // Since WebRepl usually sends system-wide messages (or main session messages)
        // We can iterate over all clients for now, or check subscription
        // For compatibility, let's broadcast to all connected clients

        for (const client of this.clients) {
            if (client.readyState === client.OPEN) {
                this._sendToClient(client, message);
                this.metrics.messagesSent++;
            }
        }
    }

    // ... other methods (getStats, etc) need updating to reflect multi-session reality, but keeping simple for now.
}

export {WebSocketMonitor};
