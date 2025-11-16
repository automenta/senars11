#!/usr/bin/env node

/**
 * SeNARS Advanced LM Query Processing Examples
 * Demonstrates complex queries processed through the Language Model
 */

import {AgentReplEngine} from '../../src/repl/AgentReplEngine.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';

async function runComplexQueriesDemo() {
    console.log('🤖🔬 Advanced LM Query Processing Examples');
    console.log('='.repeat(60));
    console.log('Demonstrating complex queries processed through the Language Model\n');

    try {
        // Use a dummy provider that can simulate complex responses
        const dummyProvider = new DummyProvider({
            responseTemplate: `This is a simulated response to: "{prompt}". In a real Ollama setup, this would connect to an LLM for complex reasoning, analysis, and contextual understanding.`
        });

        const engine = new AgentReplEngine({
            nar: {},
            lm: {provider: dummyProvider}
        });

        engine.registerLMProvider('advanced', dummyProvider);
        engine.addAgentCommands();
        await engine.initialize();

        console.log('🧩 EXAMPLE 1: Complex Analytical Queries');
        console.log('-'.repeat(40));

        await runQuery(engine, 'Analyze the relationship between consciousness, intelligence, and self-awareness in artificial systems.');
        await runQuery(engine, 'Compare and contrast symbolic AI approaches with neural network approaches for knowledge representation.');

        console.log('\n🧠 EXAMPLE 2: Reasoning & Inference Tasks');
        console.log('-'.repeat(40));

        await runQuery(engine, 'If all mammals are warm-blooded, and whales are mammals, what can we conclude about whales? Analyze this syllogism.');
        await runQuery(engine, 'Given that renewable energy adoption is accelerating globally, what are the implications for traditional energy markets?');

        console.log('\n📊 EXAMPLE 3: Multi-step Problem Solving');
        console.log('-'.repeat(40));

        await runQuery(engine, 'Design a step-by-step approach to validate scientific hypotheses using both empirical data and logical inference.');
        await runQuery(engine, 'What are the key challenges in creating an artificial system that can perform analogical reasoning?');

        console.log('\n🌐 EXAMPLE 4: Cross-domain Knowledge Integration');
        console.log('-'.repeat(40));

        await runQuery(engine, 'How might concepts from quantum mechanics inform our understanding of cognitive processes?');
        await runQuery(engine, 'Explain how principles from complexity science apply to the development of artificial general intelligence.');

        console.log('\n🔍 EXAMPLE 5: Hypothetical Scenarios & Planning');
        console.log('-'.repeat(40));

        await runQuery(engine, 'Imagine an AI system that can modify its own architecture. What are the potential benefits and risks?');
        await runQuery(engine, 'What would be required to build an AI system that learns continuously without forgetting previous knowledge?');

        console.log('\n🎯 EXAMPLE 6: Ethical & Philosophical Reasoning');
        console.log('-'.repeat(40));

        await runQuery(engine, 'What ethical considerations should guide the development of autonomous AI systems?');
        await runQuery(engine, 'How might we determine if an artificial system has achieved genuine understanding versus sophisticated pattern matching?');

        console.log('\n✅ COMPLEX QUERIES DEMONSTRATION COMPLETE!');
        console.log('\n📋 Summary of Complex Query Capabilities:');
        console.log('   • Analytical reasoning and comparison');
        console.log('   • Multi-step problem solving');
        console.log('   • Cross-domain knowledge integration');
        console.log('   • Hypothetical scenario planning');
        console.log('   • Ethical and philosophical reasoning');

        await engine.shutdown();

    } catch (error) {
        console.error('❌ Complex Queries Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function runQuery(engine, query) {
    console.log(`\n❓ Query: ${query}`);
    try {
        const result = await engine.processInput(query);
        console.log(`   🤖 Response: ${result.substring(0, 120)}${result.length > 120 ? '...' : ''}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

runComplexQueriesDemo();