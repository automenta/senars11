#!/usr/bin/env node

/**
 * SeNARS LM Reasoning, Planning & Reflection Capabilities
 * Demonstrates the advanced cognitive capabilities of the LM integration
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runAdvancedCapabilitiesDemo() {
    console.log('🧠🚀 LM Reasoning, Planning & Reflection Capabilities');
    console.log('='.repeat(60));
    console.log('Demonstrating advanced cognitive capabilities of the LM system\n');

    try {
        const dummyProvider = new DummyProvider({
            responseTemplate: `Advanced cognitive response to: "{prompt}". This demonstrates reasoning, planning, and reflection capabilities of the integrated LM system.`
        });

        const engine = new AgentReplEngine({
            nar: {},
            lm: {provider: dummyProvider}
        });

        engine.registerLMProvider('advanced-cog', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🤔 EXAMPLE 1: Advanced Reasoning Capabilities');
        console.log('-'.repeat(45));

        // Test the reasoning command specifically
        console.log('\n   🧠 Direct reasoning command:');
        await runCommand(engine, 'reason "the implications of Gödel\'s incompleteness theorems for artificial intelligence systems"');

        console.log('\n   🧠 Complex logical reasoning:');
        await runCommand(engine, 'reason "How might quantum entanglement principles be applied to improve neural network architectures?"');

        console.log('\n   🧠 Causal reasoning:');
        await runCommand(engine, 'reason "What are the likely consequences of widespread automation on societal structures?"');

        console.log('\n📋 EXAMPLE 2: Planning Capabilities');
        console.log('-'.repeat(45));

        // Test the planning command specifically
        console.log('\n   📋 Research project planning:');
        await runCommand(engine, 'plan "How to conduct a comprehensive study on the effectiveness of hybrid AI systems"');

        console.log('\n   📋 Implementation planning:');
        await runCommand(engine, 'plan "Steps to build an AI system capable of learning from few examples like humans"');

        console.log('\n   📋 Resource allocation planning:');
        await runCommand(engine, 'plan "An efficient approach to scaling neural networks while maintaining interpretability"');

        console.log('\n💭 EXAMPLE 3: Reflection Capabilities');
        console.log('-'.repeat(45));

        // Test the thinking/reflecting command specifically
        console.log('\n   💭 Conceptual reflection:');
        await runCommand(engine, 'think "What does it mean for an artificial system to truly understand rather than just process information?"');

        console.log('\n   💭 Meta-cognitive reflection:');
        await runCommand(engine, 'think "How might an AI system become aware of its own reasoning processes and limitations?"');

        console.log('\n   💭 Evaluative reflection:');
        await runCommand(engine, 'think "What are the strengths and weaknesses of current approaches to artificial general intelligence?"');

        console.log('\n🔗 EXAMPLE 4: Integrated Cognitive Tasks');
        console.log('-'.repeat(45));

        console.log('\n   🔄 Reasoning + Planning combination:');
        await runCommand(engine, 'reason "Design a research methodology to test neural-symbolic integration effectiveness"');

        console.log('\n   🔄 Reflection + Planning combination:');
        await runCommand(engine, 'think "What are the key challenges in the current paradigm and how should we approach them?"');

        console.log('\n   🔄 Multi-faceted cognitive task:');
        await runCommand(engine, 'lm "Synthesize insights about consciousness, computation, and cognition to propose a framework for measuring artificial understanding"');

        console.log('\n🎯 EXAMPLE 5: Problem-Solving Reasoning Chains');
        console.log('-'.repeat(45));

        console.log('\n   🔗 Sequential reasoning chain:');
        await runCommand(engine, 'reason "If we accept that intelligence emerges from pattern recognition, what are the implications for AI safety and alignment?"');

        console.log('\n   🧩 Multi-perspective analysis:');
        await runCommand(engine, 'think "Analyze the alignment problem from technical, philosophical, and sociological perspectives"');

        console.log('\n   📊 Systems thinking approach:');
        await runCommand(engine, 'plan "A comprehensive strategy for ensuring beneficial AI development across multiple stakeholders"');

        console.log('\n✅ ADVANCED CAPABILITIES DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Cognitive Capabilities Demonstrated:');
        console.log('   • Logical and causal reasoning');
        console.log('   • Strategic and implementation planning');
        console.log('   • Conceptual and meta-cognitive reflection');
        console.log('   • Integrated multi-capability tasks');
        console.log('   • Complex problem-solving chains');

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Advanced Capabilities Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    console.log(`\n   💬 Command: /${command}`);
    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`   📝 Result: ${result.substring(0, 150)}${result.length > 150 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runAdvancedCapabilitiesDemo();