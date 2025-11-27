import {BaseTool} from '../tool/BaseTool.js';

/**
 * Proxy tool that delegates execution to an MCP client
 */
export class MCPProxyTool extends BaseTool {
    constructor(client, toolName, toolInfo) {
        super();
        this.client = client;
        this.toolName = toolName;
        this.toolInfo = toolInfo;
        this.name = toolName;
    }

    getDescription() {
        return this.toolInfo.description || `MCP Tool: ${this.toolName}`;
    }

    getParameterSchema() {
        return this.toolInfo.inputSchema || {};
    }

    getCategory() {
        return 'mcp';
    }

    async execute(params, context) {
        return await this.client.callTool(this.toolName, params);
    }
}
