#!/usr/bin/env node

/**
 * Advanced Agent REPL Demonstration
 * Shows the colorful visualization output that would appear in the terminal UI
 */

import {SessionEngine} from '../../src/session/SessionEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runAdvancedDemo() {
    console.log('🎨 ADVANCED SeNARS Agent REPL DEMONSTRATION');
    console.log('==========================================\n');

    try {
        // Use dummy provider for quick demo
        const dummyProvider = new DummyProvider({
            responseTemplate: 'Demo response for: {prompt}'
        });

        const engine = new SessionEngine({
            nar: {},
            lm: {}
        });

        engine.registerLMProvider('dummy', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🎯 AGENT CREATION DEMO\n');

        // Create an agent
        let result = await engine.executeCommand('agent', 'create', 'demo-agent');
        console.log('🎯 Command: agent create demo-agent');
        console.log('✅ Output: ' + result);
        console.log('');

        // Show agent status
        result = await engine.executeCommand('agent-status');
        console.log('🎯 Command: agent-status');
        console.log('✅ Output: ' + result);
        console.log('');

        console.log('🤖 NARSESE REASONING DEMO\n');

        // Process some Narsese statements
        await engine.processNarsese('<bird --> animal>{0.9, 0.8}.');
        console.log('🤖 Input: <bird --> animal>{0.9, 0.8}.');
        console.log('✅ Processed: Belief stored in memory');
        console.log('');

        await engine.processNarsese('<robin --> bird>{0.95, 0.7}.');
        console.log('🤖 Input: <robin --> bird>{0.95, 0.7}.');
        console.log('✅ Processed: Belief stored in memory');
        console.log('');

        // This should trigger inference
        await engine.processNarsese('<robin --> ?x>?');
        console.log('🤖 Input: <robin --> ?x>?');
        console.log('✅ Processed: Query submitted, system reasoning...');
        console.log('');

        console.log('🧠 AGENT COMMANDS DEMO\n');

        // Test reasoning
        result = await engine.executeCommand('reason', 'the', 'connection', 'between', 'birds', 'and', 'animals');
        console.log('🧠 Command: reason "the connection between birds and animals"');
        console.log('✅ Output: ' + result);
        console.log('');

        // Test planning
        result = await engine.executeCommand('plan', 'how', 'to', 'protect', 'birds');
        console.log('📝 Command: plan "how to protect birds"');
        console.log('✅ Output: ' + result);
        console.log('');

        // Test thinking
        result = await engine.executeCommand('think', 'about', 'conservation');
        console.log('💭 Command: think "about conservation"');
        console.log('✅ Output: ' + result);
        console.log('');

        console.log('📡 SYSTEM COMMANDS DEMO\n');

        // Show status
        result = await engine.executeCommand('status');
        console.log('📊 Command: status');
        console.log('✅ Output: ' + result);
        console.log('');

        console.log('🎨 TERMINAL UI SIMULATION');
        console.log('========================\n');

        // Simulate what the actual terminal UI would display
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│                    🤖 AGENT STATUS                      │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ • Active Agent: demo-agent                            │');
        console.log('│ • Type: default                                       │');
        console.log('│ • Status: processing                                  │');
        console.log('│ • Goals: 0                                            │');
        console.log('│ • Created: Nov 11, 2025                               │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');

        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│                    🧠 REASONING TRACE                   │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 16:21:45 | 🟢 NAL | Input: <bird --> animal>{0.9,0.8}. │');
        console.log('│ 16:21:46 | 🟢 NAL | Input: <robin --> bird>{0.95,0.7}. │');
        console.log('│ 16:21:47 | 🔵 LM  | Reasoning: connection between...   │');
        console.log('│ 16:21:48 | 🟣 AGENT | Plan generated for bird protect. │');
        console.log('│ 16:21:49 | 🟢 NAL | Deduction: <robin --> animal>?    │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');

        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│                    📊 METRICS DASHBOARD                 │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ Cycles: 127          │ Tasks Processed: 45            │');
        console.log('│ Rules Applied: 68    │ Avg. Belief Confidence: 0.82   │');
        console.log('│ Memory Concepts: 23  │ Active Connections: 1          │');
        console.log('│ Inference Depth: 3   │ Cache Hit Rate: 87%            │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');

        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│                    📝 TASK EDITOR                       │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ [>] <bird --> animal>. {0.90, 0.80} [P: 0.95]         │');
        console.log('│     ✓ Stored in memory                                 │');
        console.log('│ [>] <robin --> bird>. {0.95, 0.70} [P: 0.92]          │');
        console.log('│     ✓ Stored in memory                                 │');
        console.log('│ [?] <robin --> ?x>?                     [P: 0.88]      │');
        console.log('│     ⏳ Awaiting inference...                           │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');

        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│                    🌐 LOG VIEWER                        │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 🎯 FOCUSED: <bird --> animal>{0.90, 0.80} [P: 0.95]   │');
        console.log('│ 🤖 Agent Action: goal "protect birds"                  │');
        console.log('│ 🧠 Agent Decision: prioritize conservation efforts      │');
        console.log('│ 🔗 Hybrid Reasoning: NAL + LM collaboration achieved   │');
        console.log('│ 📊 System Stats: Memory=23MB, CPU=12%, Uptime=5m      │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');

        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│               🦀 STATUS BAR (Bottom)                    │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 🟢 LOCAL │ 🤖 demo-agent │ 🧠 NAL+LM │ 📊 Cycle: 127  │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');

        console.log('🎉 DEMONSTRATION COMPLETE!');
        console.log('\nThis is what users would see in the colorful, interactive Agent REPL UI:');
        console.log('• Multiple panels showing different aspects of reasoning');
        console.log('• Real-time updates as the system processes information');
        console.log('• Color-coded indicators for different types of activities');
        console.log('• Interactive components for agent management and reasoning trace');
        console.log('• Metrics dashboard showing system performance');

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

runAdvancedDemo();