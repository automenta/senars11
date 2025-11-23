import {EventEmitter} from 'events';
import {MESSAGE_TYPES} from '../util/MessageTypes.js';
import {AgentCommandRegistry, FunctionCommand, AgentCommand} from './commands/CommandBase.js';
import * as Commands from './commands/Commands.js';

export class ReplMessageHandler extends EventEmitter {
    constructor(engine) {
        super();

        if (!engine?.processInput) {
            throw new Error('ReplMessageHandler requires a valid engine with processInput method');
        }

        this.engine = engine;
        this.registry = new AgentCommandRegistry();

        // Attach registry to engine for HelpCommand and others
        this.engine.commandRegistry = this.registry;

        this.messageHandlers = new Map();

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
        this.messageHandlers.set('reason/step', this._handleGenericInput.bind(this, MESSAGE_TYPES.NARSESE_RESULT));
        this.messageHandlers.set('narseseInput', this._handleGenericInput.bind(this, MESSAGE_TYPES.NARSESE_RESULT));
        this.messageHandlers.set('agent/input', this._handleGenericInput.bind(this, MESSAGE_TYPES.AGENT_RESULT));
        this.messageHandlers.set('command.execute', this._handleCommandExecute.bind(this));

        const controlHandler = this._handleControlCommand.bind(this);
        ['control/start', 'control/stop', 'control/step'].forEach(type =>
            this.messageHandlers.set(type, controlHandler)
        );
    }

    _extractInput(message) {
        return message?.payload?.text ?? message?.payload?.input ?? message?.payload ?? message;
    }

    async processMessage(message) {
        if (!message || typeof message !== 'object') return {error: 'Invalid message: expected object'};

        try {
            const input = this._extractInput(message);
            const { type: messageType } = message;

            if (!messageType && typeof input === 'string') return await this.engine.processInput(input);

            // 1. Specific handlers from map
            if (this.messageHandlers.has(messageType)) {
                return await this.messageHandlers.get(messageType)(message);
            }

            // 2. Control commands prefix
            if (messageType?.startsWith('control/')) return await this._handleControlCommand(message);

            // 3. Direct commands prefix
            if (messageType?.startsWith('/')) {
                const [cmd, ...args] = messageType.slice(1).split(' ');
                return await this._handleCommand(cmd, ...args);
            }

            // 4. Registry commands
            if (messageType && this.registry.has(messageType)) {
                return await this._handleCommand(messageType);
            }

            // 5. Fallback
            if (typeof input === 'string' && input.trim()) return await this.engine.processInput(input);

            return {error: `Unknown message type: ${messageType ?? 'undefined'}`};
        } catch (error) {
            console.error('Error processing message:', error);
            this.emit('message.error', {message, error: error.message});
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    async _handleGenericInput(resultType, message) {
        try {
            const input = this._extractInput(message);
            if (typeof input !== 'string' || !input.trim()) {
                return {error: 'No input provided', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this.engine.processInput(input);
            return {
                type: resultType,
                payload: {input, result, success: !!result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error(`Error in ${resultType} handler:`, error);
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

}
