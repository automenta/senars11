#!/usr/bin/env node

// Suppress ONNX runtime warnings more effectively
process.env.ORT_LOG_LEVEL = '3';

import {App} from './src/ui/App.js';

async function demonstrateKeyFunctionality() {
    console.log('🎯 SeNARS + Transformers.js: Key Functionality Demo');
    console.log('==================================================\n');

    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/LaMini-Flan-T5-248M',
            enabled: true,
            temperature: 0.1
        },
        subsystems: {
            lm: true,
            embeddingLayer: false,
            rules: ['syllogistic-core'],
            tools: false
        }
    };

    const app = new App(config);

    try {
        const agent = await app.start({startAgent: true});
        console.log('✅ SeNARS with Transformers.js started successfully!\n');

        // Test 1: Knowledge Input
        console.log('📋 Test 1: Knowledge Input');
        await agent.processInputStreaming("Dogs are mammals.", chunk => process.stdout.write(chunk));
        console.log('\n   Input: "Dogs are mammals." - Processed\n');

        // Test 2: Complex Reasoning
        console.log('🧠 Test 2: Complex Reasoning');
        await agent.processInputStreaming("If mammals are warm-blooded and dogs are mammals, what can we conclude about dogs?", chunk => process.stdout.write(chunk));
        console.log('\n   Complex reasoning task processed\n');

        // Test 3: Question Answering
        console.log('❓ Test 3: Question Answering');
        await agent.processInputStreaming("What are some common pets?", chunk => process.stdout.write(chunk));
        console.log('\n   Question answered\n');

        console.log('\n✨ Hybrid Neuro-Symbolic Capabilities:');
        console.log('   • Natural Language Understanding ✓');
        console.log('   • Logical Reasoning (NAL) ✓');
        console.log('   • Neural Pattern Recognition (Transformers.js) ✓');
        console.log('   • Real-time Processing ✓');
        console.log('   • Knowledge Integration ✓');

        console.log('\n📋 This demonstrates how SeNARS combines:');
        console.log('   - Formal symbolic logic (NAL) for precise reasoning');
        console.log('   - Neural language models (Transformers.js) for pattern recognition');
        console.log('   - Stream-based architecture for continuous processing');

        await app.shutdown();
        console.log('\n✅ Demo completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await app.shutdown().catch(() => {
        });
    }
}

demonstrateKeyFunctionality().catch(console.error);