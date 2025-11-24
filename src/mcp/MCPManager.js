import {EventEmitter} from 'events';
import {Safety} from './Safety.js';
import {Adapter} from './Adapter.js';

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
        if (this.isInitialized) return true;

        try {
            await this.safety.initialize(this.options.safety ?? {});
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
        if (!this.isInitialized) await this.initialize();

        const validatedOptions = await this.safety.validateClientOptions(options);
        const {Client: MCPClient} = await import('./Client.js');
        this.client = new MCPClient({endpoint, ...validatedOptions});

        await this.client.connect();
        await this.discoverTools();

        const connectionId = `client_${Date.now()}`;
        this.connections.set(connectionId, this.client);

        this.emit('clientConnected', {endpoint, connectionId});
        return connectionId;
    }

    /**
     * Set up MCP server to expose SeNARS services
     */
    async setupServer(port, options = {}) {
        if (!this.isInitialized) await this.initialize();

        // Pass the NAR instance from options to the server
        const narInstance = this.options.nar || options.nar;

        const {Server: MCPServer} = await import('./Server.js');
        this.server = new MCPServer({port, ...options, nar: narInstance, safety: this.safety});
        await this.server.start();
        this.emit('serverStarted', {port});
        return this.server;
    }

    /**
     * Discover tools from connected MCP server
     */
    async discoverTools() {
        if (!this.client) {
            throw new Error('No client connected');
        }

        // Discover available tools from the server
        await this.client.discoverTools();
        this.discoveredTools = this.client.discoveredTools;
        const tools = Array.from(this.discoveredTools.values());
        this.emit('toolsDiscovered', {count: tools.length});
        return tools;
    }

    /**
     * Call an MCP tool either from a connected server or execute locally
     */
    async callMCPTool(toolName, input) {
        if (!this.isInitialized) {
            throw new Error('MCPManager not initialized');
        }

        const validatedInput = await this.safety.validateInput(toolName, input);

        if (this.client?.discoveredTools?.has(toolName)) {
            const result = await this.client.callTool(toolName, validatedInput);
            const validatedOutput = await this.safety.validateOutput(toolName, result);
            this.emit('toolCalled', {toolName, result: validatedOutput});
            return validatedOutput;
        } else if (this.server) {
            const result = await this.server.executeLocalTool(toolName, validatedInput);
            const validatedOutput = await this.safety.validateOutput(toolName, result);
            this.emit('toolCalled', {toolName, result: validatedOutput});
            return validatedOutput;
        } else {
            throw new Error(`Tool "${toolName}" not available. No client connected or server running.`);
        }
    }

    /**
     * Get information about available tools
     */
    getAvailableTools() {
        const clientTools = Array.from(this.discoveredTools.keys());
        const serverTools = this.server?.getExposedTools() ?? [];

        return {
            clientTools,
            serverTools,
            allTools: [...clientTools, ...serverTools]
        };
    }

    /**
     * Register discovered MCP tools with a NAR instance so the Agent can use them.
     */
    async registerToolsWithNAR(nar) {
        if (!nar || !nar.tools || !nar.tools.registry) {
            console.warn('Cannot register MCP tools: NAR tool registry not available');
            return false;
        }

        const { MCPProxyTool } = await import('./MCPProxyTool.js');

        // Register client tools
        if (this.client) {
            for (const [name, toolInfo] of this.discoveredTools) {
                // Check if tool already exists to avoid conflict
                if (!nar.tools.registry.getTool(name)) {
                     const proxyTool = new MCPProxyTool(this.client, name, toolInfo);
                     nar.tools.registry.registerTool(name, proxyTool, {
                         category: 'mcp',
                         description: toolInfo.description
                     });
                     console.log(`Registered MCP tool '${name}' with NAR`);
                }
            }
        }

        return true;
    }

    /**
     * Close all connections and clean up resources
     */
    async shutdown() {
        if (this.client) {
            await this.client.disconnect();
            this.client = null;
        }

        if (this.server) {
            await this.server.stop();
            this.server = null;
        }

        this.connections.clear();
        this.sessions.clear();
        this.discoveredTools.clear();
        this.isInitialized = false;

        this.emit('shutdown');
    }
}