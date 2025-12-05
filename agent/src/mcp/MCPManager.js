import {EventEmitter} from 'events';
import {Client} from './Client.js';
import {Server} from './Server.js';

export class MCPManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.client = null;
        this.server = null;
    }

    async initialize() {
        return true;
    }

    async connectAsClient(command, args = []) {
        this.client = new Client({ command, args });
        await this.client.connect();
        const tools = await this.client.discoverTools();
        this.emit('clientConnected', { tools });
        return this.client;
    }

    async setupServer(options = {}) {
        this.server = new Server(options);
        return this.server;
    }

    async callMCPTool(toolName, input) {
        if (this.client) {
            return await this.client.callTool(toolName, input);
        }
        throw new Error("No client connected.");
    }

    async shutdown() {
        if (this.client) {
            await this.client.disconnect();
        }
        if (this.server) {
            await this.server.stop();
        }
    }
}
