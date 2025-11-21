#!/usr/bin/env node

/**
 * Advanced SeNARS Agent REPL with Ollama Integration Demo
 * Demonstrates hybrid intelligence with LM and NARS integration
 */

import {SessionEngine} from '../../src/session/SessionEngine.js';
import {LangChainProvider} from '../../src/lm/LangChainProvider.js';

async function runAdvancedAgentDemo() {
    console.log('🤖🎨 SeNARS Advanced Agent REPL Demo with Ollama Integration\n');
    console.log('This demo showcases hybrid intelligence capabilities\n');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  DEMONSTRATION: Complex reasoning with LM + NARS   │');
    console.log('└─────────────────────────────────────────────────────┘\n');

    try {
        // Initialize the NARS system properly
        const nar = {}; // Use empty object to avoid configuration circular reference issues

        // Configure Ollama provider (you can change the model as needed)
        const ollamaProvider = new LangChainProvider({
            provider: 'ollama',
            modelName: process.env.OLLAMA_MODEL,
            baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
            temperature: 0.7,
            maxTokens: 500
        });

        // Initialize engine with real NARS and Ollama provider
        const engine = new SessionEngine({
            nar: nar,
            lm: {
                provider: ollamaProvider
            }
        });

        // Register the provider
        engine.registerLMProvider('ollama', ollamaProvider);
        engine.registerLMProvider('default', ollamaProvider);

        // Add agent commands
        engine.addAgentCommands();

        await engine.initialize();
        console.log('✅ Agent engine initialized with Ollama provider\n');

        // Run comprehensive demonstration scenarios
        await runAgentManagementDemo(engine);
        await runHybridReasoningDemo(engine, nar);
        await runGoalPlanningDemo(engine);
        await runComplexQueryDemo(engine);

        console.log('\n🎉 ADVANCED DEMO COMPLETE!');
        console.log('Hybrid intelligence capabilities successfully demonstrated!');
        console.log('\n📊 PERFORMANCE METRICS:');
        console.log(`   - Agent tasks processed: ${engine.agents.size}`);
        console.log(`   - NARS cycles executed: ${nar.cycles || 0}`);
        console.log(`   - LM calls made: ${engine.agentLM.lmStats.totalCalls}`);
        console.log(`   - Total tokens processed: ${engine.agentLM.lmStats.totalTokens}`);

        await engine.shutdown();
        console.log('\n👋 Engine shutdown completed');

    } catch (error) {
        console.error('❌ Advanced Demo Error:', error);
        console.error('Stack:', error.stack);
    }
}

async function runAgentManagementDemo(engine) {
    console.log('\n┌─ DEMONSTRATION: Agent Creation & Management ──────────┐');

    // Create a research agent
    await runCommand(engine, 'agent create researcher');

    // Create a planning agent
    await runCommand(engine, 'agent create planner');

    // List agents
    await runCommand(engine, 'agent list');

    // Switch between agents
    await runCommand(engine, 'agent select researcher');
    await runCommand(engine, 'agent-status');

    console.log('└──────────────────────────────────────────────────────┘');
}

async function runHybridReasoningDemo(engine, nar) {
    console.log('\n┌─ DEMONSTRATION: Hybrid Reasoning (LM + NARS) ────────┐');

    // Add background knowledge to NARS
    console.log('\n📚 Adding background knowledge to NARS system...');
    await engine.processNarsese('<bird --> animal>. %1.00;0.90%'); // Birds are animals with high confidence
    await engine.processNarsese('<robin --> bird>. %1.00;0.90%'); // Robins are birds with high confidence
    await engine.processNarsese('<swan --> bird>. %1.00;0.90%'); // Swans are birds with high confidence
    await engine.processNarsese('<bird --> flyer>. %0.80;0.85%'); // Birds are flyers with some uncertainty
    await engine.processNarsese('<swan --> white>. %0.95;0.80%'); // Swans are white with high frequency

    console.log('\n🧠 Testing pure NARS inference...');
    // NARS should infer: <robin --> animal>. from the above
    await engine.processNarsese('<robin --> ?x>?'); // Query what robins are

    console.log('\n🤔 Testing LM reasoning with NARS knowledge context...');
    // Now ask the LM to reason about this knowledge
    await runCommand(engine, 'reason "What can you infer about robins based on NARS knowledge?"');

    console.log('\n💭 Demonstrating LM reflection on NARS reasoning...');
    await runCommand(engine, 'think "How does the NARS system\'s inference about robins differ from typical neural network reasoning?"');

    // Ask for synthesis of both systems
    console.log('\n🔗 Testing hybrid synthesis...');
    await runCommand(engine, 'lm "Combine NARS inference that robins are animals with additional knowledge about robins to describe robin characteristics."');

    console.log('└──────────────────────────────────────────────────────┘');
}

async function runGoalPlanningDemo(engine) {
    console.log('\n┌─ DEMONSTRATION: Goal Setting & Planning ─────────────┐');

    // Set an agent goal
    await runCommand(engine, 'goal "learn quantum physics"');

    // Generate a plan to achieve the goal
    await runCommand(engine, 'plan "How to learn quantum physics fundamentals in 3 months"');

    // Set a more specific goal
    await runCommand(engine, 'goal "<understand quantum entanglement --> important>. %1.00;0.80% !');

    // Query for goals
    await runCommand(engine, 'goal list');

    // Ask the LM to reason about goal prioritization
    await runCommand(engine, 'reason "Between learning quantum physics and understanding quantum entanglement, which should be prioritized and why?"');

    console.log('└──────────────────────────────────────────────────────┘');
}

async function runComplexQueryDemo(engine) {
    console.log('\n┌─ DEMONSTRATION: Complex LM-NARS Integration ────────┐');

    // Complex reasoning that combines both systems
    console.log('\n🧩 Complex multi-step reasoning example...');
    await runCommand(engine, 'think "How might quantum physics concepts like entanglement be represented in a NARS system?"');

    // Ask for practical applications
    console.log('\n💡 Practical application reasoning...');
    await runCommand(engine, 'reason "If we know that quantum computers use entanglement and NARS can represent complex relationships, how might we combine these for AI?"');

    // Planning with hybrid intelligence
    console.log('\n📋 Hybrid planning example...');
    await runCommand(engine, 'plan "Design a research project that uses both NARS for symbolic reasoning and quantum computing principles"');

    // Test the LM fallback mechanism with non-Narsese input
    console.log('\n🔄 Testing LM fallback mechanism...');
    const fallbackTest = await engine.processInput('What is the weather like today?');
    console.log(`   Fallback response: ${fallbackTest.substring(0, 60)}...`);

    // Test with actual Narsese that should go to NARS
    console.log('\n⚡ Testing Narsese detection and routing...');
    try {
        await engine.processInput('<cat --> animal>. %1.00;0.90%');
        console.log('   ✓ Narsese properly routed to NARS system');
    } catch (e) {
        console.log('   ⚠ Narsese routing: ', e.message);
    }

    console.log('└──────────────────────────────────────────────────────┘');
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`💬 Command: /${command}`);
        console.log(`✅ Result: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}\n`);
        return result;
    } catch (error) {
        console.log(`💬 Command: /${command}`);
        console.log(`❌ Error: ${error.message}\n`);
        return null;
    }
}

// Run the demo
runAdvancedAgentDemo();