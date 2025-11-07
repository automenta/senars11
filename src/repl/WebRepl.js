const CMD_HANDLERS = ['help', 'status', 'memory', 'trace', 'reset', 'save', 'load', 'demo'];
const CMD_MAP = { 'start': 'run', 'stop': 'stop', 'step': 'next' };
const WS_HANDLERS = ['reason/step', 'narseseInput', 'command.execute', 'control/start', 'control/stop', 'control/step'];
const MESSAGE_TYPES = {
    ENGINE_READY: 'engine.ready',
    NARSESE_PROCESSED: 'narsese.processed',
    NARSESE_ERROR: 'narsese.error',
    ENGINE_QUIT: 'engine.quit',
    NAR_CYCLE_STEP: 'nar.cycle.step',
    NAR_CYCLE_RUNNING: 'nar.cycle.running',
    NAR_CYCLE_STOP: 'nar.cycle.stop',
    ENGINE_RESET: 'engine.reset',
    ENGINE_SAVE: 'engine.save',
    ENGINE_LOAD: 'engine.load',
    NAR_TRACE_ENABLE: 'nar.trace.enable',
    NAR_TRACE_RESTORE: 'nar.trace.restore',
    COMMAND_ERROR: 'command.error',
    NARSESE_RESULT: 'narsese.result',
    CONTROL_RESULT: 'control.result',
    COMMAND_RESULT: 'command.result',
    ERROR: 'error',
    COMMAND_OUTPUT: 'command.output'
};
const PAYLOAD_TYPES = {
    REASON_STEP: 'reason/step',
    NARSESE_INPUT: 'narseseInput',
    COMMAND_EXECUTE: 'command.execute'
};

export class WebRepl {
    constructor(engine, websocketServer) {
        this.engine = engine;
        this.websocketServer = websocketServer;
        this.sessions = new Map();
        this._setupEventListeners();
    }

    _setupEventListeners() {
        const eventHandlers = {
            'engine.ready': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.ENGINE_READY, payload: data }),
            'narsese.processed': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.NARSESE_PROCESSED, payload: data }),
            'narsese.error': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.NARSESE_ERROR, payload: data }),
            'engine.quit': () => this._broadcastToAllClients({ type: MESSAGE_TYPES.ENGINE_QUIT, payload: {} }),
            'nar.cycle.step': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.NAR_CYCLE_STEP, payload: data }),
            'nar.cycle.running': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.NAR_CYCLE_RUNNING, payload: data }),
            'nar.cycle.stop': () => this._broadcastToAllClients({ type: MESSAGE_TYPES.NAR_CYCLE_STOP, payload: {} }),
            'engine.reset': () => this._broadcastToAllClients({ type: MESSAGE_TYPES.ENGINE_RESET, payload: {} }),
            'engine.save': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.ENGINE_SAVE, payload: data }),
            'engine.load': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.ENGINE_LOAD, payload: data }),
            'nar.trace.enable': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.NAR_TRACE_ENABLE, payload: data }),
            'nar.trace.restore': (data) => this._broadcastToAllClients({ type: MESSAGE_TYPES.NAR_TRACE_RESTORE, payload: data }),
            'command.error': (data) => this._broadcastToAllClients({ 
                type: 'command.error', 
                payload: { command: data.command, error: data.error } 
            })
        };

        CMD_HANDLERS.forEach(cmd => {
            eventHandlers[`command.${cmd}`] = (data) => this._broadcastToAllClients({ 
                type: 'command.output', 
                payload: { command: cmd, result: data.result } 
            });
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
                const result = CMD_MAP[command] 
                    ? await this.engine.executeCommand(CMD_MAP[command])
                    : `Unknown control command: ${command}`;
                
                this._sendToClient(client, { type: MESSAGE_TYPES.CONTROL_RESULT, payload: { command, result } });
            }
            else if (message.type === 'command.execute') {
                const cmd = message.payload?.command;
                const args = message.payload?.args ?? [];
                const result = await this.engine.executeCommand(cmd, ...args);
                
                this._sendToClient(client, {
                    type: MESSAGE_TYPES.COMMAND_RESULT,
                    payload: { command: cmd, args, result }
                });
            }
            else if (message.type?.startsWith('/')) {
                const [cmd, ...args] = message.type.slice(1).split(' ');
                const result = await this.engine.executeCommand(cmd, ...args);
                
                this._sendToClient(client, {
                    type: MESSAGE_TYPES.COMMAND_RESULT,
                    payload: { command: cmd, args, result }
                });
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            this._sendToClient(client, { type: MESSAGE_TYPES.ERROR, payload: { error: error.message } });
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
            WS_HANDLERS.forEach(type => 
                this.websocketServer.registerClientMessageHandler(type, (message, client) => 
                    this.handleWebSocketMessage(client, message)));
        }
    }

    getStats() { return this.engine.getStats(); }
    getBeliefs() { return this.engine.getBeliefs(); }
    getHistory() { return this.engine.getHistory(); }
}