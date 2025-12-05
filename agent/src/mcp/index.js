/**
 * SeNARS MCP System - Main Entry Point
 */

import {MCPManager} from './MCPManager.js';
import {Client} from './Client.js';
import {Server} from './Server.js';

// Export core classes for direct usage
export {MCPManager, Client, Server};

/**
 * Factory function to create a configured MCP manager
 */
export async function createMCPManager(options = {}) {
    const manager = new MCPManager(options);
    await manager.initialize();
    return manager;
}

/**
 * Convenience function to connect as an MCP client using Stdio
 */
export async function connectMCPClient(command, args, options = {}) {
    const client = new Client({command, args, ...options});
    await client.connect();
    return client;
}

/**
 * Convenience function to setup an MCP server (Stdio)
 */
export async function setupMCPServer(options = {}) {
    const server = new Server(options);
    await server.start();
    return server;
}

/**
 * Main SeNARS MCP system class that provides the unified interface
 */
export class SeNARSMCPSystem {
    constructor(options = {}) {
        this.options = options;
        this.manager = null;
        this.mode = null; // 'client' or 'server'
    }

    /**
     * Initialize the SeNARS MCP system
     */
    async initialize(mode = 'client', options = {}) {
        this.mode = mode;
        this.options = {...this.options, ...options};

        this.manager = new MCPManager(this.options);
        await this.manager.initialize();

        return this;
    }

    /**
     * Connect as client to consume external services
     */
    async connectAsClient(command, args = [], options = {}) {
        if (!this.manager) throw new Error('SeNARS MCP System not initialized');
        return await this.manager.connectAsClient(command, args);
    }

    /**
     * Setup server to expose SeNARS services
     */
    async setupAsServer(options = {}) {
        if (!this.manager) throw new Error('SeNARS MCP System not initialized');
        return await this.manager.setupServer(options);
    }

    async callTool(toolName, input) {
        if (!this.manager) throw new Error('SeNARS MCP System not initialized');
        return await this.manager.callMCPTool(toolName, input);
    }
}

export default SeNARSMCPSystem;
