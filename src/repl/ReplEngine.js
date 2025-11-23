import {App} from '../app/App.js';
import {ReplMessageHandler} from './ReplMessageHandler.js';

export class ReplEngine {
    constructor(config = {}) {
        this.app = new App(config);
        this.agent = null;
        this.messageHandler = null;
    }

    async initialize() {
        this.agent = await this.app.start({startAgent: false});
        this.messageHandler = new ReplMessageHandler(this.agent);
        return this.agent;
    }

    async processNarsese(input) {
        if (!this.agent) throw new Error("Engine not initialized");
        const result = await this.messageHandler.processMessage({
            type: 'narseseInput',
            payload: { input }
        });
        return result?.payload?.result || result;
    }

    async processInput(input) {
        return this.processNarsese(input);
    }

    async executeCommand(command, ...args) {
        if (!this.agent) throw new Error("Engine not initialized");

        let cmdStr = command;
        if (!cmdStr.startsWith('/')) cmdStr = '/' + cmdStr;
        if (args.length > 0) cmdStr += ' ' + args.join(' ');

        const result = await this.messageHandler.processMessage({ type: cmdStr });
        return result?.payload?.result || result;
    }

    getStats() {
        if (!this.agent) return {};
        return this.agent.getStats();
    }

    getBeliefs() {
        if (!this.agent) return [];
        return this.agent.getBeliefs();
    }

    async shutdown() {
        await this.app.shutdown();
    }
}
