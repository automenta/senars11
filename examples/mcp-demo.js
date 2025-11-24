
import { NAR } from '../src/nar/NAR.js';
import { SeNARSMCPSystem } from '../src/mcp/index.js';

// Configuration for MCP-enabled NAR
const config = {
    // Note: MCP is NOT in this config, keeping it optional/decoupled
    memory: { conceptForgetDuration: 10000 },
    focus: { capacity: 100 },
    tools: { enabled: true } // Ensure tool system is enabled in NAR
};

async function runDemo() {
    console.log('--- Starting SeNARS (Server Instance) ---');
    const narServer = new NAR(config);
    await narServer.initialize();

    // Setup MCP Server wrapping narServer
    console.log('--- Starting MCP Server ---');
    const mcpSystemServer = new SeNARSMCPSystem();
    await mcpSystemServer.initialize('server');
    // We pass 'nar' to the server setup so it can execute real reasoning
    await mcpSystemServer.setupAsServer(3005, { nar: narServer });
    console.log('MCP Server running on port 3005');

    // --- Separate Client Instance ---
    console.log('\n--- Starting SeNARS (Client Instance) ---');
    const narClient = new NAR(config);
    await narClient.initialize();

    // Setup MCP Client for the second NAR
    console.log('--- Starting MCP Client ---');
    const mcpSystemClient = new SeNARSMCPSystem();
    await mcpSystemClient.initialize('client');
    await mcpSystemClient.connectAsClient('http://localhost:3005');

    // BRIDGE: Register discovered tools into the Client NAR
    console.log('--- Bridging Tools to Client NAR ---');
    await mcpSystemClient.registerToolsWithNAR(narClient);

    const tools = narClient.tools.registry.getTools();
    console.log('Client NAR now has tools:', tools.map(t => t.name));

    if (tools.some(t => t.name === 'reason')) {
        console.log('\n--- Client NAR executing "reason" tool via MCP ---');
        // This execution happens on the Client NAR, which calls the MCP Proxy,
        // which calls the MCP Server, which executes on the Server NAR.
        const result = await narClient.executeTool('reason', {
            premises: ['<sky --> blue>.', '<blue --> color>.'],
            goal: '<sky --> ?x>?'
        });
        console.log('Reasoning Result (Remote):', JSON.stringify(result, null, 2));
    }

    console.log('\n--- Shutting Down ---');
    await mcpSystemClient.shutdown();
    await mcpSystemServer.shutdown();
    await narClient.dispose();
    await narServer.dispose();
}

runDemo().catch(err => console.error('Demo failed:', err));
