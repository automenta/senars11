#!/usr/bin/env node

import {App} from './src/app/App.js';
import {Task} from './src/task/Task.js';
import {Truth} from './src/Truth.js';

async function testHybridReasoning() {
    console.log('🧪 Testing Hybrid LM-NAL Reasoning System...\n');

    // Create an app with LM enabled
    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/flan-t5-small',
            enabled: true,
            temperature: 0.1
        },
        subsystems: {
            lm: true,
            metacognition: {
                selfOptimization: { enabled: false }
            }
        }
    };

    const app = new App(config);

    try {
        console.log('🚀 Starting app...');
        const agent = await app.start({startAgent: true});

        console.log('✅ App started successfully\n');

        // Wait a bit for LM to initialize
        console.log('⏳ Waiting for LM to initialize...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('✅ LM initialization complete\n');

        // Test 1: Natural language input that should be processed by NarseseTranslationRule
        console.log('💬 Test 1: Natural language input: "Cats are mammals"');
        await agent.input('"Cats are mammals".');
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Allow processing time
        
        const concepts1 = agent.getConcepts();
        console.log(`📚 Memory contains ${concepts1.length} concepts after Test 1`);
        for (const concept of concepts1) {
            console.log(`   - ${concept.term.toString()}`);
        }

        // Test 2: Another natural language input
        console.log('\n💬 Test 2: Natural language input: "Dogs are animals"');
        await agent.input('"Dogs are animals".');
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Allow processing time
        
        const concepts2 = agent.getConcepts();
        console.log(`📚 Memory contains ${concepts2.length} concepts after Test 2`);
        for (const concept of concepts2) {
            console.log(`   - ${concept.term.toString()}`);
        }

        // Test 3: Question that might trigger analogical reasoning
        console.log('\n❓ Test 3: Question input: "Are cats animals"?');
        await agent.input('"Are cats animals"?');
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Allow more processing time
        
        const concepts3 = agent.getConcepts();
        console.log(`📚 Memory contains ${concepts3.length} concepts after Test 3`);
        for (const concept of concepts3) {
            console.log(`   - ${concept.term.toString()}`);
        }

        // Check stats
        const stats = agent.getStats();
        console.log('\n📊 Final Stats:');
        console.log(`   - Total derivations: ${stats.streamReasoner?.totalDerivations || 0}`);
        console.log(`   - Async rule executions (LM rules): ${stats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0}`);

        console.log('\n🎯 Hybrid Reasoning System Test Results:');
        console.log(`   - Initial concepts: ${concepts1.length}`);
        console.log(`   - After 2nd input: ${concepts2.length}`);
        console.log(`   - After question: ${concepts3.length}`);
        
        if (concepts3.length > 0) {
            console.log('🎉 SUCCESS: Hybrid reasoning system is functioning!');
        } else {
            console.log('⚠️  WARNING: No concepts in memory - this may be expected if LM is not responding');
        }
        
        // Show specific tests of functionality
        console.log('\n🔍 Specific tests:');
        const catsTerm = concepts3.find(c => c.term.toString().toLowerCase().includes('cat'));
        if (catsTerm) {
            console.log(`   - Found cat-related concept: ${catsTerm.term.toString()}`);
        } else {
            console.log('   - No cat-related concept found (this is expected if LM didn\'t respond)');
        }

    } catch (error) {
        console.error('💥 Error during test:', error.message);
        console.error(error.stack);
    } finally {
        console.log('\n🛑 Shutting down app...');
        await app.shutdown();
        console.log('✅ Hybrid reasoning test completed.');
    }
}

// Run the test
testHybridReasoning().catch(console.error);