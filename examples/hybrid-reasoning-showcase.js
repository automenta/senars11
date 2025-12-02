/**
 * Hybrid Reasoning Showcase
 * Demonstrates:
 * 1. Natural Language Input (Quoted Terms) -> Narsese Translation (Async)
 * 2. Analogical Reasoning using Embeddings (Async)
 */

import {App} from '../src/app/App.js';
import {Logger} from '../src/util/Logger.js';
import {BaseProvider} from '../src/lm/BaseProvider.js';

// Define a Mock Provider to ensure demo reliability in CI/Test environments
class MockLMProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'mock-lm';
    }

    async generateText(prompt) {
        console.log(`[MockLM] Received prompt: ${prompt.substring(0, 100)}...`);
        // Mock translation
        if (prompt.includes('Translate') && prompt.includes('Cats are independent')) {
            return '(cat --> [independent]).';
        }

        // Mock analogy solution
        if (prompt.includes('analogy') && (prompt.includes('motorcycle') || prompt.includes('fix_motorcycle'))) {
            return '1. Check fuel levels\n2. Inspect spark plugs\n3. Verify battery charge';
        }

        return 'I am a mock LM and I do not have a specific response for this prompt.';
    }
}

async function run() {
    Logger.level = 'info';

    // Use Mock LM for reliability, but try real embeddings
    const config = {
        subsystems: {
            lm: {
                enabled: true,
                provider: 'mock-lm', // Use our custom provider
                temperature: 0.7,
                circuitBreaker: {
                    failureThreshold: 10,
                    timeout: 120000
                }
            },
            embeddingLayer: {
                enabled: true,
                provider: 'dummy',
                model: 'dummy-model'
            },
            rules: ['syllogistic-core'],
            functors: ['core-arithmetic']
        },
        nar: {
            reasoning: {
                executionInterval: 50
            }
        }
    };

    console.log("🧠 Initializing Hybrid Reasoning Showcase...");

    const app = new App(config);

    // Register the mock provider before starting
    // We can't easily inject into builder from here without modifying App.
    // But App.start() builds the agent.
    // If we want to use a custom provider 'mock-lm', we need to register it.
    // The LM subsystem loads providers based on config.provider string.
    // It tries to load from src/lm/ or built-ins.
    // It doesn't know about 'mock-lm'.

    // Workaround: Start with 'dummy', then replace/register mock.
    // Or just modify App to allow provider registration?
    // Agent has registerProvider.

    // Let's start with dummy, then register mock and switch.
    config.subsystems.lm.provider = 'dummy';

    try {
        const agent = await app.start();

        // Register and switch to Mock LM
        const mockProvider = new MockLMProvider();
        agent.lm.registerProvider('mock-lm', mockProvider);
        agent.lm.providers.setDefault('mock-lm');
        console.log("   ✅ Switched to Mock LM for reliability");

        // 1. Natural Language Input & Translation
        // console.log("\n1️⃣  Testing Natural Language Translation");
        // const nlInput = '"Cats are independent animals."';
        // console.log(`   Input: ${nlInput}`);
        // await agent.input(nlInput);

        // console.log("   ⏳ Waiting for translation...");
        // // Wait for translation
        // await new Promise(r => setTimeout(r, 8000));

        // let beliefs = agent.getBeliefs();
        // let translated = beliefs.find(b => b.term.toString().includes('cat') && b.term.toString().includes('independent'));
        // if (translated) {
        //     console.log(`   ✅ Translated: ${translated}`);
        // } else {
        //     console.log("   ⚠️  Translation pending or failed (check logs).");
        // }


        // 2. Analogical Reasoning with Embeddings
        console.log("\n2️⃣  Testing Analogical Reasoning (Embeddings)");

        // Seed memory with some knowledge to find as analogies
        console.log("   🌱 Seeding memory with concepts...");
        await agent.input('(fix_bicycle --> (lubricate_chain, adjust_brakes, check_tires)).');
        await agent.input('(fix_computer --> (reboot_system, check_power, update_drivers)).');

        // Wait for embeddings to be indexed
        await new Promise(r => setTimeout(r, 3000));

        // Pose a new problem (Goal)
        // Using "solve" keyword to trigger the rule. Syntax: term!
        const problem = 'solve(fix_motorcycle)!';
        console.log(`   ❓ Posing problem: ${problem}`);

        // High confidence to boost priority for rule triggering
        await agent.input(problem + ' %1.0;0.9%');

        console.log("   ⏳ Waiting for reasoning...");
        await new Promise(r => setTimeout(r, 20000));

        let beliefs = agent.getBeliefs();
        const solution = beliefs.find(b => b.term.toString().includes('solution_proposal'));

        if (solution) {
            console.log(`   ✅ Solution generated: ${solution}`);
            if (solution.metadata?.solutionProposal) {
                console.log(`   📝 Content: ${solution.metadata.solutionProposal}`);
            }
        } else {
            console.log("   ⚠️  No solution generated yet.");
            // Debug info
            console.log("   Current beliefs count:", beliefs.length);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await app.shutdown();
    }
}

run().catch(console.error);
