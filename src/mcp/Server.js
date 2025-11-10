import { EventEmitter } from 'events';
import { Safety } from './Safety.js';
import { Adapter } from './Adapter.js';
import { createServer as createHttpServer } from 'http';
import { createReadStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * MCP Server for exposing SeNARS services as MCP tools
 * Allows external agents to access SeNARS capabilities through MCP protocol
 * 
 * Note: This implementation uses a simplified approach to demonstrate the concepts
 * from the plan while avoiding complex transport integration issues.
 */
export class Server extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = options;
    this.isRunning = false;
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.exposedTools = new Map();
    this.activeConnections = new Map();
    this.safety = options.safety || new Safety();
    this.adapter = new Adapter();
    this.serverUrl = null;
    this.httpServer = null;
    
    // Authentication and rate limiting options
    this.auth = options.auth || null;
    this.rateLimit = options.rateLimit || { requests: 100, windowMs: 60000 }; // 100 requests per minute
  }

  /**
   * Start the MCP server
   */
  async start() {
    if (this.isRunning) {
      console.warn('MCP server is already running');
      return;
    }

    try {
      // Validate server configuration with safety layer
      const validatedOptions = await this.safety.validateServerOptions(this.options);
      
      // Set up the HTTP server to handle MCP protocol requests
      this.httpServer = createHttpServer(async (req, res) => {
        await this.handleRequest(req, res);
      });
      
      // Register built-in tools and capabilities
      await this.registerBuiltInTools();
      
      // Start the HTTP server
      await new Promise((resolve, reject) => {
        this.httpServer.listen(
          { port: validatedOptions.port || this.port, host: validatedOptions.host || this.host },
          () => {
            console.log(`MCP server listening on http://${this.host}:${this.port}`);
            this.isRunning = true;
            this.serverUrl = `http://${this.host}:${this.port}`;
            this.emit('serverStarted', { 
              port: this.port, 
              host: this.host, 
              url: this.serverUrl 
            });
            resolve();
          }
        );
        
        this.httpServer.on('error', (err) => {
          console.error('MCP server error:', err);
          reject(err);
        });
      });
      
      return true;
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Handle incoming HTTP requests (simplified MCP protocol handling)
   */
  async handleRequest(req, res) {
    try {
      // Parse the request - in a real MCP implementation this would follow the MCP protocol
      const url = new URL(`http://${req.headers.host}${req.url}`);
      const method = req.method;
      
      // Handle MCP protocol endpoints
      if (url.pathname === '/mcp/initialize' && method === 'POST') {
        // Handle MCP initialization
        await this.handleInitialize(req, res);
      } else if (url.pathname === '/mcp/tools/list' && method === 'GET') {
        // Handle tool listing
        await this.handleListTools(req, res);
      } else if (url.pathname.startsWith('/mcp/tools/call/') && method === 'POST') {
        // Handle tool calls
        const toolName = url.pathname.split('/').pop();
        await this.handleCallTool(toolName, req, res);
      } else if (url.pathname === '/mcp/resources/list' && method === 'GET') {
        // Handle resource listing
        await this.handleListResources(req, res);
      } else {
        // Unknown endpoint
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found', path: req.url }));
      }
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle MCP initialization request
   */
  async handleInitialize(req, res) {
    // In a real MCP implementation, we would exchange capabilities
    const response = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true }
      },
      serverInfo: {
        name: 'SeNARS-MCP-Server',
        version: '1.0.0'
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Handle list tools request
   */
  async handleListTools(req, res) {
    const tools = Array.from(this.exposedTools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools }));
  }

  /**
   * Handle call tool request
   */
  async handleCallTool(toolName, req, res) {
    const tool = this.exposedTools.get(toolName);
    if (!tool) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Tool ${toolName} not found` }));
      return;
    }

    try {
      // Read the request body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      
      let input;
      try {
        input = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        return;
      }

      // Validate input using safety layer
      const validatedInput = await this.safety.validateInput(toolName, input);
      
      // Call the appropriate handler based on tool name
      let result;
      switch (toolName) {
        case 'reason':
          result = await this.handleReasoning(validatedInput);
          break;
        case 'memory-query':
          result = await this.handleMemoryQuery(validatedInput);
          break;
        case 'execute-tool':
          result = await this.handleToolExecution(validatedInput);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
      
      // Validate output using safety layer
      const validatedOutput = await this.safety.validateOutput(toolName, result);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: validatedOutput }));
      
      this.emit('toolCalled', { toolName, input: validatedInput, result: validatedOutput });
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle list resources request
   */
  async handleListResources(req, res) {
    // For now, return empty resources list
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ resources: [] }));
  }

  /**
   * Register built-in tools that expose SeNARS capabilities
   */
  async registerBuiltInTools() {
    // Register the core SeNARS reasoning engine as an MCP tool
    this.exposedTools.set('reason', {
      name: 'reason',
      title: 'SeNARS Reasoning Engine',
      description: 'SeNARS reasoning engine - performs logical inference and reasoning',
      inputSchema: {
        type: 'object',
        properties: {
          premises: {
            type: 'array',
            items: { type: 'string' },
            description: 'Input premises for reasoning'
          },
          goal: { type: 'string', description: 'Goal to achieve through reasoning' }
        },
        required: ['premises']
      },
      outputSchema: {
        type: 'object',
        properties: {
          conclusions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Conclusions derived from reasoning'
          },
          confidence: { type: 'number', description: 'Confidence level of conclusions' },
          derivationSteps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Steps taken during the reasoning process'
          }
        }
      }
    });

    // Register memory access as an MCP tool
    this.exposedTools.set('memory-query', {
      name: 'memory-query',
      title: 'SeNARS Memory Query',
      description: 'Query SeNARS memory for stored information',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for memory' },
          limit: { type: 'number', description: 'Maximum number of results', default: 10 }
        },
        required: ['query']
      },
      outputSchema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: { 
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                confidence: { type: 'number' },
                timestamp: { type: 'string' }
              }
            }
          },
          count: { type: 'number', description: 'Total number of results found' }
        }
      }
    });

    // Register tool engine access
    this.exposedTools.set('execute-tool', {
      name: 'execute-tool',
      title: 'Execute SeNARS Tool',
      description: 'Execute a SeNARS tool/engine',
      inputSchema: {
        type: 'object',
        properties: {
          toolName: { type: 'string', description: 'Name of the tool to execute' },
          parameters: { 
            type: 'object', 
            description: 'Parameters for the tool execution' 
          }
        },
        required: ['toolName']
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'string', description: 'Result of tool execution' },
          success: { type: 'boolean', description: 'Whether the execution was successful' },
          error: { type: 'string', description: 'Error message if execution failed' }
        }
      }
    });
  }

  /**
   * Register a custom tool to be exposed via MCP
   */
  async registerTool(name, config, handler) {
    // Validate tool configuration with safety layer
    const validatedConfig = await this.safety.validateToolRegistration(name, config);
    
    // Store the tool configuration
    this.exposedTools.set(name, { ...validatedConfig, handler });
    
    this.emit('toolRegistered', { name, config: validatedConfig });
    console.log(`Registered MCP tool: ${name}`);
  }

  /**
   * Handler for reasoning operations
   */
  async handleReasoning(input) {
    try {
      // Validate input
      const validatedInput = await this.safety.validateInput('reason', input);
      
      // Import SeNARS reasoning functionality (this would connect to actual SeNARS components)
      // For this demo, we'll return a simulated response
      const mockResult = {
        conclusions: [`Based on premises: ${validatedInput.premises.join(', ')}`, `Goal: ${validatedInput.goal || 'No specific goal'}`],
        confidence: 0.85, // Mock confidence
        derivationSteps: ['Step 1: Analyzed premises', 'Step 2: Applied reasoning rules', 'Step 3: Generated conclusions']
      };
      
      return mockResult;
    } catch (error) {
      console.error('Error in reasoning handler:', error);
      throw error;
    }
  }

  /**
   * Handler for memory query operations
   */
  async handleMemoryQuery(input) {
    try {
      // Validate input
      const validatedInput = await this.safety.validateInput('memory-query', input);
      
      // Import SeNARS memory functionality
      // For this demo, we'll return a simulated response
      const mockResults = [
        { id: '1', content: `Memory entry matching query: ${validatedInput.query}`, confidence: 0.9, timestamp: new Date().toISOString() },
        { id: '2', content: 'Another matching entry', confidence: 0.7, timestamp: new Date().toISOString() }
      ];
      
      // Limit results if specified
      const limit = validatedInput.limit || 10;
      const results = mockResults.slice(0, limit);
      
      const mockResult = {
        results,
        count: results.length
      };
      
      return mockResult;
    } catch (error) {
      console.error('Error in memory query handler:', error);
      throw error;
    }
  }

  /**
   * Handler for tool execution
   */
  async handleToolExecution(input) {
    try {
      // Validate input
      const validatedInput = await this.safety.validateInput('execute-tool', input);
      
      // Import SeNARS tool functionality
      // For this demo, we'll return a simulated response
      const mockResult = {
        result: `Executed tool: ${validatedInput.toolName} with parameters: ${JSON.stringify(validatedInput.parameters || {})}`,
        success: true,
        error: null
      };
      
      return mockResult;
    } catch (error) {
      console.error('Error in tool execution handler:', error);
      return {
        result: null,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get list of exposed tools
   */
  getExposedTools() {
    return Array.from(this.exposedTools.keys());
  }

  /**
   * Execute a local SeNARS tool (used by MCPManager)
   */
  async executeLocalTool(toolName, input) {
    if (!this.exposedTools.has(toolName)) {
      throw new Error(`Tool "${toolName}" not exposed by this server`);
    }

    const toolConfig = this.exposedTools.get(toolName);
    
    try {
      // Validate input against the tool's schema
      const validatedInput = await this.safety.validateInput(toolName, input);
      
      // Call the appropriate handler based on tool name
      let result;
      switch (toolName) {
        case 'reason':
          result = await this.handleReasoning(validatedInput);
          break;
        case 'memory-query':
          result = await this.handleMemoryQuery(validatedInput);
          break;
        case 'execute-tool':
          result = await this.handleToolExecution(validatedInput);
          break;
        default:
          throw new Error(`Unknown local tool: ${toolName}`);
      }
      
      // Validate output
      const validatedOutput = await this.safety.validateOutput(toolName, result);
      
      this.emit('localToolExecuted', { toolName, input: validatedInput, result: validatedOutput });
      
      return validatedOutput;
    } catch (error) {
      console.error(`Error executing local tool "${toolName}":`, error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop() {
    if (!this.isRunning || !this.httpServer) {
      console.warn('MCP server is not running');
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('MCP server stopped');
            this.isRunning = false;
            this.httpServer = null;
            this.exposedTools.clear();
            this.activeConnections.clear();
            this.emit('serverStopped');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Error stopping MCP server:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      host: this.host,
      url: this.serverUrl,
      exposedTools: this.getExposedTools().length,
      activeConnections: this.activeConnections.size
    };
  }

  /**
   * Add authentication middleware (if needed)
   */
  setupAuthentication(authConfig) {
    // This would set up authentication for the server
    // Implementation depends on specific auth requirements
    this.auth = authConfig;
    console.log('Authentication configured for MCP server');
  }
}