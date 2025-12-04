#!/usr/bin/env node

// Suppress ONNX warnings globally
process.env.ORT_LOG_LEVEL = 'error';

import {App} from '../src/ui/App.js';
import {Config} from '../src/ui/Config.js';
import {MCPManager} from '../src/mcp/MCPManager.js';

async function main() {
    console.log("🚀 Starting SeNARS Agent Demo with Transformers.js and MCP...");

    // 1. Setup MCP Server
    const mcpManager = new MCPManager({safety: {}});
    await mcpManager.initialize();

    const serverPort = 3001;
    const server = await mcpManager.setupServer(serverPort);

    const calcHandler = async (args) => {
        const {operation, a, b} = args;
        // console.log(`[MCP Server] Executing calculator: ${operation}(${a}, ${b})`); // Suppress verbosity
        switch (operation) {
            case 'add':
                return a + b;
            case 'subtract':
                return a - b;
            case 'multiply':
                return a * b;
            case 'divide':
                return a / b;
            default:
                return "Unknown operation";
        }
    };

    await server.registerTool('calculator', {
        name: 'calculator',
        description: 'Perform basic arithmetic operations. Useful for math questions.',
        inputSchema: {
            type: 'object',
            properties: {
                operation: {type: 'string', enum: ['add', 'subtract', 'multiply', 'divide']},
                a: {type: 'number'},
                b: {type: 'number'}
            },
            required: ['operation', 'a', 'b']
        },
        handler: calcHandler
    }, calcHandler);

    console.log(`✅ MCP Server started on port ${serverPort} and 'calculator' tool registered.`);

    // 2. Connect as Client
    console.log("🔌 Connecting Agent to MCP Server...");
    await mcpManager.connectAsClient(`http://localhost:${serverPort}`);

    // 3. Initialize Agent
    const config = Config.parse([
        '--provider', 'transformers',
        '--model', 'Xenova/LaMini-Flan-T5-248M',
        '--temperature', '0'
    ]);

    config.nar.tools.enabled = true;
    config.subsystems = {...config.subsystems, tools: true, lm: true};

    const app = new App(config);
    const agent = await app.initialize();

    // 4. Register Discovered MCP Tools with the Agent
    if (agent.tools && agent.tools.registry) {
        await mcpManager.registerToolsWithNAR(agent);
    } else {
        // console.warn("ℹ️ Tool registry not available, skipping MCP tool registration.");
    }


    // Force a sync of tools to the LM provider
    if (agent.lm) {
        const lmProvider = agent.lm._getProvider();
        if (lmProvider) {
            let registeredTools = [];
            if (agent.tools && agent.tools.registry) {
                registeredTools = agent.tools.registry.getDiscoveredTools() || [];
            }

            console.log(`📦 Syncing ${registeredTools.length} tools to LM...`);
            if (registeredTools.length > 0) {
                const tools = registeredTools.map(tool => ({
                    name: tool.id,
                    description: tool.description,
                    schema: tool.parameters || tool.schema,
                    invoke: async (args) => {
                        const result = await agent.tools.executeTool(tool.id, args);
                        if (result && typeof result.result !== 'undefined') {
                            return typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
                        }
                        return JSON.stringify(result);
                    }
                }));
                lmProvider.tools = tools;
                if (typeof lmProvider.bindTools === 'function') {
                    lmProvider.bindTools(tools);
                }
            }
        }
    }

    console.log("✅ Agent initialized and tools synced.");

    // 5. Run Scenarios
    const inputs = [
        "Hello, who are you?",
        "You have a tool named 'calculator' that can perform arithmetic operations. Use it to add 100 and 200."
    ];

    for (const input of inputs) {
        console.log(`\n--------------------------------------------------`);
        console.log(`👤 User: ${input}`);
        console.log(`--------------------------------------------------`);

        try {
            await agent.processInputStreaming(input, (chunk) => {
                process.stdout.write(chunk);
            });
            process.stdout.write("\n");
        } catch (e) {
            console.error(`❌ Error processing input: ${e.message}`);
        }
    }

    console.log(`\n--------------------------------------------------`);

    // Cleanup
    await mcpManager.shutdown();
    await app.shutdown();
    console.log("👋 Demo finished.");
}

main().catch(error => {
    console.error("Fatal Error:", error);
    process.exit(1);
});
