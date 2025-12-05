import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { EventEmitter } from 'events';
import { Safety } from './Safety.js';

export class Client extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.safety = new Safety(options.safety);
        this.client = new McpClient({
            name: "SeNARS-MCP-Client",
            version: "1.0.0"
        }, {
            capabilities: {
                sampling: {}
            }
        });
        this.transport = null;
    }

    async connect() {
        if (this.options.command) {
            this.transport = new StdioClientTransport({
                command: this.options.command,
                args: this.options.args || []
            });

            await this.client.connect(this.transport);

            // Log transport closure
            this.transport.onclose = () => {
                this.emit('disconnected');
            };

            this.emit('connected');
        } else {
            throw new Error("Client configuration requires 'command' for Stdio transport. HTTP/SSE not yet implemented in this version.");
        }
    }

    async discoverTools() {
        const result = await this.client.listTools();
        return result.tools;
    }

    async callTool(toolName, input) {
        const safeInput = this.safety.validateInput(input);
        return await this.client.callTool({
            name: toolName,
            arguments: safeInput
        });
    }

    async disconnect() {
        if (this.transport) {
            await this.transport.close();
        }
    }
}
