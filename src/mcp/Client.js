import { EventEmitter } from 'events';
import { Adapter } from './Adapter.js';
import { Safety } from './Safety.js';
// Node.js 18+ has fetch built-in, no need to import
// For older versions, node-fetch would still be needed but with different import

/**
 * MCP Client for consuming external MCP services
 * Enables SeNARS to integrate with external MCP ecosystems scalably
 * 
 * Note: This implementation uses a simplified approach to demonstrate the concepts
 * from the plan while avoiding complex transport integration issues.
 */
export class Client extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = options;
    this.isConnected = false;
    this.discoveredTools = new Map();
    this.adapter = new Adapter();
    this.safety = new Safety();
    this.sessionId = null;
    
    // Connection configuration
    this.endpoint = options.endpoint || null;
    this.connectionTimeout = options.connectionTimeout || 10000;
    this.retryAttempts = options.retryAttempts || 3;
    this.headers = options.headers || {};
  }

  /**
   * Connect to an MCP server
   */
  async connect() {
    if (this.isConnected) {
      console.warn('Already connected to MCP server');
      return;
    }

    if (!this.endpoint) {
      throw new Error('No endpoint specified for MCP client connection');
    }

    let attempts = 0;
    while (attempts < this.retryAttempts) {
      try {
        // Validate connection parameters with safety layer
        const validatedOptions = await this.safety.validateClientOptions(this.options);
        
        // Test the connection by attempting to initialize with the server
        const initResponse = await this._makeRequest('/mcp/initialize', 'POST', {});
        if (initResponse && initResponse.serverInfo) {
          this.isConnected = true;
          
          // Create a session ID for this connection
          this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`Connected to MCP server: ${this.endpoint}, session: ${this.sessionId}`);
          this.emit('connected', { endpoint: this.endpoint, sessionId: this.sessionId });
          
          // Discover available tools after connection
          await this.discoverTools();
          
          return true;
        } else {
          throw new Error('Invalid response from MCP server during initialization');
        }
      } catch (error) {
        attempts++;
        console.warn(`Connection attempt ${attempts} failed:`, error.message);
        
        if (attempts >= this.retryAttempts) {
          throw new Error(`Failed to connect to MCP server after ${this.retryAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  /**
   * Make an HTTP request to the MCP server
   */
  async _makeRequest(path, method = 'GET', body = null, additionalHeaders = {}) {
    const url = `${this.endpoint}${path}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...additionalHeaders
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.connectionTimeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Discover tools from the connected server
   */
  async discoverTools() {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this._makeRequest('/mcp/tools/list', 'GET');
      const tools = response.tools || [];
      
      for (const tool of tools) {
        // Normalize tool metadata for consistent usage
        const normalizedTool = this.adapter.normalizeMCPTool(tool);
        this.discoveredTools.set(normalizedTool.name, normalizedTool);
      }
      
      this.emit('toolsDiscovered', { count: tools.length, tools: Array.from(this.discoveredTools.keys()) });
      return tools;
    } catch (error) {
      console.error('Failed to discover tools from MCP server:', error);
      throw error;
    }
  }

  /**
   * Call a tool on the connected MCP server
   */
  async callTool(toolName, input) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    if (!this.discoveredTools.has(toolName)) {
      throw new Error(`Tool "${toolName}" not available on connected server`);
    }

    try {
      // Validate input using safety layer
      const validatedInput = await this.safety.validateInput(toolName, input);
      
      // Call the tool on the remote server using HTTP API
      const response = await this._makeRequest(`/mcp/tools/call/${toolName}`, 'POST', validatedInput);
      
      // Extract result from response
      const result = response.result;
      
      // Validate output using safety layer
      const validatedOutput = await this.safety.validateOutput(toolName, result);
      
      this.emit('toolCalled', { toolName, input: validatedInput, result: validatedOutput });
      return validatedOutput;
    } catch (error) {
      console.error(`Failed to call tool "${toolName}":`, error);
      throw error;
    }
  }

  /**
   * Get information about discovered tools
   */
  getAvailableTools() {
    return Array.from(this.discoveredTools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      parameters: tool.parameters,
      returns: tool.returns
    }));
  }

  /**
   * Check if a specific tool is available
   */
  hasTool(toolName) {
    return this.discoveredTools.has(toolName);
  }

  /**
   * Get detailed information about a specific tool
   */
  getToolInfo(toolName) {
    return this.discoveredTools.get(toolName);
  }

  /**
   * Perform code execution mode operations (if supported)
   * This allows running scripts that chain tools across servers
   */
  async executeCode(code, context = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    // Validate code execution request with safety layer
    const validatedRequest = await this.safety.validateCodeExecution(code, context);
    
    try {
      // In a real implementation, this would send a script to be executed remotely
      // For this demo, we'll simulate code execution
      console.log('Code execution is simulated in this demo');
      return {
        success: true,
        result: `Code execution completed: ${code.substring(0, 100)}...`
      };
    } catch (error) {
      console.error('Failed to execute code:', error);
      throw error;
    }
  }

  /**
   * Close the connection to the MCP server
   */
  async disconnect() {
    if (!this.isConnected) {
      console.warn('Not connected to MCP server');
      return;
    }

    // In a real MCP implementation, there might be a proper disconnect flow
    this.isConnected = false;
    this.discoveredTools.clear();
    
    this.emit('disconnected', { sessionId: this.sessionId });
    console.log('Disconnected from MCP server');
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      endpoint: this.endpoint,
      sessionId: this.sessionId,
      availableTools: this.getAvailableTools().length
    };
  }
}