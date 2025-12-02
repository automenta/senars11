import {App} from '../src/app/App.js';

// Set environment variable to suppress ONNX runtime warnings
process.env.ORT_LOG_LEVEL = '3';

async function main() {
    console.log('🧠 Hybrid Reasoning Showcase: Natural Language + NAL + LM Rules');
    console.log('=============================================================\n');

    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/LaMini-Flan-T5-248M',
            enabled: true,
            temperature: 0.1
        },
        subsystems: {
            lm: true,
            embeddingLayer: true,
            rules: ['syllogistic-core', 'temporal'],
            tools: true,
            functors: ['core-arithmetic']
        },
        // Enable memory validation to ensure stability
        memory: {
            enableMemoryValidation: false
        }
    };

    console.log('Initializing App with Transformers.js (Xenova/LaMini-Flan-T5-248M)...');
    const app = new App(config);
    const agent = await app.start({startAgent: true});
    console.log('Agent started. LM Subsystem enabled.\n');

    // Helper to log steps
    const step = async (desc, input, wait = 3000) => {
        console.log(`\n🔹 Step: ${desc}`);
        if (input) {
            console.log(`   Input: ${input}`);
            await agent.input(input);
        }
        console.log(`   Waiting ${wait}ms for reasoning...`);
        await new Promise(r => setTimeout(r, wait));
    };

    try {
        // 1. Quoted Input Translation
        // Expected: "The sky is blue" -> (sky --> blue).
        await step('Translating Natural Language Fact', '"The sky is blue"');

        // 2. Symbolic Input
        // (sky --> [colored]).
        await step('Adding Symbolic Knowledge', '(sky --> [colored]).');

        // 3. Hybrid Inference (Syllogism)
        // Question: What is colored?
        await step('Asking Question (Symbolic)', '(?x --> [colored])?');

        // 4. Analogy Rule Trigger
        // Input: (library --> knowledge_source).
        // Expected: Analogy generation e.g. <library <-> internet> or similar
        await step('Triggering Analogy Rule', '(library --> knowledge_source).');

        // 5. Goal Decomposition
        // Goal: "Write a poem"!
        // Expected: Subgoals like (select_topic)! (write_lines)!
        await step('High-level Goal (NL)', '"Write a poem"!');

        // 6. Causal Analysis
        // Input: "Fire causes smoke"
        // Then: (fire).
        await step('Causal Scenario Input', '"Fire causes smoke"');
        // Note: Translation might produce (fire ==> smoke) or (fire --> smoke) depending on model.
        await step('Event Occurs', '(fire).');

        console.log('\n📊 Final Memory Dump (Interesting Concepts):');
        const concepts = agent.memory.getAllConcepts();

        // Filter concepts that show interesting derivations
        const interesting = concepts.filter(c =>
            c.term.name.includes('sky') ||
            c.term.name.includes('library') ||
            c.term.name.includes('poem') ||
            c.term.name.includes('fire') ||
            c.term.name.includes('smoke') ||
            c.term.name.includes('blue')
        );

        interesting.forEach(c => {
            console.log(`\n   Concept: ${c.term.toString()}`);
             const beliefs = c.getTasksByType('BELIEF');
             if (beliefs.length > 0) {
                 console.log(`     Beliefs:`);
                 beliefs.forEach(b => console.log(`       - ${b.toString()} [Source: ${b.stamp?.source}]`));
             }
             const goals = c.getTasksByType('GOAL');
             if (goals.length > 0) {
                 console.log(`     Goals:`);
                 goals.forEach(g => console.log(`       - ${g.toString()} [Source: ${g.stamp?.source}]`));
             }
        });

    } catch (e) {
        console.error('Error during showcase:', e);
    } finally {
        await app.shutdown();
        console.log('\nShowcase finished.');
    }
}

main().catch(console.error);
