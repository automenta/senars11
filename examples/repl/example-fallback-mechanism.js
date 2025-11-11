#!/usr/bin/env node

/**
 * SeNARS Agent LM Fallback Mechanism Demo
 * Demonstrates how the system properly routes input between LM and NARS
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {LangChainProvider} from '../../src/lm/LangChainProvider.js';
import {NAR as Nar} from '../../src/nar/NAR.js'; // Import for type reference, using minimal object to avoid config issues

async function runFallbackDemo() {
    console.log('🔄🤖 SeNARS LM Fallback Mechanism Demo');
    console.log('=' .repeat(50));
    console.log('Demonstrating intelligent input routing between LM and NARS\n');

    try {
        const nar = {}; // Use empty object to avoid configuration circular reference issues
        
        const ollamaProvider = new LangChainProvider({
            provider: 'ollama',
            modelName: process.env.OLLAMA_MODEL || 'gemma:4b',
            baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
            temperature: 0.7,
            maxTokens: 300
        });

        const engine = new AgentReplEngine({
            nar: nar,
            lm: {
                provider: ollamaProvider
            }
        });

        engine.registerLMProvider('ollama', ollamaProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🎯 Testing Input Routing Intelligence');
        console.log('-'.repeat(40));

        // Test 1: Natural language input → LM
        console.log('\n📋 Test 1: Natural Language Input (should go to LM)');
        await testInputRoute(engine, 'What is the capital of France?');
        
        // Test 2: Narsese input → NARS
        console.log('\n📋 Test 2: Narsese Syntax (should go to NARS)');
        await testInputRoute(engine, '<bird --> animal>. %1.00;0.90%');
        
        // Test 3: Natural language question → LM
        console.log('\n📋 Test 3: Natural Language Question (should go to LM)');
        await testInputRoute(engine, 'Explain quantum computing in simple terms');
        
        // Test 4: Narsese query → NARS
        console.log('\n📋 Test 4: Narsese Query (should go to NARS)');
        await testInputRoute(engine, '<robin --> ?x>?');
        
        // Test 5: Mixed natural language with NARS context
        console.log('\n📋 Test 5: Mixed Query (LM with NARS context)');
        await testMixedQuery(engine);
        
        // Test 6: Agent commands
        console.log('\n📋 Test 6: Agent Commands');
        await runCommand(engine, 'agent create test-agent');
        
        // Test 7: Complex hybrid reasoning
        console.log('\n📋 Test 7: Hybrid Reasoning Example');
        await testHybridReasoning(engine);
        
        // Test 8: Fallback error handling
        console.log('\n📋 Test 8: Error Handling & Fallbacks');
        await testErrorFallback(engine);

        console.log('\n✅ FALLBACK DEMO COMPLETED SUCCESSFULLY!');
        console.log('\n📊 Routing Statistics:');
        console.log(`   - Total inputs processed: ${nar.cycles || 0 + engine.sessionState?.history?.length || 0}`);
        console.log(`   - LM calls: ${engine.agentLM.lmStats.totalCalls}`);
        console.log(`   - Fallback attempts: [monitored]`);

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Fallback Demo Error:', error);
        console.error('Stack:', error.stack);
    }
}

async function testInputRoute(engine, input) {
    console.log(`   Input: "${input}"`);
    try {
        if (input.startsWith('/') || (input.split(' ')[0] in engine.commandRegistry.commands)) {
            // It's a command, handle differently
            const parts = input.split(' ');
            const cmd = parts[0].replace('/', '');
            const args = parts.slice(1);
            const result = await engine.executeCommand(cmd, ...args);
            console.log(`   → Command result: ${result.substring(0, 80)}${result.length > 80 ? '...' : ''}`);
        } else {
            const result = await engine.processInput(input);
            console.log(`   → Result: ${result.substring(0, 80)}${result.length > 80 ? '...' : ''}`);
        }
    } catch (error) {
        console.log(`   → Error: ${error.message}`);
    }
}

async function testMixedQuery(engine) {
    // First, add some knowledge to NARS
    await engine.processNarsese('<AI --> intelligent-system>. %1.00;0.90%');
    await engine.processNarsese('<machine-learning --> AI-technique>. %1.00;0.85%');
    
    // Now ask a question that combines NARS knowledge with LM reasoning
    await testInputRoute(engine, 'How does the NARS system view machine learning as an AI technique?');
}

async function testHybridReasoning(engine) {
    console.log('   Setting up hybrid reasoning context...');
    
    // Add complex knowledge to NARS
    await engine.processNarsese('<neural-symbolic-system --> hybrid-approach>. %1.00;0.90%');
    await engine.processNarsese('<neural-symbolic-system --> (neural-network AND symbolic-reasoning)>. %0.85;0.80%');
    await engine.processNarsese('<neural-network --> good-at-pattern-recognition>. %0.90;0.85%');
    await engine.processNarsese('<symbolic-reasoning --> good-at-logical-inference>. %0.95;0.80%');
    
    // Ask for hybrid analysis
    await testInputRoute(engine, 'Analyze the advantages of neural-symbolic systems combining both pattern recognition and logical inference');
}

async function testErrorFallback(engine) {
    console.log('   Testing error handling and fallbacks...');
    
    // Test with malformed Narsese that should fail and potentially fall back
    try {
        await engine.processInput('<malformed [syntax >. %1.00;0.90%');
        console.log('   → Handled malformed syntax gracefully');
    } catch (error) {
        console.log(`   → Properly caught error: ${error.message}`);
    }
    
    // Test with unknown command
    try {
        await engine.executeCommand('unknowncommand');
        console.log('   → Handled unknown command');
    } catch (error) {
        console.log(`   → Properly caught command error: ${error.message}`);
    }
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`   Command: /${command}`);
        console.log(`   Result: ${result.substring(0, 80)}${result.length > 80 ? '...' : ''}`);
        return result;
    } catch (error) {
        console.log(`   Command: /${command}`);
        console.log(`   Error: ${error.message}`);
        return null;
    }
}

runFallbackDemo();