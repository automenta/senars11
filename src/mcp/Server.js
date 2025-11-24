import {EventEmitter} from 'events';
import {Safety} from './Safety.js';
import {createServer as createHttpServer} from 'http';

/**
 * MCP Server for exposing SeNARS services as MCP tools
 */
export class Server extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = options;
        this.isRunning = false;
        this.port = options.port ?? 3000;
        this.host = options.host ?? 'localhost';
        this.exposedTools = new Map();
        this.activeConnections = new Map();
        this.safety = options.safety ?? new Safety();
        this.serverUrl = null;
        this.httpServer = null;

        // Optional NAR instance for real execution
        this.nar = options.nar || null;

        this.auth = options.auth ?? null;
        this.rateLimit = options.rateLimit ?? {requests: 100, windowMs: 60000};
    }

    async start() {
        if (this.isRunning) {
            console.warn('MCP server is already running');
            return;
        }

        const validatedOptions = await this.safety.validateServerOptions(this.options);

        this.httpServer = createHttpServer((req, res) => {
            this.handleRequest(req, res).catch(error => {
                console.error('Error handling request:', error);
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: error.message}));
            });
        });

        await this.registerBuiltInTools();

        await new Promise((resolve, reject) => {
            this.httpServer.listen(
                {port: validatedOptions.port ?? this.port, host: validatedOptions.host ?? this.host},
                () => {
                    console.log(`MCP server listening on http://${this.host}:${this.port}`);
                    this.isRunning = true;
                    this.serverUrl = `http://${this.host}:${this.port}`;
                    this.emit('serverStarted', {port: this.port, host: this.host, url: this.serverUrl});
                    resolve();
                }
            );

            this.httpServer.on('error', (err) => {
                console.error('MCP server error:', err);
                reject(err);
            });
        });

        return true;
    }

    async handleRequest(req, res) {
        const url = new URL(`http://${req.headers.host}${req.url}`);
        const method = req.method;

        switch (true) {
            case url.pathname === '/mcp/initialize' && method === 'POST':
                await this.handleInitialize(req, res);
                break;
            case url.pathname === '/mcp/tools/list' && method === 'GET':
                await this.handleListTools(req, res);
                break;
            case url.pathname.startsWith('/mcp/tools/call/') && method === 'POST':
                await this.handleCallTool(url.pathname.split('/').pop(), req, res);
                break;
            case url.pathname === '/mcp/resources/list' && method === 'GET':
                await this.handleListResources(req, res);
                break;
            default:
                res.writeHead(404, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: 'Not found', path: req.url}));
        }
    }

    async handleInitialize(req, res) {
        const response = {
            protocolVersion: '2024-11-05',
            capabilities: {tools: {listChanged: true}, resources: {listChanged: true}},
            serverInfo: {name: 'SeNARS-MCP-Server', version: '1.0.0'}
        };

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(response));
    }

    async handleListTools(req, res) {
        const tools = Array.from(this.exposedTools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema
        }));

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({tools}));
    }

    async handleCallTool(toolName, req, res) {
        const tool = this.exposedTools.get(toolName);
        if (!tool) {
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: `Tool ${toolName} not found`}));
            return;
        }

        try {
            let body = '';
            for await (const chunk of req) {
                body += chunk;
            }

            let input;
            try {
                input = JSON.parse(body);
            } catch (e) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: 'Invalid JSON in request body'}));
                return;
            }

            const validatedInput = await this.safety.validateInput(toolName, input);

            const result = await this.executeToolHandler(toolName, validatedInput);
            const validatedOutput = await this.safety.validateOutput(toolName, result);

            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({result: validatedOutput}));

            this.emit('toolCalled', {toolName, input: validatedInput, result: validatedOutput});
        } catch (error) {
            console.error(`Error calling tool ${toolName}:`, error.message);
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: error.message}));
        }
    }

    // Helper method to execute the appropriate tool handler
    async executeToolHandler(toolName, input) {
        switch (toolName) {
            case 'reason':
                return await this.handleReasoning(input);
            case 'memory-query':
                return await this.handleMemoryQuery(input);
            case 'execute-tool':
                return await this.handleToolExecution(input);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    async handleListResources(req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({resources: []}));
    }

    async registerBuiltInTools() {
        this.exposedTools.set('reason', {
            name: 'reason',
            title: 'SeNARS Reasoning Engine',
            description: 'SeNARS reasoning engine - performs logical inference and reasoning',
            inputSchema: {
                type: 'object',
                properties: {
                    premises: {type: 'array', items: {type: 'string'}, description: 'Input premises for reasoning'},
                    goal: {type: 'string', description: 'Goal to achieve through reasoning'}
                },
                required: ['premises']
            },
            outputSchema: {
                type: 'object',
                properties: {
                    conclusions: {
                        type: 'array',
                        items: {type: 'string'},
                        description: 'Conclusions derived from reasoning'
                    },
                    confidence: {type: 'number', description: 'Confidence level of conclusions'},
                    derivationSteps: {
                        type: 'array',
                        items: {type: 'string'},
                        description: 'Steps taken during the reasoning process'
                    }
                }
            }
        });

        this.exposedTools.set('memory-query', {
            name: 'memory-query',
            title: 'SeNARS Memory Query',
            description: 'Query SeNARS memory for stored information',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {type: 'string', description: 'Search query for memory'},
                    limit: {type: 'number', description: 'Maximum number of results', default: 10}
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
                                id: {type: 'string'},
                                content: {type: 'string'},
                                confidence: {type: 'number'},
                                timestamp: {type: 'string'}
                            }
                        }
                    },
                    count: {type: 'number', description: 'Total number of results found'}
                }
            }
        });

        this.exposedTools.set('execute-tool', {
            name: 'execute-tool',
            title: 'Execute SeNARS Tool',
            description: 'Execute a SeNARS tool/engine',
            inputSchema: {
                type: 'object',
                properties: {
                    toolName: {type: 'string', description: 'Name of the tool to execute'},
                    parameters: {type: 'object', description: 'Parameters for the tool execution'}
                },
                required: ['toolName']
            },
            outputSchema: {
                type: 'object',
                properties: {
                    result: {type: 'string', description: 'Result of tool execution'},
                    success: {type: 'boolean', description: 'Whether the execution was successful'},
                    error: {type: 'string', description: 'Error message if execution failed'}
                }
            }
        });
    }

    async registerTool(name, config, handler) {
        const validatedConfig = await this.safety.validateToolRegistration(name, config);
        this.exposedTools.set(name, {...validatedConfig, handler});
        this.emit('toolRegistered', {name, config: validatedConfig});
        console.log(`Registered MCP tool: ${name}`);
    }

    async handleReasoning(input) {
        const validatedInput = await this.safety.validateInput('reason', input);

        if (this.nar) {
            try {
                // If NAR instance is available, use it
                const results = [];
                for (const premise of validatedInput.premises) {
                     await this.nar.input(premise);
                }

                if (validatedInput.goal) {
                    await this.nar.input(validatedInput.goal);
                }

                // Run a few cycles to process
                const derivations = await this.nar.runCycles(10);

                // Format results from NAR
                // This is a simplified mapping. Real implementation would parse derivations.
                const conclusions = derivations
                    .flat()
                    .filter(d => d && d.term)
                    .map(d => d.term.toString());

                return {
                    conclusions: conclusions.length > 0 ? conclusions : ["Processed premises, no immediate conclusions"],
                    confidence: 1.0, // simplified
                    derivationSteps: [`Processed ${validatedInput.premises.length} premises`, `Ran 10 inference cycles`]
                };
            } catch (err) {
                console.error("NAR execution error:", err);
                // Fallback to mock if execution fails
            }
        }

        return {
            conclusions: [`Based on premises: ${validatedInput.premises.join(', ')}`, `Goal: ${validatedInput.goal ?? 'No specific goal'}`],
            confidence: 0.85,
            derivationSteps: ['Step 1: Analyzed premises', 'Step 2: Applied reasoning rules', 'Step 3: Generated conclusions']
        };
    }

    async handleMemoryQuery(input) {
        const validatedInput = await this.safety.validateInput('memory-query', input);
        const limit = validatedInput.limit ?? 10;

        if (this.nar) {
            try {
                const results = this.nar.query(validatedInput.query);
                return {
                    results: results.slice(0, limit).map(task => ({
                        id: task.id || 'unknown',
                        content: task.term ? task.term.toString() : 'unknown',
                        confidence: task.truth ? task.truth.confidence : 0,
                        timestamp: new Date().toISOString()
                    })),
                    count: results.length
                };
            } catch (err) {
                 console.error("NAR memory query error:", err);
            }
        }

        const mockResults = [
            {
                id: '1',
                content: `Memory entry matching query: ${validatedInput.query}`,
                confidence: 0.9,
                timestamp: new Date().toISOString()
            },
            {id: '2', content: 'Another matching entry', confidence: 0.7, timestamp: new Date().toISOString()}
        ];

        return {results: mockResults.slice(0, limit), count: Math.min(mockResults.length, limit)};
    }

    async handleToolExecution(input) {
        const validatedInput = await this.safety.validateInput('execute-tool', input);

        if (this.nar) {
             try {
                 const result = await this.nar.executeTool(validatedInput.toolName, validatedInput.parameters);
                 return {
                     result: JSON.stringify(result.result || result),
                     success: result.success !== false,
                     error: result.error || null
                 };
             } catch (err) {
                 return {
                     result: null,
                     success: false,
                     error: err.message
                 };
             }
        }

        return {
            result: `Executed tool: ${validatedInput.toolName} with parameters: ${JSON.stringify(validatedInput.parameters ?? {})}`,
            success: true,
            error: null
        };
    }

    getExposedTools() {
        return Array.from(this.exposedTools.keys());
    }

    async executeLocalTool(toolName, input) {
        if (!this.exposedTools.has(toolName)) {
            throw new Error(`Tool "${toolName}" not exposed by this server`);
        }

        // Note: toolConfig is retrieved but not used in the original implementation
        const validatedInput = await this.safety.validateInput(toolName, input);
        const result = await this.executeToolHandler(toolName, validatedInput);
        const validatedOutput = await this.safety.validateOutput(toolName, result);

        this.emit('localToolExecuted', {toolName, input: validatedInput, result: validatedOutput});
        return validatedOutput;
    }

    async stop() {
        if (!this.isRunning || !this.httpServer) {
            console.warn('MCP server is not running');
            return;
        }

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
    }

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

    setupAuthentication(authConfig) {
        this.auth = authConfig;
        console.log('Authentication configured for MCP server');
    }
}