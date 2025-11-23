import {EventEmitter} from 'events';
import {MESSAGE_TYPES} from '../util/MessageTypes.js';
import {AgentCommandRegistry, FunctionCommand, AgentCommand} from './commands/CommandBase.js';
import * as Commands from './commands/Commands.js';

export class ReplMessageHandler extends EventEmitter {
    constructor(engine) {
        super();

        if (!engine || typeof engine.processInput !== 'function') {
            throw new Error('ReplMessageHandler requires a valid engine with processInput method');
        }

        this.engine = engine;
        this.registry = new AgentCommandRegistry();

        // Attach registry to engine for HelpCommand and others
        this.engine.commandRegistry = this.registry;

        this.messageHandlers = new Map();
        this.handlerCache = new Map();

        this._setupCommands();
        this._setupDefaultMessageHandlers();
    }

    _setupCommands() {
        // Register all standard commands
        Object.values(Commands).forEach(CmdClass => {
            if (typeof CmdClass === 'function' &&
                CmdClass.prototype instanceof AgentCommand &&
                CmdClass !== AgentCommand &&
                CmdClass !== FunctionCommand) {
                try {
                    this.registry.register(new CmdClass());
                } catch (error) {
                    console.warn(`Failed to register command ${CmdClass.name}: ${error.message}`);
                }
            }
        });
    }

    _setupDefaultMessageHandlers() {
        this.messageHandlers.set('reason/step', this._handleReasonStep.bind(this));
        this.messageHandlers.set('narseseInput', this._handleNarseseInput.bind(this));
        this.messageHandlers.set('command.execute', this._handleCommandExecute.bind(this));
        this.messageHandlers.set('control/start', this._handleControlCommand.bind(this));
        this.messageHandlers.set('control/stop', this._handleControlCommand.bind(this));
        this.messageHandlers.set('control/step', this._handleControlCommand.bind(this));
        this.messageHandlers.set('agent/input', this._handleAgentInput.bind(this));
    }

    async processMessage(message) {
        if (!message || typeof message !== 'object') {
            return {error: 'Invalid message: expected object'};
        }

        try {
            const input = message?.payload?.text ?? message?.payload?.input ?? message?.payload ?? message;
            const messageType = message?.type;

            // Early return for common cases
            if (!messageType && typeof input === 'string') {
                return await this.engine.processInput(input);
            }

            switch (messageType) {
                case 'narseseInput':
                case 'reason/step':
                    return await this._handleNarseseInput(message);
                case 'command.execute':
                    return await this._handleCommandExecute(message);
                case 'agent/input':
                    return await this._handleAgentInput(message);
            }

            // Handle control commands
            if (messageType?.startsWith('control/')) {
                return await this._handleControlCommand(message);
            }

            // Handle direct commands
            if (messageType?.startsWith('/')) {
                const [cmd, ...args] = messageType.slice(1).split(' ');
                return await this._handleCommand(cmd, ...args);
            }

            // Try cached handler
            if (messageType) {
                if (this.handlerCache.has(messageType)) {
                    return await this.handlerCache.get(messageType)(message);
                }

                const handler = this.messageHandlers.get(messageType);
                if (handler) {
                    this.handlerCache.set(messageType, handler);
                    return await handler(message);
                }

                // Check if it's a command in registry?
                if (this.registry.has(messageType)) {
                     return await this._handleCommand(messageType);
                }
            }

            // Fallback to direct input
            if (typeof input === 'string' && input.trim()) {
                return await this.engine.processInput(input);
            }

            return {error: `Unknown message type: ${messageType || 'undefined'}`};
        } catch (error) {
            console.error('Error processing message:', error);
            this.emit('message.error', {message, error: error.message});
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    async _handleAgentInput(message) {
        try {
            const input = message?.payload?.text ?? message?.payload?.input ?? message?.payload;
            if (typeof input !== 'string' || !input.trim()) {
                return {error: 'No input provided', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this.engine.processInput(input);
            return {
                type: MESSAGE_TYPES.AGENT_RESULT,
                payload: {input, result, success: true, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in agent input handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    async _handleNarseseInput(message) {
        try {
            const input = message?.payload?.text ?? message?.payload?.input ?? message?.payload ?? message;
            if (typeof input !== 'string' || !input.trim()) {
                return {error: 'No input provided', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this.engine.processInput(input);
            return {
                type: MESSAGE_TYPES.NARSESE_RESULT,
                payload: {input, result, success: !!result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in narsese input handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    async _handleControlCommand(message) {
        try {
            const command = message?.type?.split('/')[1];
            if (!command) {
                return {error: 'No control command specified', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this._handleCommand(command);

            return {
                type: MESSAGE_TYPES.CONTROL_RESULT,
                payload: {command, result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in control command handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    async _handleCommandExecute(message) {
        try {
            const cmd = message?.payload?.command;
            const args = message?.payload?.args ?? [];

            if (!cmd) {
                return {error: 'No command specified', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this._handleCommand(cmd, ...args);

            return {
                type: MESSAGE_TYPES.COMMAND_RESULT,
                payload: {command: cmd, args, result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in command execute handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    async _handleReasonStep(message) {
        return await this._handleNarseseInput(message);
    }

    async _handleCommand(cmd, ...args) {
        try {
            // Check registry
            if (this.registry.has(cmd)) {
                return await this.registry.execute(cmd, this.engine, ...args);
            }

            // Fallback to engine.executeCommand if available
            if (this.engine.executeCommand && typeof this.engine.executeCommand === 'function') {
                return await this.engine.executeCommand(cmd, ...args);
            }

            return `Unknown command: ${cmd}`;
        } catch (error) {
            console.error(`Error executing command ${cmd}:`, error);
            const errorMsg = `❌ Error executing command: ${error.message}`;
            this.emit('command.error', {command: cmd, args, error: error.message});
            return errorMsg;
        }
    }

    registerCommandHandler(name, handler) {
        if (typeof name !== 'string' || name.trim() === '') throw new Error('Command name must be a non-empty string');
        if (typeof handler !== 'function') throw new Error('Command handler must be a function');

        this.registry.register(new FunctionCommand(name, handler));
    }

    registerMessageHandler(type, handler) {
        if (typeof type !== 'string' || type.trim() === '') throw new Error('Message type must be a non-empty string');
        if (typeof handler !== 'function') throw new Error('Message handler must be a function');
        this.messageHandlers.set(type, handler);
    }

    getSupportedMessageTypes() {
        return {
            commands: this.registry.getAll().map(c => c.name),
            messages: Array.from(this.messageHandlers.keys()),
            types: MESSAGE_TYPES
        };
    }

    clearHandlerCache() {
        this.handlerCache.clear();
    }
}
