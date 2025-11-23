import {ReplMessageHandler} from './ReplMessageHandler.js';

export class ReplCommonInterface {
    constructor(engine) {
        if (!engine?.processInput) {
            throw new Error('ReplCommonInterface requires a valid engine with processInput method');
        }

        this.engine = engine;
        this.messageHandler = new ReplMessageHandler(engine);
    }

    async processInput(input) {
        return this.messageHandler.processMessage({
            type: 'narseseInput',
            payload: {input}
        });
    }

    async executeCommand(command, ...args) {
        return this.messageHandler.processMessage({
            type: 'command.execute',
            payload: {command, args}
        });
    }

    async executeControlCommand(command) {
        return this.messageHandler.processMessage({
            type: `control/${command}`,
            payload: {}
        });
    }

    getEngine() {
        return this.engine;
    }

    getMessageHandler() {
        return this.messageHandler;
    }

    async processMessage(message) {
        return await this.messageHandler.processMessage(message);
    }

    registerCommandHandler(name, handler) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('Command name must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Command handler must be a function');
        }
        this.messageHandler.registerCommandHandler(name, handler);
    }

    registerMessageHandler(type, handler) {
        if (typeof type !== 'string' || type.trim() === '') {
            throw new Error('Message type must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Message handler must be a function');
        }
        this.messageHandler.registerMessageHandler(type, handler);
    }

    async shutdown() {
        this.messageHandler.removeAllListeners();
    }
}