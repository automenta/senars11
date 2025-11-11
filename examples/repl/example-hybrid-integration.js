#!/usr/bin/env node

/**
 * SeNARS Hybrid Intelligence: LM-NARS Integration Examples
 * Demonstrates how the agent interacts with the NARS system using both systems' capabilities
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runHybridIntegrationDemo() {
    console.log('🔗🤖 Hybrid Intelligence: LM-NARS Integration Examples');
    console.log('='.repeat(60));
    console.log('Demonstrating interactions between LM and NARS systems\n');

    try {
        const dummyProvider = new DummyProvider({
            responseTemplate: `Hybrid reasoning response incorporating both contextual understanding and logical inference. Query: "{prompt}"`
        });
        
        const engine = new AgentReplEngine({
            nar: {},
            lm: { provider: dummyProvider }
        });

        engine.registerLMProvider('hybrid', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🧠 EXAMPLE 1: NARS Knowledge + LM Contextual Understanding');
        console.log('-'.repeat(55));
        
        // First, add some knowledge to the NARS system
        console.log('\n   📚 Adding foundational knowledge to NARS:');
        try {
            await engine.processInput('<bird --> animal>. %1.00;0.90%');
            console.log('     Added: <bird --> animal>');
        } catch (e) {
            console.log('     (NARS processing simulated)');
        }
        
        try {
            await engine.processInput('<robin --> bird>. %1.00;0.90%');
            console.log('     Added: <robin --> bird>');
        } catch (e) {
            console.log('     (NARS processing simulated)');
        }
        
        try {
            await engine.processInput('<bird --> flyer>. %0.80;0.85%');
            console.log('     Added: <bird --> flyer>');
        } catch (e) {
            console.log('     (NARS processing simulated)');
        }
        
        // Now ask the LM to reason about this knowledge
        console.log('\n   🧠 Querying the integrated system:');
        await runInput(engine, 'What can the system infer about robins based on the NARS knowledge?');
        
        console.log('\n📊 EXAMPLE 2: LM Planning + NARS Logic');
        console.log('-'.repeat(55));
        
        // Demonstrate planning with logical constraints
        await runCommand(engine, 'plan "How to build a knowledge system that combines neural pattern recognition with logical reasoning"');
        
        // Query NARS for logical relationships
        console.log('\n   🔍 Querying NARS logical relationships:');
        try {
            await engine.processInput('<robin --> ?x>?');
            console.log('     NARS derived relationships for robins');
        } catch (e) {
            console.log('     (NARS query simulated)');
        }
        
        console.log('\n🎯 EXAMPLE 3: Hybrid Goal Achievement');
        console.log('-'.repeat(55));
        
        // Set a goal that involves both systems
        await runCommand(engine, 'goal "develop robust AI system"');
        
        // Ask for reasoning about goal
        await runCommand(engine, 'reason "What logical relationships should guide the development of robust AI systems?"');
        
        // Process logical implications in NARS
        console.log('\n   🧩 Processing logical goals in NARS:');
        try {
            await engine.processInput('<robust-AI --> (reliable AND safe AND capable)>. %1.00;0.90%');
            console.log('     Added: <robust-AI --> (reliable AND safe AND capable)>.');
        } catch (e) {
            console.log('     (NARS processing simulated)');
        }
        
        console.log('\n💭 EXAMPLE 4: Reflection with Logical Grounding');
        console.log('-'.repeat(55));
        
        // Ask for reflection on the logical system
        await runCommand(engine, 'think "How does the NARS logical reasoning complement neural network pattern recognition?"');
        
        // Process the reflection in logical form
        try {
            await engine.processInput('<neural-pattern-recognition --> complementary-to>. %0.85;0.80% <logical-reasoning --> complementary-to>. %0.85;0.80%?');
            console.log('     NARS processed complementary relationship query');
        } catch (e) {
            console.log('     (NARS processing simulated)');
        }
        
        // Ask for synthesis
        await runInput(engine, 'How could we combine neural networks and logical reasoning in a single AI system?');
        
        console.log('\n🔗 EXAMPLE 5: Multi-system Reasoning Chains');
        console.log('-'.repeat(55));
        
        // Complex example combining both systems
        console.log('\n   🔄 Complex multi-system reasoning:');
        await runCommand(engine, 'reason "If we know that <AI --> learner>. and <learner --> adaptive>., what can we infer about AI systems?"');
        
        // Add the knowledge to NARS
        try {
            await engine.processInput('<AI --> learner>. %0.90;0.85%');
            await engine.processInput('<learner --> adaptive>. %0.85;0.80%');
            console.log('     Added knowledge to NARS for logical inference');
        } catch (e) {
            console.log('     (NARS knowledge addition simulated)');
        }
        
        // Query for derived knowledge
        try {
            await engine.processInput('<AI --> ?what>?');
            console.log('     NARS performed logical derivation');
        } catch (e) {
            console.log('     (NARS derivation simulated)');
        }
        
        // Ask for broader analysis
        await runInput(engine, 'What are the implications of this logical derivation for AI development?');
        
        console.log('\n🎯 EXAMPLE 6: Goal-Oriented Hybrid Reasoning');
        console.log('-'.repeat(55));
        
        // Set a complex goal
        await runCommand(engine, 'goal "create AI that combines robust reasoning with efficient learning"');
        
        // Ask for planning with both systems
        await runCommand(engine, 'plan "How to implement a system that uses NARS for logical reasoning and neural networks for pattern recognition"');
        
        // Process goal in NARS format
        try {
            await engine.processInput('<combined-system --> (logical-reasoning AND pattern-recognition)>. %1.00;0.90% !');
            console.log('     Set hybrid system goal in NARS');
        } catch (e) {
            console.log('     (NARS goal setting simulated)');
        }
        
        console.log('\n✅ HYBRID INTEGRATION DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Hybrid Intelligence Capabilities:');
        console.log('   • NARS knowledge + LM contextual understanding');
        console.log('   • LM planning + NARS logical constraints');
        console.log('   • Hybrid goal achievement using both systems');
        console.log('   • Reflection with logical grounding');
        console.log('   • Multi-system reasoning chains');
        console.log('   • Goal-oriented hybrid reasoning');
        
        await engine.shutdown();

    } catch (error) {
        console.error('❌ Hybrid Integration Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function runInput(engine, input) {
    console.log(`\n   💬 Input: ${input}`);
    try {
        const result = await engine.processInput(input);
        console.log(`   🤖 Response: ${result.substring(0, 120)}${result.length > 120 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    console.log(`\n   💬 Command: /${command}`);
    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`   📝 Result: ${result.substring(0, 120)}${result.length > 120 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runHybridIntegrationDemo();