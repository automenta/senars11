#!/usr/bin/env node

/**
 * SeNARS Planning & Goal Achievement Scenarios
 * Demonstrates sophisticated planning and goal achievement using hybrid intelligence
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runPlanningAndGoalsDemo() {
    console.log('📋🎯 Planning & Goal Achievement Scenarios');
    console.log('='.repeat(60));
    console.log('Demonstrating sophisticated planning and goal achievement\n');

    try {
        const dummyProvider = new DummyProvider({
            responseTemplate: `Planning and goal achievement response for: "{prompt}". Demonstrating strategic planning and goal-oriented behavior using hybrid intelligence.`
        });
        
        const engine = new AgentReplEngine({
            nar: {},
            lm: { provider: dummyProvider }
        });

        engine.registerLMProvider('planning', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🚀 EXAMPLE 1: Goal Setting & Prioritization');
        console.log('-'.repeat(45));
        
        // Create an agent focused on research goals
        await runCommand(engine, 'agent create research-assistant');
        
        // Set multiple goals with different priorities
        console.log('\n   🎯 Setting research goals:');
        await runInput(engine, '<develop-ai-theory --> important>. %1.00;0.90% !');
        await runInput(engine, '<validate-hypothesis --> priority>. %0.85;0.80% !');
        await runInput(engine, '<publish-findings --> goal>. %0.70;0.75% !');
        
        // Ask agent to prioritize goals
        await runCommand(engine, 'think "How should these research goals be prioritized?"');
        
        // List goals
        await runCommand(engine, 'goal list');
        
        console.log('\n📋 EXAMPLE 2: Strategic Planning Process');
        console.log('-'.repeat(45));
        
        // Plan a complex research project
        await runCommand(engine, 'plan "How to develop a comprehensive AI safety framework"');
        
        // Break down the plan with NARS
        await runInput(engine, '<AI-safety-framework --> (identifying-risks AND developing-principles AND implementing-safeguards)>. %1.00;0.85%');
        
        // Analyze the plan
        await runCommand(engine, 'reason "What are the critical success factors for the AI safety framework?"');
        
        console.log('\n🔄 EXAMPLE 3: Goal Refinement & Adaptation');
        console.log('-'.repeat(45));
        
        // Set an initial goal
        await runInput(engine, '<achieve-agi --> goal>. %0.90;0.70% !');
        
        // Ask for refinement of the goal
        await runCommand(engine, 'think "How can the AGI goal be refined into more specific, achievable sub-goals?"');
        
        // Add refined sub-goals based on analysis
        await runInput(engine, '<develop-advanced-reasoning --> subgoal>. %0.95;0.75% !');
        await runInput(engine, '<create-learning-system --> subgoal>. %0.95;0.75% !');
        await runInput(engine, '<integrate-knowledge-bases --> subgoal>. %0.90;0.70% !');
        
        // Check goal status
        await runCommand(engine, 'goal list');
        
        console.log('\n🎯 EXAMPLE 4: Multi-Objective Optimization');
        console.log('-'.repeat(45));
        
        // Handle competing goals
        await runInput(engine, '<accuracy --> goal>. %0.95;0.80% !');
        await runInput(engine, '<efficiency --> goal>. %0.90;0.75% !');
        await runInput(engine, '<interpretability --> goal>. %0.85;0.70% !');
        
        // Analyze trade-offs
        await runCommand(engine, 'reason "How can accuracy, efficiency, and interpretability be balanced in AI systems?"');
        
        // Plan for optimization
        await runCommand(engine, 'plan "Approach to optimize all three competing objectives simultaneously"');
        
        console.log('\n📊 EXAMPLE 5: Goal Achievement Tracking');
        console.log('-'.repeat(45));
        
        // Track goal progress
        console.log('\n   📈 Setting up tracking system:');
        await runInput(engine, '<goal-achievement --> (progress-measurement AND milestone-reached AND objective-met)>. %1.00;0.80%');
        
        // Simulate progress toward goals
        await runCommand(engine, 'think "What metrics would indicate progress toward AI safety objectives?"');
        await runCommand(engine, 'lm "Propose a framework for measuring goal achievement in complex AI projects"');
        
        console.log('\n🔗 EXAMPLE 6: Hierarchical Goal Structure');
        console.log('-'.repeat(45));
        
        // Create hierarchical goals
        console.log('\n   🔱 Building goal hierarchy:');
        await runInput(engine, '<create-beneficial-ai --> high-level-goal>. %1.00;0.90% !');
        await runInput(engine, '<ensure-ai-safety --> strategic-goal>. %0.95;0.85% <create-beneficial-ai --> strategic-goal>. %0.95;0.85% !');
        await runInput(engine, '<align-goals --> tactical-goal>. %0.90;0.80% <ensure-ai-safety --> tactical-goal>. %0.90;0.80% !');
        await runInput(engine, '<test-alignment --> operational-goal>. %0.85;0.75% <align-goals --> operational-goal>. %0.85;0.75% !');
        
        // Navigate the goal hierarchy
        await runCommand(engine, 'plan "Strategy to achieve beneficial AI through the goal hierarchy"');
        
        console.log('\n🔄 EXAMPLE 7: Dynamic Goal Adjustment');
        console.log('-'.repeat(45));
        
        // Adjust goals based on new information
        await runCommand(engine, 'think "What should we do if initial goals prove unattainable or harmful?"');
        
        // Simulate goal adjustment
        await runCommand(engine, 'reason "How should goals be adjusted when constraints change?"');
        await runInput(engine, '<safe-alignment --> revised-goal>. %0.98;0.82% <create-beneficial-ai --> revised-goal>. %0.98;0.82% !');
        
        console.log('\n🎯 EXAMPLE 8: Collaborative Goal Achievement');
        console.log('-'.repeat(45));
        
        // Set up multi-agent goal coordination
        await runCommand(engine, 'agent create coordinator');
        await runCommand(engine, 'agent create executor');
        
        // Define shared goals
        await runInput(engine, '<team-goal --> (coordinated-effort AND shared-resources AND aligned-objectives)>. %1.00;0.85%');
        
        // Plan collaborative approach
        await runCommand(engine, 'plan "How should multiple agents collaborate to achieve shared goals?"');
        
        // Assign role-specific sub-goals
        await runCommand(engine, 'agent select coordinator');
        await runInput(engine, '<coordinate-tasks --> goal>. %0.95;0.80% !');
        
        await runCommand(engine, 'agent select executor');
        await runInput(engine, '<execute-plans --> goal>. %0.95;0.80% !');
        
        console.log('\n🧠 EXAMPLE 9: Meta-Planning & Goal Reflection');
        console.log('-'.repeat(45));
        
        // Reflect on the planning process itself
        await runCommand(engine, 'think "How effective has our goal-setting and planning process been?"');
        
        // Analyze goal achievement patterns
        await runCommand(engine, 'reason "What patterns emerge in successful vs. unsuccessful goal achievement?"');
        
        // Plan improvements to the planning process
        await runCommand(engine, 'plan "How to improve goal-setting and planning effectiveness"');
        
        console.log('\n🎯 EXAMPLE 10: Long-term Goal Management');
        console.log('-'.repeat(45));
        
        // Manage long-term, multi-year objectives
        await runInput(engine, '<establish-agi-field --> long-term-goal>. %0.90;0.70% !');
        await runInput(engine, '<build-theoretical-foundations --> phase-1>. %0.85;0.65% <establish-agi-field --> phase-1>. %0.85;0.65% !');
        await runInput(engine, '<develop-practical-systems --> phase-2>. %0.80;0.60% <establish-agi-field --> phase-2>. %0.80;0.60% !');
        await runInput(engine, '<validate-approaches --> phase-3>. %0.75;0.55% <establish-agi-field --> phase-3>. %0.75;0.55% !');
        
        // Analyze long-term strategy
        await runCommand(engine, 'think "What are the critical milestones for achieving long-term AGI research goals?"');
        await runCommand(engine, 'plan "Timeline and key decision points for multi-phase AGI development"');
        
        console.log('\n✅ PLANNING & GOAL ACHIEVEMENT DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Planning & Goal Capabilities:');
        console.log('   • Goal setting and prioritization');
        console.log('   • Strategic planning processes');
        console.log('   • Goal refinement and adaptation');
        console.log('   • Multi-objective optimization');
        console.log('   • Goal achievement tracking');
        console.log('   • Hierarchical goal structures');
        console.log('   • Dynamic goal adjustment');
        console.log('   • Collaborative goal achievement');
        console.log('   • Meta-planning and reflection');
        console.log('   • Long-term goal management');
        
        await engine.shutdown();

    } catch (error) {
        console.error('❌ Planning & Goals Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function runInput(engine, input) {
    console.log(`\n   💬 Input: ${input.substring(0, 45)}${input.length > 45 ? '...' : ''}`);
    try {
        const result = await engine.processInput(input);
        console.log(`   🤖 Response: ${result.substring(0, 90)}${result.length > 90 ? '...' : ''}`);
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
        console.log(`   📝 Result: ${result.substring(0, 90)}${result.length > 90 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runPlanningAndGoalsDemo();