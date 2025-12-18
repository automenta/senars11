#!/usr/bin/env node

/**
 * SeNARS Agent Creation & Management Demonstration
 * Showcases comprehensive agent lifecycle management and capabilities
 */

import {SessionEngine} from '../../src/session/SessionEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runAgentManagementDemo() {
    console.log('🤖🔧 Agent Creation & Management Demonstration');
    console.log('='.repeat(60));
    console.log('Comprehensive showcase of agent lifecycle management\n');

    try {
        const dummyProvider = new DummyProvider({
            responseTemplate: `Agent management response for: "{prompt}". Demonstrating sophisticated agent capabilities and management.`
        });

        const engine = new SessionEngine({
            nar: {},
            lm: {provider: dummyProvider}
        });

        engine.registerLMProvider('management', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('📋 EXAMPLE 1: Agent Creation & Initialization');
        console.log('-'.repeat(45));

        // Create different types of agents
        await runCommand(engine, 'agent create researcher');
        await runCommand(engine, 'agent create planner');
        await runCommand(engine, 'agent create analyzer');
        await runCommand(engine, 'agent create coordinator');

        // List all agents
        await runCommand(engine, 'agent list');

        console.log('\n📊 EXAMPLE 2: Agent Status & Information Management');
        console.log('-'.repeat(45));

        // Check status of active agent
        await runCommand(engine, 'agent-status');

        // Select different agents and check their status
        await runCommand(engine, 'agent select researcher');
        await runCommand(engine, 'agent-status');

        await runCommand(engine, 'agent select planner');
        await runCommand(engine, 'agent-status');

        await runCommand(engine, 'agent list');

        console.log('\n🎯 EXAMPLE 3: Goal Management for Agents');
        console.log('-'.repeat(45));

        // Set goals for different agents (using proper Narsese format for the command)
        await runCommand(engine, 'goal "improve-research-methodology --> important>. %1.00;0.90% !');
        await runCommand(engine, 'goal "optimize-planning-algorithms --> priority>. %0.95;0.85% !');

        // List goals
        await runCommand(engine, 'goal list');

        console.log('\n🧠 EXAMPLE 4: Agent Reasoning & Cognitive Tasks');
        console.log('-'.repeat(45));

        // Have agents perform reasoning tasks
        await runCommand(engine, 'think "What are the core competencies needed for effective research systems?"');
        await runCommand(engine, 'reason "How should planning systems prioritize conflicting objectives?"');
        await runCommand(engine, 'think "What cognitive architectures best support adaptive analysis?"');

        console.log('\n📋 EXAMPLE 5: Multi-Agent Coordination');
        console.log('-'.repeat(45));

        // Demonstrate coordination between agents
        await runCommand(engine, 'agent select coordinator');
        await runInput(engine, 'How can the research, planning, and analysis agents work together effectively?');
        await runCommand(engine, 'plan "Coordination strategy for multi-agent system"');

        console.log('\n🔄 EXAMPLE 6: Agent State & Memory Management');
        console.log('-'.repeat(45));

        // Show agent memory and state changes
        await runCommand(engine, 'agent-status');

        // Perform various activities that would update agent state
        await runCommand(engine, 'think "Reflecting on current system performance"');
        await runCommand(engine, 'lm "Assess the current state of the multi-agent system"');

        console.log('\n🔗 EXAMPLE 7: Hybrid Agent Operations');
        console.log('-'.repeat(45));

        // Combine agent operations with NARS processing
        await runInput(engine, '<effective-agent --> (adaptive AND goal-oriented AND knowledgeable)>. %1.00;0.90%');
        await runCommand(engine, 'think "How do these agent characteristics enable effective hybrid intelligence?"');
        await runCommand(engine, 'reason "What relationships should exist between different agent roles?"');

        console.log('\n⚙️  EXAMPLE 8: Agent Configuration & Customization');
        console.log('-'.repeat(45));

        // Show provider management (which relates to agent configuration)
        await runCommand(engine, 'providers list');

        // Demonstrate different agent approaches to tasks
        await runCommand(engine, 'agent select researcher');
        await runInput(engine, 'Analyze the current AI landscape');

        await runCommand(engine, 'agent select planner');
        await runInput(engine, 'Analyze the current AI landscape');

        console.log('\n🎯 EXAMPLE 9: Goal Achievement & Progress Tracking');
        console.log('-'.repeat(45));

        // Track goal progress
        await runCommand(engine, 'goal list');
        await runCommand(engine, 'think "What progress has been made toward our established goals?"');
        await runCommand(engine, 'plan "Steps to improve goal achievement efficiency"');

        console.log('\n🔄 EXAMPLE 10: Dynamic Agent Management');
        console.log('-'.repeat(45));

        // Demonstrate dynamic agent operations
        await runCommand(engine, 'agent create assistant');
        await runCommand(engine, 'agent list');
        await runCommand(engine, 'agent-status');

        // Have the new agent perform tasks
        await runCommand(engine, 'agent select assistant');
        await runInput(engine, 'Help coordinate between existing agents');
        await runCommand(engine, 'think "How can I best support the multi-agent system?"');

        console.log('\n✅ AGENT MANAGEMENT DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Agent Management Capabilities:');
        console.log('   • Agent creation and initialization');
        console.log('   • Status monitoring and information management');
        console.log('   • Goal setting and management');
        console.log('   • Cognitive task execution');
        console.log('   • Multi-agent coordination');
        console.log('   • State and memory management');
        console.log('   • Hybrid operations integration');
        console.log('   • Configuration and customization');
        console.log('   • Goal achievement tracking');
        console.log('   • Dynamic agent operations');

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Agent Management Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function runInput(engine, input) {
    console.log(`\n   💬 Input: ${input}`);
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

    console.log(`\n   💬 Command: /${command}`);
    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`   📝 Result: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runAgentManagementDemo();