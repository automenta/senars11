/**
 * Hybrid Reasoning Showcase
 * Demonstrates:
 * 1. Natural Language Input (Quoted Terms) -> Narsese Translation (Async)
 * 2. Analogical Reasoning using Embeddings (Async)
 */

import {App} from '../src/app/App.js';
import {Logger} from '../src/util/Logger.js';

async function run() {
    Logger.level = 'info';

    const config = {
        subsystems: {
            lm: {
                enabled: true,
                provider: 'transformers',
                model: 'Xenova/LaMini-Flan-T5-248M',
                temperature: 0.7
            },
            embeddingLayer: {
                enabled: true,
                provider: 'transformers', // Use local transformers for embeddings too
                model: 'Xenova/all-MiniLM-L6-v2'
            },
            rules: ['syllogistic-core']
        },
        nar: {
            reasoning: {
                executionInterval: 50
            }
        }
    };

    console.log("🧠 Initializing Hybrid Reasoning Showcase...");
    console.log("   (This may take a moment to load models...)");

    const app = new App(config);
    try {
        const agent = await app.start();

        // 1. Natural Language Input & Translation
        console.log("\n1️⃣  Testing Natural Language Translation");
        const nlInput = '"Cats are independent animals."';
        console.log(`   Input: ${nlInput}`);
        await agent.input(nlInput);

        console.log("   ⏳ Waiting for translation...");
        // Wait for translation
        await new Promise(r => setTimeout(r, 8000));

        let beliefs = agent.getBeliefs();
        let translated = beliefs.find(b => b.term.toString().includes('cat') && b.term.toString().includes('independent'));
        if (translated) {
            console.log(`   ✅ Translated: ${translated}`);
        } else {
            console.log("   ⚠️  Translation pending or failed (check logs).");
        }


        // 2. Analogical Reasoning with Embeddings
        console.log("\n2️⃣  Testing Analogical Reasoning (Embeddings)");

        // Seed memory with some knowledge to find as analogies
        console.log("   🌱 Seeding memory with concepts...");
        await agent.input('(fix_bicycle --> (lubricate_chain, adjust_brakes, check_tires)).');
        await agent.input('(fix_computer --> (reboot_system, check_power, update_drivers)).');

        // Wait for embeddings to be indexed
        await new Promise(r => setTimeout(r, 3000));

        // Pose a new problem (Goal)
        // Using "solve" keyword to trigger the rule
        const problem = '(!, solve(fix_motorcycle))';
        console.log(`   ❓ Posing problem: ${problem}`);

        // High confidence to boost priority for rule triggering
        await agent.input(problem + ' %1.0;0.9%');

        console.log("   ⏳ Waiting for reasoning...");
        await new Promise(r => setTimeout(r, 20000));

        beliefs = agent.getBeliefs();
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
