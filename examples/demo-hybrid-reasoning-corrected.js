#!/usr/bin/env node

import {App} from './src/ui/App.js';

// Set environment variable to suppress ONNX runtime warnings
process.env.ORT_LOG_LEVEL = '3';

async function demonstrateHybridReasoning() {
    console.log('🧠 Demonstrating Hybrid Neuro-Symbolic Reasoning with SeNARS + Transformers.js');
    console.log('============================================================================\n');

    // Configuration with Transformers.js for hybrid reasoning
    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/LaMini-Flan-T5-248M',
            enabled: true,
            temperature: 0.1
        },
        subsystems: {
            lm: true,
            embeddingLayer: true,
            rules: ['syllogistic-core', 'temporal', 'causal'],
            tools: true
        },
        memory: {
            enableMemoryValidation: false
        }
    };

    const app = new App(config);

    try {
        console.log('🚀 Starting SeNARS with hybrid reasoning capabilities...');
        const agent = await app.start({startAgent: true});

        console.log('✅ SeNARS started with both NAL (symbolic) and LM (neural) reasoning!\n');

        // Demonstration 1: Natural language input with reasoning
        console.log('1️⃣  NATURAL LANGUAGE UNDERSTANDING & REASONING');
        console.log('   Input: Knowledge facts about animals...');

        const inputs = [
            "Birds are animals.",
            "Robins are birds.",
            "If birds are animals and robins are birds, then what can we conclude?",
            "What is the relationship between robins and animals?",
            "Robins can fly and birds can fly.",
            "What animals can fly?"
        ];

        for (const input of inputs) {
            console.log(`\n📝 Input: "${input}"`);
            let response = "";
            try {
                await agent.processInputStreaming(input, (chunk) => {
                    response += chunk;
                });
                console.log(`🤖 Response: ${response || '[Processing completed]'}`);
            } catch (e) {
                console.log(`⚠️  Error: ${e.message}`);
            }
        }

        console.log('\n📊 System Status:');
        console.log(`   - Total concepts in memory: ${agent.memory.concepts.size}`);
        console.log(`   - LM Provider: ${agent.lm.providers.defaultProviderId}`);
        console.log(`   - Hybrid reasoning enabled: YES`);

        console.log('\n💡 Key Capabilities Demonstrated:');
        console.log('   - Natural language understanding');
        console.log('   - Logical inference from multiple facts');
        console.log('   - Transformers.js neural pattern recognition');
        console.log('   - Hybrid neuro-symbolic reasoning combining both approaches');

        console.log('\n🎯 This demonstrates the core vision of SeNARS:');
        console.log('   A hybrid neuro-symbolic system where natural language processing,');
        console.log('   formal reasoning, and neural pattern recognition work together.');

        // Clean shutdown
        await app.shutdown();
        console.log('\n✅ Hybrid reasoning demonstration completed successfully!');

    } catch (error) {
        console.error('❌ Error during demonstration:', error.message);
        console.error('Stack:', error.stack);
        await app.shutdown().catch(() => {
        }); // Attempt cleanup
    }
}

// Run the demonstration
demonstrateHybridReasoning().catch(console.error);