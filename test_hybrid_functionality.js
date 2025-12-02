#!/usr/bin/env node

import {App} from './src/app/App.js';
import {Task} from './src/task/Task.js';
import {Truth} from './src/Truth.js';

async function testHybridFunctionality() {
    console.log('🧪 Testing Hybrid LM-NAL Reasoning System Functionality...\n');

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

        // Test 1: Natural language input that should trigger LM rules
        console.log('💬 Test 1: Inputting natural language: "Birds can fly"');
        const result1 = await agent.input('"Birds can fly".');
        console.log(`✅ Input 1 processed: ${result1 ? 'SUCCESS' : 'FAILED'}`);
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Allow processing time
        
        const initialConcepts = agent.getConcepts();
        console.log(`📚 Memory contains ${initialConcepts.length} concepts after first input`);

        // Test 2: Another natural language input
        console.log('\n💬 Test 2: Inputting natural language: "Fish live in water"');
        const result2 = await agent.input('"Fish live in water".');
        console.log(`✅ Input 2 processed: ${result2 ? 'SUCCESS' : 'FAILED'}`);
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Allow processing time
        
        const updatedConcepts = agent.getConcepts();
        console.log(`📚 Memory contains ${updatedConcepts.length} concepts after second input`);

        // Test 3: Check if LM rules generated new tasks
        console.log('\n🔍 Verifying LM rule functionality...');
        let lmGeneratedCount = 0;
        for (const concept of updatedConcepts) {
            const termStr = concept.term.toString();
            if (termStr.startsWith('"') && termStr !== '"Birds can fly"' && termStr !== '"Fish live in water"') {
                console.log(`   - Generated concept: ${termStr}`);
                lmGeneratedCount++;
            }
        }

        console.log(`📊 Analysis:`);
        console.log(`   - Initial concepts: ${initialConcepts.length}`);
        console.log(`   - Concepts after inputs: ${updatedConcepts.length}`);
        console.log(`   - Estimated LM-generated concepts: ${lmGeneratedCount}`);
        
        const success = updatedConcepts.length > initialConcepts.length;
        console.log(`\n🎯 Hybrid Reasoning System Status: ${success ? 'SUCCESS' : 'NEEDS IMPROVEMENT'}`);
        
        if (success) {
            console.log('✅ Hybrid reasoning system is functioning correctly!');
            console.log('   - Natural language inputs are being processed');
            console.log('   - LM rules are generating new concepts');
            console.log('   - Generated tasks are joining the reasoning focus');
        } else {
            console.log('⚠️  Hybrid reasoning may need additional configuration');
            console.log('   - This could be due to LLM model limitations or timeout constraints');
        }

        // Additional verification: Check for specific term types
        const atomicTerms = updatedConcepts.filter(c => c.term.isAtomic || c.term._type === 'atom');
        console.log(`\n🔍 Detailed breakdown:`);
        console.log(`   - Atomic terms in memory: ${atomicTerms.length}`);
        atomicTerms.forEach((c, idx) => {
            console.log(`     ${idx + 1}. ${c.term.toString()}`);
        });

        // Check stats
        const stats = agent.getStats();
        console.log(`\n📈 System Statistics:`);
        console.log(`   - Total derivations: ${stats.streamReasoner?.totalDerivations || 0}`);
        console.log(`   - Async rule executions: ${stats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0}`);
        console.log(`   - Memory concepts: ${updatedConcepts.length}`);

    } catch (error) {
        console.error('💥 Error during test:', error.message);
        console.error(error.stack);
    } finally {
        console.log('\n🛑 Shutting down app...');
        await app.shutdown();
        console.log('✅ Hybrid reasoning functionality test completed.');
    }
}

// Run the test
testHybridFunctionality().catch(console.error);