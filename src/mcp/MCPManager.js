import { Client } from '@modelcontextprotocol/sdk/client';
import { EventEmitter } from 'events';
import { Safety } from './Safety.js';
import { Adapter } from './Adapter.js';

/**
 * MCPManager: Core abstraction for managing both MCP client and server operations
 * Implements the dual-mode operations capability mentioned in the plan
 */
export class MCPManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = options;
    this.client = null;
    this.server = null;
    this.safety = new Safety();
    this.adapter = new Adapter();
    this.discoveredTools = new Map();
    this.isInitialized = false;
    
    // Track active connections and sessions
    this.connections = new Map();
    this.sessions = new Map();
  }

  /**
   * Initialize the MCP manager
   */
  async initialize() {
    try {
      // Validate safety configuration
      await this.safety.initialize(this.options.safety || {});
      
      // Set up any necessary infrastructure
      this.emit('initialized');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize MCPManager:', error);
      throw error;
    }
  }

  /**
   * Connect as an MCP client to consume external services
   */
  async connectAsClient(endpoint, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate connection parameters with safety layer
      const validatedOptions = await this.safety.validateClientOptions(options);
      
      // Create MCP client instance
      this.client = new Client({
        url: endpoint,
        ...validatedOptions
      });

      // Establish connection
      await this.client.connect();
      
      // Discover available tools from the server
      await this.discoverTools();
      
      // Store connection reference
      const connectionId = `client_${Date.now()}`;
      this.connections.set(connectionId, this.client);
      
      this.emit('clientConnected', { endpoint, connectionId });
      
      return connectionId;
    } catch (error) {
      console.error('Failed to connect as MCP client:', error);
      throw error;
    }
  }

  /**
   * Set up MCP server to expose SeNARS services
   */
  async setupServer(port, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Import server functionality dynamically to avoid circular dependencies
      const { Server } = await import('./Server.js');
      this.server = new Server({ port, ...options, safety: this.safety });
      
      await this.server.start();
      
      this.emit('serverStarted', { port });
      
      return this.server;
    } catch (error) {
      console.error('Failed to setup MCP server:', error);
      throw error;
    }
  }

  /**
   * Discover tools from connected MCP server
   */
  async discoverTools() {
    if (!this.client) {
      throw new Error('No client connected');
    }

    try {
      // In MCP, tools are typically discovered through the protocol
      // This would involve querying the MCP server for available resources/tools
      const tools = await this.client.listResources(); // Placeholder - actual method may vary
      
      for (const tool of tools) {
        this.discoveredTools.set(tool.name, tool);
      }
      
      this.emit('toolsDiscovered', { count: tools.length });
      return tools;
    } catch (error) {
      console.error('Failed to discover tools:', error);
      throw error;
    }
  }

  /**
   * Call an MCP tool either from a connected server or execute locally
   */
  async callMCPTool(toolName, input) {
    if (!this.isInitialized) {
      throw new Error('MCPManager not initialized');
    }

    try {
      // Validate input using safety layer
      const validatedInput = await this.safety.validateInput(toolName, input);
      
      // If we have a client and the tool exists on the remote server
      if (this.client && this.discoveredTools.has(toolName)) {
        // Call the remote tool
        const result = await this.client.callTool(toolName, validatedInput);
        const validatedOutput = await this.safety.validateOutput(toolName, result);
        
        this.emit('toolCalled', { toolName, result: validatedOutput });
        return validatedOutput;
      } 
      // Otherwise, if we have a server, we might expose local SeNARS tools
      else if (this.server) {
        // Attempt to call a local SeNARS tool exposed via MCP
        const result = await this.server.executeLocalTool(toolName, validatedInput);
        const validatedOutput = await this.safety.validateOutput(toolName, result);
        
        this.emit('toolCalled', { toolName, result: validatedOutput });
        return validatedOutput;
      } 
      else {
        throw new Error(`Tool "${toolName}" not available. No client connected or server running.`);
      }
    } catch (error) {
      console.error(`Failed to call MCP tool "${toolName}":`, error);
      throw error;
    }
  }

  /**
   * Get information about available tools
   */
  getAvailableTools() {
    const clientTools = Array.from(this.discoveredTools.keys());
    const serverTools = this.server ? this.server.getExposedTools() : [];
    
    return {
      clientTools,
      serverTools,
      allTools: [...clientTools, ...serverTools]
    };
  }

  /**
   * Close all connections and clean up resources
   */
  async shutdown() {
    try {
      // Close client connection if active
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      // Stop server if running
      if (this.server) {
        await this.server.stop();
        this.server = null;
      }
      
      // Clear connections and sessions
      this.connections.clear();
      this.sessions.clear();
      this.discoveredTools.clear();
      
      this.isInitialized = false;
      
      this.emit('shutdown');
    } catch (error) {
      console.error('Error during MCPManager shutdown:', error);
      throw error;
    }
  }
}