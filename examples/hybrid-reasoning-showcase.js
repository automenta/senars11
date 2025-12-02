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
                model: 'Xenova/all-MiniLM-L6-v2',
            },
            functors: ['core-arithmetic', 'set-operations'],
            rules: ['syllogistic-core', 'temporal'],
        },
        memory: { enabled: true },
        nar: {
            reasoning: {
                executionInterval: 50
            }
        }
    };

    console.log("🚀 Hybrid Reasoning Showcase");
    console.log("   Demonstrating: Quoted Input, Async Translation, Concept Elaboration, and Embedding-Augmented Analogy.");

    const app = new App(config);
    const agent = await app.start();

    // Monitor Derivations
    agent.on('reasoning.derivation', (data) => {
        const task = data.derivedTask;
        console.log(`   ✨ DERIVATION: ${task}`);
        if (task.term.toString().includes('solution_proposal')) {
             console.log(`   💡 ANALOGY SOLUTION: ${task.term}`);
        }
    });

    console.log("\n📚 Phase 1: Knowledge Injection");
    // Inject some background knowledge
    await agent.input('(sun --> star).');
    await agent.input('(star --> energy_source).');

    // Inject quoted natural language (triggers Translation and Elaboration)
    const quote = '"The sun is a massive fusion reactor."';
    console.log(`   Input: ${quote}`);
    await agent.input(quote);

    // Wait for processing
    console.log("   Processing quoted input...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("\n🤔 Phase 2: Analogical Reasoning");
    // Pose a problem that needs analogy
    // We want to solve "energy_scarcity".
    // Analogy should pick up "sun" or "fusion reactor" as similar concept.
    const goal = '(solve_energy_scarcity --> self)!';
    console.log(`   Goal: ${goal}`);
    await agent.input(goal);

    // Wait for reasoning
    console.log("   Reasoning...");
    await new Promise(r => setTimeout(r, 15000));

    console.log("\n📝 Final Check");
    const beliefs = agent.getBeliefs();
    const solution = beliefs.find(b => b.term.toString().includes('solution_proposal'));

    if (solution) {
        console.log("✅ Solution Found via Analogy!");
        console.log(solution.toString());
    } else {
        console.log("⚠️ No specific solution proposal found (this is probabilistic).");
    }

    await app.shutdown();
}

run().catch(e => console.error(e));
