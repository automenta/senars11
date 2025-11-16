import {ReplMessageHandler} from './ReplMessageHandler.js';

export class WebRepl {
    constructor(engine, websocketServer) {
        this.engine = engine;
        this.websocketServer = websocketServer;
        this.sessions = new Map();
        this.messageHandler = new ReplMessageHandler(engine);
        this._setupEventListeners();
    }

    _setupEventListeners() {
        const engineEvents = [
            'engine.ready',
            'narsese.processed',
            'narsese.error',
            'engine.quit',
            'nar.cycle.step',
            'nar.cycle.running',
            'nar.cycle.stop',
            'engine.reset',
            'engine.save',
            'engine.load',
            'nar.trace.enable',
            'nar.trace.restore',
            'command.error'
        ];

        engineEvents.forEach(event => {
            this.engine.on(event, (data) => {
                this._broadcastToAllClients({
                    type: event,
                    payload: data
                });
            });
        });

        const commandEvents = ['help', 'status', 'memory', 'trace', 'reset', 'save', 'load', 'demo'];
        commandEvents.forEach(cmd => {
            this.engine.on(`command.${cmd}`, (data) => {
                this._broadcastToAllClients({
                    type: 'command.output',
                    payload: {command: cmd, result: data.result}
                });
            });
        });
    }

    async handleWebSocketMessage(client, message) {
        try {
            if (!message || typeof message !== 'object') {
                throw new Error('Invalid message: expected object');
            }

            const result = await this.messageHandler.processMessage(message);
            this._sendToClient(client, result);
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            this._sendToClient(client, {
                type: 'error',
                payload: {error: error.message}
            });
        }
    }

    _broadcastToAllClients(message) {
        const clients = this.websocketServer?.clients;
        if (!clients) return;

        const serializedMessage = JSON.stringify(message);

        for (const client of clients) {
            if (client.readyState === client.OPEN) {
                try {
                    client.send(serializedMessage);
                } catch (error) {
                    console.error('Error broadcasting to client:', error);
                }
            }
        }
    }

    _sendToClient(client, message) {
        if (client && typeof client.send === 'function' && client.readyState === client.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending to client:', error);
            }
        } else if (client && typeof client.send === 'function') {
            console.warn('Client not in OPEN state, readyState:', client.readyState);
        } else {
            console.debug('Would send to client (test mode):', message);
        }
    }

    registerWithWebSocketServer() {
        if (this.websocketServer) {
            this.websocketServer.attachReplMessageHandler(this.messageHandler);

            const supportedTypes = this.messageHandler.getSupportedMessageTypes();
            const allMessageTypes = [
                ...supportedTypes.messages,
                'reason/step',
                'narseseInput',
                'command.execute',
                ...['start', 'stop', 'step'].map(cmd => `control/${cmd}`)
            ];

            allMessageTypes.forEach(type => {
                this.websocketServer.registerClientMessageHandler(type, (message, client) =>
                    this.handleWebSocketMessage(client, message));
            });
        }
    }

    getStats() {
        return this.engine.getStats();
    }

    getBeliefs() {
        return this.engine.getBeliefs();
    }

    getHistory() {
        return this.engine.getHistory();
    }
}