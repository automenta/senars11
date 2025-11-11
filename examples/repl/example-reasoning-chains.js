#!/usr/bin/env node

/**
 * SeNARS Complex Reasoning Chains: LM + NARS Integration
 * Demonstrates sophisticated reasoning chains involving both systems
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runComplexReasoningDemo() {
    console.log('🔗🧠 Complex Reasoning Chains: LM + NARS Integration');
    console.log('='.repeat(60));
    console.log('Showcasing sophisticated reasoning chains with both systems\n');

    try {
        const dummyProvider = new DummyProvider({
            responseTemplate: `Complex reasoning chain response: "{prompt}". Integrating logical inference with contextual understanding in a multi-step reasoning process.`
        });
        
        const engine = new AgentReplEngine({
            nar: {},
            lm: { provider: dummyProvider }
        });

        engine.registerLMProvider('reasoning-chain', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🧩 EXAMPLE 1: Multi-Step Logical Inference Chain');
        console.log('-'.repeat(50));
        
        // Establish knowledge base in NARS
        console.log('\n   📚 Building knowledge base:');
        await addNarseseKnowledge(engine, '<mammal --> animal>. %1.00;0.90%');
        await addNarseseKnowledge(engine, '<dog --> mammal>. %1.00;0.90%');
        await addNarseseKnowledge(engine, '<mammal --> warm-blooded>. %0.95;0.85%');
        await addNarseseKnowledge(engine, '<dog --> pet>. %0.80;0.80%');
        
        // Query the logical chain
        console.log('\n   🔍 Querying the reasoning chain:');
        await queryNarsese(engine, '<dog --> animal>?');
        await queryNarsese(engine, '<dog --> warm-blooded>?');
        
        // Ask LM to analyze the logical chain
        await runInput(engine, 'Analyze the logical inference chain: if dogs are mammals, and mammals are animals, what can we conclude about dogs?');
        
        console.log('\n🧠 EXAMPLE 2: Hypothetical Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Add hypothetical knowledge
        console.log('\n   🤔 Establishing hypothetical relationships:');
        await addNarseseKnowledge(engine, '<intelligent-system --> (problem-solving AND learning)>. %1.00;0.85%');
        await addNarseseKnowledge(engine, '<AI --> intelligent-system>. %0.90;0.80%');
        
        // Ask for hypothetical reasoning
        await runCommand(engine, 'think "What properties would we expect an AI system to have based on this logical structure?"');
        
        // Further logical exploration
        await queryNarsese(engine, '<AI --> (problem-solving AND learning)>?');
        
        console.log('\n📊 EXAMPLE 3: Causal Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Establish causal relationships in NARS
        console.log('\n   ⚡ Building causal chain:');
        await addNarseseKnowledge(engine, '<increased-training-data --> (better-performance AND higher-accuracy)>. %0.85;0.80%');
        await addNarseseKnowledge(engine, '<better-performance --> reduced-errors>. %0.90;0.75%');
        
        // Query causal implications
        await queryNarsese(engine, '<increased-training-data --> reduced-errors>?');
        
        // Ask LM for deeper causal analysis
        await runCommand(engine, 'reason "What are the potential confounding factors in the causal relationship between training data and system performance?"');
        
        console.log('\n🔄 EXAMPLE 4: Abductive Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Observe an effect and reason backward
        console.log('\n   🔍 Performing abductive reasoning:');
        await addNarseseKnowledge(engine, '<system-improvement --> (better-algorithms OR more-data OR better-hardware)>. %0.90;0.70%');
        await addNarseseKnowledge(engine, '<observed-improvement --> system-improvement>. %1.00;0.90%');
        
        // Query possible causes
        await queryNarsese(engine, '<observed-improvement --> ?cause>?');
        
        // LM analysis of abductive reasoning
        await runInput(engine, 'Given that we observe system improvement, what are the most likely underlying causes based on the knowledge base?');
        
        console.log('\n🔗 EXAMPLE 5: Analogical Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Establish analogical relationships
        console.log('\n   🧠 Creating analogical mappings:');
        await addNarseseKnowledge(engine, '<brain --> (neuron-network AND information-processing)>. %1.00;0.90%');
        await addNarseseKnowledge(engine, '<computer --> (processor-network AND information-processing)>. %1.00;0.85%');
        await addNarseseKnowledge(engine, '<neural-network --> (node-network AND learning-capability)>. %1.00;0.80%');
        
        // Query analogical relationships
        await queryNarsese(engine, '<neural-network --> similar-to>. %1.00;0.70% <brain --> similar-to>. %1.00;0.70%?');
        
        // LM analysis of analogies
        await runCommand(engine, 'think "How do neural networks serve as computational analogies to brain function?"');
        
        console.log('\n🎯 EXAMPLE 6: Goal-Oriented Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Establish goal hierarchy in NARS
        console.log('\n   🎯 Building goal structure:');
        await addNarseseKnowledge(engine, '<achieve-agi --> (develop-advanced-reasoning AND create-robust-learning)>. %1.00;0.85%');
        await addNarseseKnowledge(engine, '<develop-advanced-reasoning --> (integrate-symbolic-logic AND neural-pattern-recognition)>. %0.95;0.80%');
        
        // Query goal dependencies
        await queryNarsese(engine, '<achieve-agi --> ?subgoals>?');
        
        // Plan the goal achievement
        await runCommand(engine, 'plan "How to achieve AGI through integrated symbolic and neural approaches"');
        
        console.log('\n🌐 EXAMPLE 7: Cross-Domain Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Connect different domains of knowledge
        console.log('\n   🌐 Connecting domains:');
        await addNarseseKnowledge(engine, '<quantum-system --> probabilistic>. %1.00;0.90%');
        await addNarseseKnowledge(engine, '<neural-process --> probabilistic>. %0.80;0.75%');
        await addNarseseKnowledge(engine, '<quantum-cognition --> possible>. %0.70;0.60%');
        
        // Analyze cross-domain implications
        await runCommand(engine, 'reason "What insights about cognition might emerge from quantum theory?"');
        await queryNarsese(engine, '<quantum-cognition --> ?implications>?');
        
        console.log('\n🔄 EXAMPLE 8: Meta-Reasoning Chain');
        console.log('-'.repeat(50));
        
        // Apply reasoning to the reasoning process itself
        console.log('\n   🧠 Reflecting on reasoning:');
        await addNarseseKnowledge(engine, '<valid-reasoning --> (logical-consistency AND evidence-support)>. %1.00;0.90%');
        await addNarseseKnowledge(engine, '<logical-inference --> valid-reasoning>. %0.95;0.85%');
        
        // Question the reasoning system
        await runCommand(engine, 'think "How can we validate the quality of logical inferences made by this system?"');
        await queryNarsese(engine, '<valid-reasoning --> ?criteria>?');
        
        console.log('\n✅ COMPLEX REASONING CHAINS DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Reasoning Chain Capabilities:');
        console.log('   • Multi-step logical inference chains');
        console.log('   • Hypothetical reasoning and exploration');
        console.log('   • Causal reasoning with multiple links');
        console.log('   • Abductive reasoning (reasoning backward from effects)');
        console.log('   • Analogical reasoning and mappings');
        console.log('   • Goal-oriented reasoning chains');
        console.log('   • Cross-domain knowledge integration');
        console.log('   • Meta-reasoning (reasoning about reasoning)');
        
        await engine.shutdown();

    } catch (error) {
        console.error('❌ Complex Reasoning Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function addNarseseKnowledge(engine, narsese) {
    try {
        await engine.processInput(narsese);
        console.log(`     Added: ${narsese.substring(0, 40)}${narsese.length > 40 ? '...' : ''}`);
    } catch (e) {
        console.log(`     (Narsese addition: ${narsese.substring(0, 30)}...)`);
    }
}

async function queryNarsese(engine, query) {
    try {
        await engine.processInput(query);
        console.log(`     Queried: ${query.substring(0, 30)}${query.length > 30 ? '...' : ''}`);
    } catch (e) {
        console.log(`     (Query: ${query.substring(0, 30)}...)`);
    }
}

async function runInput(engine, input) {
    console.log(`\n   💬 Input: ${input.substring(0, 50)}${input.length > 50 ? '...' : ''}`);
    try {
        const result = await engine.processInput(input);
        console.log(`   🤖 Response: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    console.log(`\n   💬 Command: /${command.substring(0, 40)}${command.length > 40 ? '...' : ''}`);
    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`   📝 Result: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runComplexReasoningDemo();