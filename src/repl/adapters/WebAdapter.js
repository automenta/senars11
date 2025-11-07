import { FormattingUtils } from '../utils/FormattingUtils.js';

export class WebAdapter {
    constructor(engine, websocketServer) {
        this.engine = engine;
        this.websocketServer = websocketServer;
        this.sessions = new Map();
        this._setupEventListeners();
    }

    _setupEventListeners() {
        const eventHandlers = {
            'engine.ready': (data) => this._broadcastToAllClients({ type: 'engine.ready', payload: data }),
            'narsese.processed': (data) => this._broadcastToAllClients({ type: 'narsese.processed', payload: data }),
            'narsese.error': (data) => this._broadcastToAllClients({ type: 'narsese.error', payload: data }),
            'engine.quit': () => this._broadcastToAllClients({ type: 'engine.quit', payload: {} }),
            'nar.cycle.step': (data) => this._broadcastToAllClients({ type: 'nar.cycle.step', payload: data }),
            'nar.cycle.running': (data) => this._broadcastToAllClients({ type: 'nar.cycle.running', payload: data }),
            'nar.cycle.stop': () => this._broadcastToAllClients({ type: 'nar.cycle.stop', payload: {} }),
            'engine.reset': () => this._broadcastToAllClients({ type: 'engine.reset', payload: {} }),
            'engine.save': (data) => this._broadcastToAllClients({ type: 'engine.save', payload: data }),
            'engine.load': (data) => this._broadcastToAllClients({ type: 'engine.load', payload: data }),
            'nar.trace.enable': (data) => this._broadcastToAllClients({ type: 'nar.trace.enable', payload: data }),
            'nar.trace.restore': (data) => this._broadcastToAllClients({ type: 'nar.trace.restore', payload: data })
        };

        // Register handlers for commands that broadcast command output
        ['help', 'status', 'memory', 'trace', 'reset', 'save', 'load', 'demo'].forEach(cmd => {
            eventHandlers[`command.${cmd}`] = (data) => this._broadcastToAllClients({ 
                type: 'command.output', 
                payload: { command: cmd, result: data.result } 
            });
        });

        // Register error handler
        eventHandlers['command.error'] = (data) => this._broadcastToAllClients({ 
            type: 'command.error', 
            payload: { command: data.command, error: data.error } 
        });

        Object.entries(eventHandlers).forEach(([event, handler]) => this.engine.on(event, handler));
    }

    async handleWebSocketMessage(client, message) {
        try {
            if (message.type === 'reason/step' || message.type === 'narseseInput') {
                const input = message.payload?.text ?? message.payload?.input ?? message.payload ?? '';
                const result = await this.engine.processInput(input);
                
                this._sendToClient(client, {
                    type: 'narsese.result',
                    payload: { input, result, success: !!result }
                });
            }
            else if (message.type.startsWith('control/')) {
                const command = message.type.split('/')[1];
                const cmdMap = { 'start': 'run', 'stop': 'stop', 'step': 'next' };
                const result = cmdMap[command] 
                    ? await this.engine.executeCommand(cmdMap[command])
                    : `Unknown control command: ${command}`;
                
                this._sendToClient(client, { type: 'control.result', payload: { command, result } });
            }
            else if (message.type === 'command.execute') {
                const cmd = message.payload?.command;
                const args = message.payload?.args ?? [];
                const result = await this.engine.executeCommand(cmd, ...args);
                
                this._sendToClient(client, {
                    type: 'command.result',
                    payload: { command: cmd, args, result }
                });
            }
            else if (message.type?.startsWith('/')) {
                const [cmd, ...args] = message.type.slice(1).split(' ');
                const result = await this.engine.executeCommand(cmd, ...args);
                
                this._sendToClient(client, {
                    type: 'command.result',
                    payload: { command: cmd, args, result }
                });
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            this._sendToClient(client, { type: 'error', payload: { error: error.message } });
        }
    }

    _broadcastToAllClients(message) {
        if (this.websocketServer?.clients) {
            for (const client of this.websocketServer.clients) {
                if (client.readyState === client.OPEN) {
                    try {
                        client.send(JSON.stringify(message));
                    } catch (error) {
                        console.error('Error broadcasting to client:', error);
                    }
                }
            }
        }
    }

    _sendToClient(client, message) {
        if (client?.readyState === client.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending to client:', error);
            }
        }
    }

    registerWithWebSocketServer() {
        if (this.websocketServer) {
            const handlers = ['reason/step', 'narseseInput', 'command.execute', 'control/start', 'control/stop', 'control/step'];
            handlers.forEach(type => this.websocketServer.registerClientMessageHandler(type, (message, client) => this.handleWebSocketMessage(client, message)));
        }
    }

    getStats() { return this.engine.getStats(); }
    getBeliefs() { return this.engine.getBeliefs(); }
    getHistory() { return this.engine.getHistory(); }
}