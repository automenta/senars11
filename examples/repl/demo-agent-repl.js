#!/usr/bin/env node

/**
 * Agent REPL Demonstration Script
 * Shows how the Agent REPL works with various inputs and visualizations
 */

import {AgentReplEngine} from './src/repl/AgentReplEngine.js';
import {DummyProvider} from './src/lm/DummyProvider.js';

async function runAgentDemo() {
    console.log('🎨 SeNARS Agent REPL Demo\n');
    console.log('This demo shows the Agent REPL in action with various inputs\n');

    try {
        // Use a dummy provider for this demo to avoid heavy model loading
        const dummyProvider = new DummyProvider({
            responseTemplate: 'Processed: {prompt}. This is a demo response showing the Agent REPL functionality.'
        });

        const engine = new AgentReplEngine({
            nar: {},
            lm: {}
        });

        // Register the provider
        engine.registerLMProvider('dummy', dummyProvider);

        // Add agent commands
        engine.addAgentCommands();

        await engine.initialize();

        // Simulate various commands that would show in the colorful UI
        console.log('🎨 DEMONSTRATION: Agent Creation and Management\n');

        await runCommand(engine, 'agent create researcher');
        await runCommand(engine, 'agent list');
        await runCommand(engine, 'agent-status');

        console.log('\n🎨 DEMONSTRATION: Goal Setting and Planning\n');

        await runCommand(engine, 'goal "learn about quantum physics"');
        await runCommand(engine, 'plan "how to learn quantum physics for beginners"');
        await runCommand(engine, 'goal list');

        console.log('\n🎨 DEMONSTRATION: Thinking and Reasoning\n');

        await runCommand(engine, 'think "what are the implications of quantum entanglement"');
        await runCommand(engine, 'reason "the relationship between AI and quantum computing"');

        console.log('\n🎨 DEMONSTRATION: Narsese Processing\n');

        await engine.processNarsese('<bird --> animal>.');
        await engine.processNarsese('<robin --> bird>.');
        await engine.processNarsese('<robin --> ?x>?');

        console.log('\n🎨 DEMONSTRATION: Language Model Interaction\n');

        await runCommand(engine, 'lm "What is the capital of France?"');
        await runCommand(engine, 'providers list');

        console.log('\n🎨 DEMONSTRATION: System Commands\n');

        await runCommand(engine, 'status');
        await runCommand(engine, 'memory');

        console.log('\n🎉 DEMO COMPLETE: Agent REPL functionality demonstrated!\n');

        // Show what the UI would display
        console.log('🖼️  VISUALIZATION SIMULATION:');
        console.log('┌─ Agent Status Panel ──────────────────────┐');
        console.log('│ 🤖 Active Agent: researcher              │');
        console.log('│    Type: default                         │');
        console.log('│    Status: idle                          │');
        console.log('│    Goals: 1                              │');
        console.log('│    Created: [timestamp]                  │');
        console.log('└──────────────────────────────────────────┘');
        console.log('');
        console.log('┌─ Reasoning Trace ─────────────────────────┐');
        console.log('│ 10:30:01 | 🟢 NAL | <bird --> animal>.   │');
        console.log('│ 10:30:02 | 🟢 NAL | <robin --> bird>.    │');
        console.log('│ 10:30:03 | 🔵 LM  | Question answered     │');
        console.log('│ 10:30:04 | 🟣 AGENT | Goal set: learn... │');
        console.log('└──────────────────────────────────────────┘');
        console.log('');
        console.log('┌─ Metrics Dashboard ───────────────────────┐');
        console.log('│ 📊 Cycles: 42                           │');
        console.log('│ 🎯 Tasks Processed: 15                  │');
        console.log('│ 🔢 Rules Applied: 23                    │');
        console.log('│ 🧠 Knowledge Base: 8 concepts          │');
        console.log('└──────────────────────────────────────────┘');

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Demo Error:', error);
        console.error('Stack:', error.stack);
    }
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`💬 Command: /${command}`);
        console.log(`✅ Result: ${result}\n`);
    } catch (error) {
        console.log(`💬 Command: /${command}`);
        console.log(`❌ Error: ${error.message}\n`);
    }
}

runAgentDemo();