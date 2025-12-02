import {App} from '../src/app/App.js';
import {Logger} from '../src/util/Logger.js';

async function run() {
    Logger.level = 'info';

    const config = {
        subsystems: {
            lm: {
                enabled: true,
                provider: 'transformers',
                model: 'Xenova/flan-t5-small',
                temperature: 0.7
            },
            embeddingLayer: {
                enabled: true,
                model: 'Xenova/all-MiniLM-L6-v2', // Real embedding model
                cacheSize: 1000
            },
            functors: ['core-arithmetic', 'set-operations'],
            rules: ['syllogistic-core', 'temporal'], // Default rules
            memory: { enabled: true },
            focus: { enabled: true }
        },
        nar: {
            reasoning: {
                executionInterval: 50
            }
        }
    };

    console.log("🧠 Initializing Hybrid Reasoning Showcase...");
    console.log("   - Natural Language Inputs (Quoted Terms)");
    console.log("   - Async Translation Rule");
    console.log("   - Embedding-Augmented Analogy Rule");

    const app = new App(config);
    console.log("   Starting App (this may take time to load models)...");
    const agent = await app.start();
    console.log("   App Started.");

    // 1. Seed Memory with Known Concepts (for Analogy)
    console.log("\n📚 Seeding Memory with Known Concepts...");
    // A known problem and solution (clogged pipe -> use snake)
    await agent.input('((clogged, pipe) --> problem).');
    await agent.input('((use, snake) --> (fix, (clogged, pipe))).');

    // Another one (infection -> antibiotics)
    await agent.input('((bacterial, infection) --> problem).');
    await agent.input('((take, antibiotics) --> (fix, (bacterial, infection))).');

    // Wait for processing
    await new Promise(r => setTimeout(r, 2000));

    // 2. Input a NEW Natural Language Problem
    console.log("\n🗣️  Injecting Natural Language Problem...");
    // Use a question to trigger AnalogyRule (which requires Goal/Question)
    const nlInput = '"How do I fix a slow draining sink?"';
    console.log(`   Input: ${nlInput}`);

    await agent.input(nlInput);

    // 3. Monitor Reasoning
    console.log("\n⚡ Monitoring Reasoning Stream...");

    let translated = false;
    let analogyFound = false;

    agent.on('reasoning.derivation', (data) => {
        const task = data.derivedTask;
        const taskStr = task.toString();

        console.log(`   DERIVATION: ${taskStr}`);

        if (!translated && (taskStr.includes('sink') || taskStr.includes('drain'))) {
             if (taskStr !== nlInput) { // It's not the input itself
                  console.log("   🔤 TRANSLATION DETECTED");
                  translated = true;
             }
        }

        // Detect Analogy Solution
        if (taskStr.includes('solution_proposal') || (taskStr.includes('snake') && taskStr.includes('sink'))) {
             console.log("   💡 ANALOGY SOLUTION PROPOSED!");
             analogyFound = true;
        }
    });

    // Run for some time
    console.log("   Waiting for reasoning results (max 60s)...");
    for (let i = 0; i < 60; i++) { // Increased to 60s as models are slow
        if (i % 5 === 0) console.log(`   ... ${i}s elapsed`);
        await new Promise(r => setTimeout(r, 1000));

        // Check if we found solution
        const beliefs = agent.getBeliefs();
        const solution = beliefs.find(b => b.term.toString().includes('solution_proposal'));

        if (solution && !analogyFound) {
             console.log(`\n   ✅ Found Solution in Beliefs: ${solution}`);
             analogyFound = true;
             break;
        }
    }

    console.log("\n📝 Final System State:");
    console.log(`   Total Beliefs: ${agent.getBeliefs().length}`);

    // Check for translation
    const beliefs = agent.getBeliefs();
    const translatedBelief = beliefs.find(b => !b.term.name.startsWith('"') && (b.term.toString().includes('sink') || b.term.toString().includes('drain')));
    if (translatedBelief) {
        console.log(`   - Translated: ${translatedBelief}`);
    }

    await app.shutdown();
}

run().catch(e => console.error(e));
