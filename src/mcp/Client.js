import {EventEmitter} from 'events';
import {Adapter} from './Adapter.js';
import {Safety} from './Safety.js';

/**
 * MCP Client for consuming external MCP services
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

        this.endpoint = options.endpoint ?? null;
        this.connectionTimeout = options.connectionTimeout ?? 10000;
        this.retryAttempts = options.retryAttempts ?? 3;
        this.headers = options.headers ?? {};
    }

    async connect() {
        if (this.isConnected) {
            console.warn('Already connected to MCP server');
            return;
        }

        if (!this.endpoint) {
            throw new Error('No endpoint specified for MCP client connection');
        }

        for (let attempts = 0; attempts < this.retryAttempts; attempts++) {
            try {
                // Note: validateClientOptions is not used here as _makeRequest handles its own validation
                const initResponse = await this._makeRequest('/mcp/initialize', 'POST', {});

                if (initResponse?.serverInfo) {
                    this.isConnected = true;
                    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

                    console.log(`Connected to MCP server: ${this.endpoint}, session: ${this.sessionId}`);
                    this.emit('connected', {endpoint: this.endpoint, sessionId: this.sessionId});
                    await this.discoverTools();
                    return true;
                } else {
                    throw new Error('Invalid response from MCP server during initialization');
                }
            } catch (error) {
                console.warn(`Connection attempt ${attempts + 1} failed:`, error.message);

                if (attempts + 1 >= this.retryAttempts) {
                    throw new Error(`Failed to connect to MCP server after ${this.retryAttempts} attempts: ${error.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
            }
        }
    }

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

        if (body) options.body = JSON.stringify(body);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout);

        try {
            const response = await fetch(url, {...options, signal: controller.signal});
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            return contentType?.includes('application/json') ? await response.json() : await response.text();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.connectionTimeout}ms`);
            }

            throw error;
        }
    }

    async discoverTools() {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this._makeRequest('/mcp/tools/list', 'GET');
        const tools = response.tools ?? [];

        for (const tool of tools) {
            const normalizedTool = this.adapter.normalizeMCPTool(tool);
            this.discoveredTools.set(normalizedTool.name, normalizedTool);
        }

        this.emit('toolsDiscovered', {count: tools.length, tools: Array.from(this.discoveredTools.keys())});
        return tools;
    }

    async callTool(toolName, input) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }
        if (!this.discoveredTools.has(toolName)) {
            throw new Error(`Tool "${toolName}" not available on connected server`);
        }

        const validatedInput = await this.safety.validateInput(toolName, input);
        const response = await this._makeRequest(`/mcp/tools/call/${toolName}`, 'POST', validatedInput);
        const result = response.result;
        const validatedOutput = await this.safety.validateOutput(toolName, result);

        this.emit('toolCalled', {toolName, input: validatedInput, result: validatedOutput});
        return validatedOutput;
    }

    getAvailableTools() {
        return Array.from(this.discoveredTools.entries()).map(([name, tool]) => ({
            name,
            description: tool.description,
            parameters: tool.parameters,
            returns: tool.returns
        }));
    }

    hasTool(toolName) {
        return this.discoveredTools.has(toolName);
    }

    getToolInfo(toolName) {
        return this.discoveredTools.get(toolName);
    }

    async executeCode(code, context = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        await this.safety.validateCodeExecution(code, context);

        console.log('Code execution is simulated in this demo');
        return {
            success: true,
            result: `Code execution completed: ${code.substring(0, 100)}...`
        };
    }

    async disconnect() {
        if (!this.isConnected) {
            console.warn('Not connected to MCP server');
            return;
        }

        this.isConnected = false;
        this.discoveredTools.clear();

        this.emit('disconnected', {sessionId: this.sessionId});
        console.log('Disconnected from MCP server');
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            endpoint: this.endpoint,
            sessionId: this.sessionId,
            availableTools: this.getAvailableTools().length
        };
    }
}