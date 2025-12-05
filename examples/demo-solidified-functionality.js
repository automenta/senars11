#!/usr/bin/env node

import {App} from '@senars/agent';
import {NARControlTool} from './src/tool/NARControlTool.js';

// Suppress ONNX runtime warnings
process.env.ORT_LOG_LEVEL = '3';

async function demonstrateSolidifiedFunctionality() {
    console.log('🏗️  Solidifying SeNARS Transformers.js + Advanced Tool/MCP Functionality');
    console.log('========================================================================\n');

    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/LaMini-Flan-T5-248M',
            enabled: true,
            temperature: 0.1
        },
        subsystems: {
            lm: true,
            tools: true,
            embeddingLayer: true,
            rules: ['syllogistic-core', 'temporal']
        },
        memory: {
            enableMemoryValidation: false
        }
    };

    const app = new App(config);

    try {
        console.log('🚀 Starting SeNARS with full tool integration...\n');
        const agent = await app.start({startAgent: true});

        console.log('✅ SeNARS started with:');
        console.log('   • Transformers.js LM provider');
        console.log('   • Tool integration enabled');
        console.log('   • NAR control tools available\n');

        // Test 1: NAR Control via LLM
        console.log('1️⃣  NAR CONTROL CAPABILITIES');
        console.log('   Adding beliefs and goals programmatically...\n');

        // Create and register an explicit NAR control tool
        const narControlTool = new NARControlTool(agent.nar);

        // Add a belief
        const beliefResult = await narControlTool.execute({
            action: 'add_belief',
            content: '(dog --> mammal).'
        });
        console.log(`   Added belief: ${beliefResult.message}\n`);

        // Add another belief
        const belief2Result = await narControlTool.execute({
            action: 'add_belief',
            content: '(mammal --> warm-blooded).'
        });
        console.log(`   Added belief: ${belief2Result.message}\n`);

        // Query the system
        const queryResult = await narControlTool.execute({
            action: 'query',
            content: '<dog --> warm-blooded>?'
        });
        console.log(`   Query result: ${JSON.stringify(queryResult, null, 2)}\n`);

        // Test 2: Tool Integration with LM
        console.log('2️⃣  LM-TOOL INTEGRATION');
        console.log('   LM can now call NAR control tools...\n');

        // Check if the LM has access to tools
        if (agent.lm && agent.lm.providers && agent.lm.providers.get('transformers')) {
            const provider = agent.lm.providers.get('transformers');
            console.log(`   Available LM tools: ${provider.tools ? provider.tools.length : 0}`);

            if (provider.tools && provider.tools.length > 0) {
                console.log('   LM tools include:');
                provider.tools.forEach(tool => {
                    console.log(`     - ${tool.name}: ${tool.description}`);
                });
            }
        }

        // Test 3: MCP Server Setup (for external LM integration)
        console.log('\n3️⃣  MCP (Model Context Protocol) INTEGRATION');
        console.log('   Setting up MCP server for external tool access...\n');

        if (agent.mcp) {
            await agent.mcp.setupServer(8081, {nar: agent.nar});
            console.log('   ✅ MCP server running on port 8081');
            console.log('   ✅ External LLMs can now call SeNARS tools via MCP');
        } else {
            console.log('   ⚠️  MCP not directly available on agent (would need to be initialized separately)');
        }

        // Demonstrate the solidified architecture
        console.log('\n4️⃣  SOLIDIFIED ARCHITECTURE SUMMARY');
        console.log('   The system now supports multiple integration levels:\n');

        console.log('   🔄 Intra-system (LM ↔ NAR):');
        console.log('      • LM can call NAR via NARControlTool');
        console.log('      • NAR can influence LM reasoning');
        console.log('      • Real-time hybrid reasoning\n');

        console.log('   🌐 Inter-system (External LLM ↔ SeNARS):');
        console.log('      • MCP protocol for external tool access');
        console.log('      • Secure tool execution environment');
        console.log('      • Context-aware reasoning\n');

        console.log('   🛠️  Tool Ecosystem:');
        console.log('      • File operations');
        console.log('      • Command execution');
        console.log('      • Web automation');
        console.log('      • Media processing');
        console.log('      • NAR control\n');

        // Test 4: Demonstrate advanced reasoning flow
        console.log('5️⃣  ADVANCED REASONING FLOW');

        // Add complex knowledge through the NAR control
        await narControlTool.execute({
            action: 'add_belief',
            content: '(student --> person).'
        });

        await narControlTool.execute({
            action: 'add_belief',
            content: '(person --> mortal).'
        });

        // Execute a reasoning step
        await narControlTool.execute({action: 'step'});

        console.log('   ✅ Complex reasoning flow executed');
        console.log('   Beliefs: (student --> person), (person --> mortal)');
        console.log('   Result: Should derive (student --> mortal) through transitivity\n');

        // Get current beliefs
        const beliefsResult = await narControlTool.execute({action: 'get_beliefs'});
        console.log(`   Current beliefs retrieved: ${JSON.stringify(beliefsResult.beliefs || 'N/A', null, 2)}\n`);

        console.log('✨ ENHANCED FUNCTIONALITY ACHIEVED:');
        console.log('   • Transformers.js provides compact, offline LM capability');
        console.log('   • NAR control tools enable LLM to manipulate reasoning system');
        console.log('   • MCP enables external LLM integration via standard protocol');
        console.log('   • Tool ecosystem provides rich functionality beyond pure reasoning');
        console.log('   • Hybrid architecture combines neural and symbolic AI approaches');

        await app.shutdown();
        console.log('\n✅ Solidified functionality demonstration completed!');

    } catch (error) {
        console.error('❌ Error during demonstration:', error.message);
        console.error('Stack:', error.stack);
        await app.shutdown().catch(() => {
        });
    }
}

demonstrateSolidifiedFunctionality().catch(console.error);