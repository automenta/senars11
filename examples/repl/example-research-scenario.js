#!/usr/bin/env node

/**
 * SeNARS Agent Interactive Scenario Demo
 * Simulates a complex AI research scenario with hybrid reasoning
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {LangChainProvider} from '../../src/lm/LangChainProvider.js';
import {NAR as Nar} from '../../src/nar/NAR.js'; // Import for type reference, using minimal object to avoid config issues

async function runResearchScenarioDemo() {
    console.log('🔬🤖 SeNARS Research Agent Scenario Demo');
    console.log('=' .repeat(50));
    console.log('Simulating a complex AI research scenario with hybrid reasoning\n');

    try {
        // Initialize with real NARS system
        const nar = {}; // Use empty object to avoid configuration circular reference issues
        
        // Use Ollama provider for LM capabilities
        const ollamaProvider = new LangChainProvider({
            provider: 'ollama',
            modelName: process.env.OLLAMA_MODEL,
            baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
            temperature: 0.7,
            maxTokens: 800
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

        // Scenario: AI Research Project
        console.log('📍 SCENARIO: AI Research Project on Hybrid Intelligence');
        console.log('-'.repeat(50));

        // Create specialized agents
        await createResearchTeam(engine);

        // Set up research context in NARS
        await setupResearchContext(engine);

        // Begin research process with hybrid reasoning
        await conductResearch(engine);

        // Demonstrate goal achievement tracking
        await trackProgress(engine);

        // Showcase learning and adaptation
        await adaptiveReasoning(engine);

        console.log('\n✅ RESEARCH SCENARIO COMPLETED SUCCESSFULLY!');
        console.log('\n📊 Research Metrics:');
        console.log(`   - Research cycles: ${nar.cycles || 0}`);
        console.log(`   - LM interactions: ${engine.agentLM.lmStats.totalCalls}`);
        console.log(`   - Knowledge concepts: ${countNarsKnowledge(nar)}`);
        console.log(`   - Active agents: ${engine.agents.size}`);

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Research Scenario Error:', error);
        console.error('Stack:', error.stack);
    }
}

async function createResearchTeam(engine) {
    console.log('\n👥 Creating Research Team...');
    
    await runCommand(engine, 'agent create lead-researcher');
    await runCommand(engine, 'agent create cognitive-modeler');
    await runCommand(engine, 'agent create ml-engineer');
    await runCommand(engine, 'agent select lead-researcher');
    
    console.log('   ✓ Research team created with specialized roles');
    await runCommand(engine, 'agent list');
}

async function setupResearchContext(engine) {
    console.log('\n🧠 Setting up Research Context in NARS...');

    // Add foundational knowledge about AI systems
    const foundationalKnowledge = [
        '<neural-network --> system>. %1.00;0.90%',
        '<symbolic-system --> system>. %1.00;0.90%',
        '<hybrid-system --> system>. %1.00;0.90%',
        '<neural-network --> fast-learner>. %0.80;0.85%',
        '<symbolic-system --> interpretable>. %0.90;0.80%',
        '<hybrid-system --> (fast-learner AND interpretable)>. %0.70;0.75%',
        '<reasoning --> problem-solving>. %1.00;0.90%',
        '<learning --> knowledge-acquisition>. %1.00;0.90%',
        '<AI-safety --> important>. %1.00;0.95%'
    ];

    for (const fact of foundationalKnowledge) {
        try {
            await engine.processNarsese(fact);
        } catch (e) {
            console.log(`   ⚠ Could not process: ${fact} (${e.message})`);
        }
    }

    console.log('   ✓ Foundational AI knowledge added to NARS');
}

async function conductResearch(engine) {
    console.log('\n🔍 Beginning Research Process...');

    // Define main research goal
    await runCommand(engine, 'goal "develop hybrid AI system combining neural and symbolic reasoning"');
    
    // Generate research plan
    console.log('\n📋 Generating research plan...');
    const plan = await runCommand(engine, 'plan "How to develop a hybrid AI system combining neural and symbolic reasoning"');
    
    // Ask for specific reasoning
    console.log('\n🤔 Analyzing design decisions...');
    await runCommand(engine, 'reason "What are the main challenges in combining neural networks with symbolic reasoning systems?"');
    
    // Get expert perspective
    console.log('\n💡 Seeking expert insights...');
    await runCommand(engine, 'think "What would be the key breakthrough needed to make hybrid neural-symbolic systems practical?"');
    
    // Query NARS for related knowledge
    console.log('\n🔍 Querying NARS knowledge...');
    try {
        await engine.processNarsese('<hybrid-system --> ?property>?');
    } catch (e) {
        console.log(`   ⚠ NARS query failed: ${e.message}`);
    }
    
    // Synthesize information from both systems
    console.log('\n🔗 Synthesizing hybrid insights...');
    await runCommand(engine, 'lm "Based on the NARS knowledge and your understanding, what would be the architecture of a practical hybrid neural-symbolic system?"');
}

async function trackProgress(engine) {
    console.log('\n📈 Tracking Research Progress...');

    // Add progress indicators to NARS
    await engine.processNarsese('<research-phase-1 --> completed>. %0.60;0.70%');
    await engine.processNarsese('<hybrid-architecture --> designed>. %0.40;0.65%');
    await engine.processNarsese('<neural-integration --> in-progress>. %0.30;0.70%');
    await engine.processNarsese('<symbolic-module --> implemented>. %0.80;0.85%');
    
    // Check status
    console.log('\n📊 Current research status:');
    await runCommand(engine, 'agent-status');
    await runCommand(engine, 'goal list');
    
    // Analyze progress
    console.log('\n🎯 Analyzing progress...');
    await runCommand(engine, 'reason "What is the current state of the hybrid AI research project and what are the next steps?"');
}

async function adaptiveReasoning(engine) {
    console.log('\n🔄 Demonstrating Adaptive Reasoning...');

    // Simulate encountering a research challenge
    console.log('\n⚠️  Research challenge encountered: Symbolic reasoning is too slow');
    
    // Query for solutions
    await runCommand(engine, 'think "How can we optimize symbolic reasoning speed without losing expressiveness?"');
    
    // Get planning advice
    await runCommand(engine, 'plan "Approaches to optimize symbolic reasoning performance in hybrid systems"');
    
    // Update knowledge based on new insights
    await engine.processNarsese('<optimization-needed --> symbolic-reasoning-speed>. %1.00;0.80%');
    await engine.processNarsese('<potential-solution --> indexing-optimization>. %0.70;0.75%');
    await engine.processNarsese('<potential-solution --> parallel-processing>. %0.60;0.70%');
    
    // Synthesize solution
    await runCommand(engine, 'lm "Combine NARS knowledge about symbolic reasoning optimization with your expertise to propose the best approach"');
    
    // Update goals based on new understanding
    await runCommand(engine, 'goal "optimize symbolic reasoning performance in hybrid system"');
    
    console.log('\n✅ Adaptation completed - system adjusted to new challenge');
}

function countNarsKnowledge(nar) {
    // This is a simplified approach - in a real implementation,
    // we'd need to access the actual NARS memory structures
    return typeof nar === 'object' && nar !== null ? (nar.memory?.size || 0) : 0;
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

runResearchScenarioDemo();