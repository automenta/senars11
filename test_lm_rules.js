#!/usr/bin/env node

import {App} from './src/app/App.js';
import {Task} from './src/task/Task.js';
import {Punctuation} from './src/reason/utils/TaskUtils.js';

async function testLMRuleFunctionality() {
    console.log('🧪 Testing LM Rule Functionality...\n');
    
    // Create an app with LM enabled
    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/flan-t5-small',
            enabled: true,
            temperature: 0.1
        },
        subsystems: {
            lm: true
        }
    };

    const app = new App(config);
    
    try {
        console.log('🚀 Starting app...');
        const agent = await app.start({startAgent: true});
        
        console.log('✅ App started successfully\n');
        
        // Wait a bit for LM to initialize
        console.log('⏳ Waiting for LM to initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ LM initialization complete\n');
        
        console.log('💬 Testing natural language input: "Cats are mammals"');
        
        // Test the natural language input
        const startTime = Date.now();
        await agent.input('"Cats are mammals".');
        const inputTime = Date.now() - startTime;
        console.log(`✅ Input processed in ${inputTime}ms\n`);
        
        // Give some time for reasoning to occur
        console.log('⏳ Allowing time for reasoning...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('✅ Reasoning time completed\n');
        
        // Check what concepts exist in memory
        const concepts = agent.getConcepts();
        console.log(`📚 Memory contains ${concepts.length} concepts:`);
        for (const concept of concepts) {
            console.log(`   - ${concept.term.toString()}`);
        }
        
        // Check stats
        const stats = agent.getStats();
        console.log('\n📊 Final Stats:');
        console.log(`   - Total derivations: ${stats.streamReasoner?.totalDerivations || 0}`);
        console.log(`   - Sync rule executions: ${stats.streamReasoner?.ruleProcessorStats?.syncRuleExecutions || 0}`);
        console.log(`   - Async rule executions: ${stats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0}`);
        
        // Now try with a question to see if analogical reasoning works
        console.log('\n❓ Testing question: "Are cats animals"?');
        const questionStart = Date.now();
        await agent.input('"Are cats animals"?');
        const questionTime = Date.now() - questionStart;
        console.log(`✅ Question processed in ${questionTime}ms\n`);
        
        // Wait more for question processing
        console.log('⏳ Allowing more time for question processing...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        console.log('✅ Question processing time completed\n');
        
        // Check final state
        const finalConcepts = agent.getConcepts();
        console.log(`📚 Final memory contains ${finalConcepts.length} concepts:`);
        for (const concept of finalConcepts) {
            console.log(`   - ${concept.term.toString()}`);
        }
        
        const finalStats = agent.getStats();
        console.log('\n🎯 Final Results:');
        console.log(`   - Total derivations: ${finalStats.streamReasoner?.totalDerivations || 0}`);
        console.log(`   - Sync rule executions: ${finalStats.streamReasoner?.ruleProcessorStats?.syncRuleExecutions || 0}`);
        console.log(`   - Async rule executions: ${finalStats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0}`);
        
        if (finalStats.streamReasoner?.totalDerivations > 0) {
            console.log('\n🎉 SUCCESS: LM rules produced derivations!');
        } else {
            console.log('\n❌ NO DERIVATIONS: LM rules did not produce any output.');
        }
        
    } catch (error) {
        console.error('💥 Error during test:', error.message);
        console.error(error.stack);
    } finally {
        console.log('\n🛑 Shutting down app...');
        await app.shutdown();
        console.log('✅ Test completed.');
    }
}

// Run the test
testLMRuleFunctionality().catch(console.error);