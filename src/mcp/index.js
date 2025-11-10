/**
 * SeNARS MCP System - Main Entry Point
 */

import { MCPManager } from './MCPManager.js';
import { Client } from './Client.js';
import { Server } from './Server.js';
import { Safety } from './Safety.js';
import { Adapter } from './Adapter.js';

// Export core classes for direct usage
export { MCPManager, Client, Server, Safety, Adapter };

/**
 * Factory function to create a configured MCP manager
 */
export async function createMCPManager(options = {}) {
  const manager = new MCPManager(options);
  await manager.initialize();
  return manager;
}

/**
 * Convenience function to connect as an MCP client
 */
export async function connectMCPClient(endpoint, options = {}) {
  const client = new Client({ endpoint, ...options });
  await client.connect();
  return client;
}

/**
 * Convenience function to setup an MCP server
 */
export async function setupMCPServer(port, options = {}) {
  const server = new Server({ port, ...options });
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
    this.mode = null; // 'client', 'server', or 'dual'
  }

  /**
   * Initialize the SeNARS MCP system
   */
  async initialize(mode = 'dual', options = {}) {
    this.mode = mode;
    this.options = { ...this.options, ...options };

    this.manager = new MCPManager(this.options);
    await this.manager.initialize();

    if (mode === 'client' || mode === 'dual') {
      console.log('SeNARS MCP System initialized in client mode');
    }

    if (mode === 'server' || mode === 'dual') {
      console.log('SeNARS MCP System initialized in server mode');
    }

    return this;
  }

  /**
   * Connect as client to consume external services
   */
  async connectAsClient(endpoint, options = {}) {
    if (!this.manager) {
      throw new Error('SeNARS MCP System not initialized');
    }

    if (this.mode !== 'client' && this.mode !== 'dual') {
      throw new Error('SeNARS MCP System not configured for client mode');
    }

    return await this.manager.connectAsClient(endpoint, options);
  }

  /**
   * Setup server to expose SeNARS services
   */
  async setupAsServer(port, options = {}) {
    if (!this.manager) {
      throw new Error('SeNARS MCP System not initialized');
    }

    if (this.mode !== 'server' && this.mode !== 'dual') {
      throw new Error('SeNARS MCP System not configured for server mode');
    }

    return await this.manager.setupServer(port, options);
  }

  /**
   * Call an MCP tool (either remote or local)
   */
  async callTool(toolName, input) {
    if (!this.manager) {
      throw new Error('SeNARS MCP System not initialized');
    }

    return await this.manager.callMCPTool(toolName, input);
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    if (!this.manager) {
      throw new Error('SeNARS MCP System not initialized');
    }

    return this.manager.getAvailableTools();
  }

  /**
   * Execute code in code execution mode
   */
  async executeCode(code, context = {}) {
    if (!this.manager?.client) {
      throw new Error('Code execution requires an active client connection');
    }

    return await this.manager.client.executeCode(code, context);
  }

  /**
   * Shutdown the MCP system
   */
  async shutdown() {
    if (this.manager) {
      await this.manager.shutdown();
      this.manager = null;
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    if (!this.manager) {
      return { initialized: false, mode: this.mode };
    }

    return {
      initialized: true,
      mode: this.mode,
      clientConnected: !!this.manager.client,
      serverRunning: !!this.manager.server,
      availableTools: this.getAvailableTools()
    };
  }
}

// Export a default instance for convenience
export default SeNARSMCPSystem;

/**
 * Initialize and run SeNARS MCP system with specific configuration
 */
export async function runSeNARSMCP(config) {
  const system = new SeNARSMCPSystem(config);
  await system.initialize(config.mode ?? 'dual', config.options ?? {});

  // Setup event listeners for monitoring
  if (system.manager) {
    system.manager.on('initialized', () => console.log('MCP System initialized'));
    system.manager.on('clientConnected', (data) => console.log('Client connected:', data));
    system.manager.on('serverStarted', (data) => console.log('Server started:', data));
    system.manager.on('toolCalled', (data) => console.log('Tool called:', data));
    system.manager.on('shutdown', () => console.log('MCP System shutdown'));
  }

  return system;
}