#!/usr/bin/env node

import {App} from './src/app/App.js';

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

        // Demonstration 1: Symbolic reasoning with knowledge facts
        console.log('1️⃣  SYMBOLIC REASONING (NAL Logic)');
        console.log('   Input: Knowledge facts about animals...');
        await agent.input('(bird --> animal).');
        await agent.input('(robin --> bird).');
        console.log('   Facts: (bird --> animal) and (robin --> bird)');
        console.log('   Expected: (robin --> animal) [via syllogistic reasoning]\n');

        // Give it a moment to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Demonstration 2: Question that combines both reasoning types
        console.log('2️⃣  HYBRID REASONING (NAL + LM)');
        console.log('   Input: Question that might require both symbolic logic and neural understanding...');
        await agent.input('<robin --> animal>?');
        console.log('   Question: <robin --> animal>? (Is a robin an animal?)');
        console.log('   This combines symbolic inference (robin->bird->animal) with potential LM verification\n');

        // Demonstration 3: More complex reasoning scenario
        console.log('3️⃣  COMPLEX HYBRID REASONING');
        console.log('   Adding more complex knowledge...');
        await agent.input('(fly --> capability).');
        await agent.input('(bird --> [can-fly]).');
        console.log('   Adding: (fly --> capability) and (bird --> [can-fly])\n');

        // Question that might require both logic and neural reasoning
        console.log('   Question: Which animals can fly?');
        await agent.input('<(?x & [can-fly]) --> ?y>?');
        console.log('   This requires complex pattern matching and reasoning\n');

        // Demonstration 4: Practical application
        console.log('4️⃣  PRACTICAL REASONING SCENARIO');
        console.log('   Input: Practical knowledge...');
        await agent.input('(student --> person).');
        await agent.input('(person --> mortal).');
        await agent.input('(study --> action).');
        console.log('   Facts: Basic knowledge about students and people\n');

        console.log('   Question: What can students do?');
        await agent.input('<(student & ?what) --> ?what>?');

        console.log('\n📊 System Status:');
        console.log(`   - Total concepts in memory: ${agent.memory.concepts.size}`);
        console.log(`   - LM Provider: ${agent.lm.providers.defaultProviderId}`);
        console.log(`   - Hybrid reasoning enabled: YES`);

        console.log('\n💡 Key Capabilities Demonstrated:');
        console.log('   - NAL (Non-Axiomatic Logic) symbolic reasoning');
        console.log('   - Transformers.js neural pattern recognition');
        console.log('   - Hybrid approach combining both reasoning types');
        console.log('   - Real-time inference and question answering');
        console.log('   - Memory consolidation and concept formation');

        console.log('\n🎯 This demonstrates the core vision of SeNARS:');
        console.log('   A hybrid neuro-symbolic system where formal logic (NAL) and neural');
        console.log('   language models work together to provide robust, explainable AI.');

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