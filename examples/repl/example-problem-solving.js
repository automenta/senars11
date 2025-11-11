#!/usr/bin/env node

/**
 * SeNARS Multi-Step Problem Solving: Symbolic & Neural Integration
 * Demonstrates complex problem solving using both symbolic and neural reasoning
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runMultiStepProblemSolvingDemo() {
    console.log('🧩🧠 Multi-Step Problem Solving: Symbolic & Neural Integration');
    console.log('='.repeat(60));
    console.log('Demonstrating hybrid problem solving using both systems\n');

    try {
        const dummyProvider = new DummyProvider({
            responseTemplate: `Multi-step problem solving response: "{prompt}". Integrating symbolic reasoning with neural processing for comprehensive problem resolution.`
        });
        
        const engine = new AgentReplEngine({
            nar: {},
            lm: { provider: dummyProvider }
        });

        engine.registerLMProvider('problem-solving', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🔍 EXAMPLE 1: Diagnosis Problem Solving');
        console.log('-'.repeat(50));
        
        // Create a diagnostic problem
        console.log('\n   🩺 Setting up diagnostic problem:');
        await addNarseseKnowledge(engine, '<symptom-fever --> (infection OR inflammation)>. %0.80;0.70%');
        await addNarseseKnowledge(engine, '<symptom-rash --> (allergy OR infection)>. %0.75;0.65%');
        await addNarseseKnowledge(engine, '<infection --> treatable-with-antibiotics>. %0.90;0.80%');
        await addNarseseKnowledge(engine, '<allergy --> treatable-with-antihistamines>. %0.95;0.85%');
        
        // Patient presents with symptoms
        console.log('\n   🧑‍⚕️ Patient presents with:');
        await addNarseseKnowledge(engine, '<patient-1 --> (symptom-fever AND symptom-rash)>. %1.00;0.90%');
        
        // Symbolic reasoning: possible diagnoses
        await queryNarsese(engine, '<patient-1 --> ?diagnosis>?');
        
        // Neural analysis: consider additional factors
        await runInput(engine, 'Consider patient history, environmental factors, and symptom patterns to refine the diagnosis');
        
        // Plan treatment approach
        await runCommand(engine, 'plan "Step-by-step approach to diagnose and treat the patient"');
        
        console.log('\n📊 EXAMPLE 2: Scientific Discovery Process');
        console.log('-'.repeat(50));
        
        // Research problem setup
        console.log('\n   🔬 Scientific problem setup:');
        await addNarseseKnowledge(engine, '<phenomenon-X --> unexplained>. %1.00;0.50%');  // Lower confidence due to unexplained nature
        await addNarseseKnowledge(engine, '<hypothesis-A --> explains-phenomenon-X>. %0.60;0.60%');
        await addNarseseKnowledge(engine, '<hypothesis-B --> explains-phenomenon-X>. %0.70;0.55%');
        
        // Design experiments using neural thinking
        await runCommand(engine, 'think "What experiments would best differentiate between hypothesis A and B?"');
        
        // Formalize experimental predictions
        await addNarseseKnowledge(engine, '<experiment-A-confirms-hypothesis --> (result-A AND hypothesis-A)>. %0.90;0.75%');
        await addNarseseKnowledge(engine, '<experiment-B-disconfirms-hypothesis --> (result-B AND NOT hypothesis-A)>. %0.85;0.70%');
        
        // Plan comprehensive research approach
        await runCommand(engine, 'plan "Research strategy to test both hypotheses systematically"');
        
        console.log('\n🔄 EXAMPLE 3: Engineering Design Problem');
        console.log('-'.repeat(50));
        
        // Define design constraints and requirements
        console.log('\n   ⚙️  Design problem setup:');
        await addNarseseKnowledge(engine, '<efficient-system --> (low-energy-consumption AND high-performance)>. %1.00;0.80%');
        await addNarseseKnowledge(engine, '<secure-system --> (data-protection AND access-controls)>. %1.00;0.85%');
        await addNarseseKnowledge(engine, '<reliable-system --> (error-correction AND backup-procedures)>. %1.00;0.90%');
        
        // Analyze trade-offs with neural reasoning
        await runCommand(engine, 'reason "How can efficiency, security, and reliability be balanced in system design?"');
        
        // Generate design options
        await runCommand(engine, 'think "What innovative approaches might satisfy all three requirements?"');
        
        // Evaluate design options against constraints
        await addNarseseKnowledge(engine, '<design-option-1 --> (efficient-system AND secure-system)>. %0.80;0.70%');
        await addNarseseKnowledge(engine, '<design-option-2 --> (efficient-system AND reliable-system)>. %0.85;0.75%');
        await addNarseseKnowledge(engine, '<design-option-3 --> (secure-system AND reliable-system)>. %0.75;0.65%');
        
        // Plan optimal solution
        await runCommand(engine, 'plan "Integrated approach that achieves all three system properties"');
        
        console.log('\n🎯 EXAMPLE 4: Strategic Decision Making');
        console.log('-'.repeat(50));
        
        // Set up multi-faceted decision problem
        console.log('\n   🎯 Decision framework:');
        await addNarseseKnowledge(engine, '<decision-success --> (benefit-cost-ratio AND risk-assessment AND timeline-feasibility)>. %1.00;0.80%');
        await addNarseseKnowledge(engine, '<option-A --> (high-benefit AND high-risk AND long-timeline)>. %0.90;0.70%');
        await addNarseseKnowledge(engine, '<option-B --> (medium-benefit AND low-risk AND medium-timeline)>. %0.85;0.75%');
        await addNarseseKnowledge(engine, '<option-C --> (low-benefit AND very-low-risk AND short-timeline)>. %0.70;0.80%');
        
        // Analyze quantitatively with symbolic reasoning
        await queryNarsese(engine, '<option-A --> ?success-probability>?');
        await queryNarsese(engine, '<option-B --> ?success-probability>?');
        
        // Consider qualitative factors with neural reasoning
        await runInput(engine, 'Analyze the long-term organizational impact, stakeholder considerations, and strategic alignment of each option');
        
        // Synthesize decision
        await runCommand(engine, 'reason "Which option provides the best overall value considering all factors?"');
        
        // Plan implementation
        await runCommand(engine, 'plan "Detailed implementation strategy for the recommended option"');
        
        console.log('\n🔗 EXAMPLE 5: Complex Knowledge Integration');
        console.log('-'.repeat(50));
        
        // Integrate knowledge from multiple domains
        console.log('\n   🌐 Cross-domain integration:');
        await addNarseseKnowledge(engine, '<cognitive-process-A --> (attention AND memory AND reasoning)>. %1.00;0.80%');
        await addNarseseKnowledge(engine, '<neural-mechanism-B --> (activation-patterns AND connection-strengths)>. %1.00;0.75%');
        await addNarseseKnowledge(engine, '<computational-model-C --> (neural-networks AND symbolic-systems)>. %1.00;0.70%');
        
        // Find connections with neural reasoning
        await runInput(engine, 'Explore potential relationships between cognitive processes, neural mechanisms, and computational models');
        
        // Formalize discovered relationships
        await addNarseseKnowledge(engine, '<cognitive-process-A --> related-to>. %0.80;0.65% <neural-mechanism-B --> related-to>. %0.80;0.65%?');
        await addNarseseKnowledge(engine, '<neural-mechanism-B --> implementable-as>. %0.70;0.60% <computational-model-C --> implementable-as>. %0.70;0.60%?');
        
        // Synthesize integrated understanding
        await runCommand(engine, 'think "How can insights from all three domains be unified into a coherent framework?"');
        
        // Plan research directions
        await runCommand(engine, 'plan "Research agenda to further integrate cognitive science, neuroscience, and AI"');
        
        console.log('\n🧠 EXAMPLE 6: Adaptive Problem Solving');
        console.log('-'.repeat(50));
        
        // Set up problem that requires adaptation
        console.log('\n   🔄 Adaptive problem:');
        await addNarseseKnowledge(engine, '<problem-type-A --> requires-approach-X>. %0.80;0.70%');
        await addNarseseKnowledge(engine, '<problem-type-B --> requires-approach-Y>. %0.85;0.75%');
        await addNarseseKnowledge(engine, '<hybrid-problem --> (type-A AND type-B)>. %0.75;0.65%');
        
        // Initial problem classification
        await addNarseseKnowledge(engine, '<current-problem --> hybrid-problem>. %0.90;0.80%');
        
        // Consider approaches with neural reasoning
        await runInput(engine, 'How should we adapt our problem-solving strategy when dealing with hybrid problems?');
        
        // Derive adaptive solution
        await runCommand(engine, 'reason "What approach would be most effective for a problem that combines characteristics of both type A and B?"');
        
        // Plan adaptive methodology
        await runCommand(engine, 'plan "Flexible problem-solving methodology that adapts based on problem characteristics"');
        
        console.log('\n🔬 EXAMPLE 7: Validation & Verification Process');
        console.log('-'.repeat(50));
        
        // Create a solution that needs validation
        console.log('\n   ✅ Validation process:');
        await addNarseseKnowledge(engine, '<proposed-solution --> (theoretical-model AND practical-implementation)>. %1.00;0.75%');
        await addNarseseKnowledge(engine, '<validation-criteria --> (logical-consistency AND empirical-support AND predictive-accuracy)>. %1.00;0.85%');
        
        // Check logical consistency
        await queryNarsese(engine, '<proposed-solution --> logically-consistent>?');
        
        // Evaluate with neural reasoning
        await runInput(engine, 'Assess the practical feasibility, potential limitations, and real-world applicability of the proposed solution');
        
        // Plan validation approach
        await runCommand(engine, 'plan "Comprehensive validation strategy covering all three criteria"');
        
        // Consider edge cases
        await runCommand(engine, 'think "What edge cases or failure modes should be considered during validation?"');
        
        console.log('\n🔄 EXAMPLE 8: Iterative Problem Refinement');
        console.log('-'.repeat(50));
        
        // Start with a broad problem
        console.log('\n   🔁 Iterative refinement:');
        await addNarseseKnowledge(engine, '<broad-problem --> (sub-problem-1 AND sub-problem-2 AND sub-problem-3)>. %1.00;0.60%');
        
        // Analyze each sub-problem
        await queryNarsese(engine, '<sub-problem-1 --> ?nature>?');
        await queryNarsese(engine, '<sub-problem-2 --> ?nature>?');
        await queryNarsese(engine, '<sub-problem-3 --> ?nature>?');
        
        // Solve sub-problems with appropriate methods
        await runInput(engine, 'Apply the most suitable solution approach to each sub-problem based on its characteristics');
        
        // Integrate solutions
        await runCommand(engine, 'reason "How should solutions to the sub-problems be integrated to solve the broad problem?"');
        
        // Iterate to improve
        await runCommand(engine, 'think "How can the integrated solution be refined and improved?"');
        
        // Plan refinement cycle
        await runCommand(engine, 'plan "Iterative refinement process with feedback loops for continuous improvement"');
        
        console.log('\n✅ MULTI-STEP PROBLEM SOLVING DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Multi-Step Problem Solving Capabilities:');
        console.log('   • Diagnosis with symbolic and neural analysis');
        console.log('   • Scientific discovery with hypothesis testing');
        console.log('   • Engineering design with constraint management');
        console.log('   • Strategic decision making with multiple criteria');
        console.log('   • Cross-domain knowledge integration');
        console.log('   • Adaptive problem solving');
        console.log('   • Solution validation and verification');
        console.log('   • Iterative refinement processes');
        
        await engine.shutdown();

    } catch (error) {
        console.error('❌ Multi-Step Problem Solving Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function addNarseseKnowledge(engine, narsese) {
    try {
        await engine.processInput(narsese);
        // Only show first part to avoid long lines
        const display = narsese.length > 30 ? narsese.substring(0, 30) + '...' : narsese;
        console.log(`     Added: ${display}`);
    } catch (e) {
        const display = narsese.length > 25 ? narsese.substring(0, 25) + '...' : narsese;
        console.log(`     (Knowledge: ${display})`);
    }
}

async function queryNarsese(engine, query) {
    try {
        await engine.processInput(query);
        const display = query.length > 25 ? query.substring(0, 25) + '...' : query;
        console.log(`     Query: ${display}`);
    } catch (e) {
        const display = query.length > 25 ? query.substring(0, 25) + '...' : query;
        console.log(`     (Query: ${display})`);
    }
}

async function runInput(engine, input) {
    console.log(`\n   💬 Input: ${input.substring(0, 40)}${input.length > 40 ? '...' : ''}`);
    try {
        const result = await engine.processInput(input);
        console.log(`   🤖 Response: ${result.substring(0, 80)}${result.length > 80 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

async function runCommand(engine, command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    console.log(`\n   💬 Command: /${command.substring(0, 35)}${command.length > 35 ? '...' : ''}`);
    try {
        const result = await engine.executeCommand(cmd, ...args);
        console.log(`   📝 Result: ${result.substring(0, 80)}${result.length > 80 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runMultiStepProblemSolvingDemo();