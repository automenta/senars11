
import { App } from '@senars/agent';

const log = (msg) => console.error(`[${new Date().toISOString()}] ${msg}`);

async function main() {
    log('1. Starting verification script...');

    try {
        log('2. Initializing App with TransformersJS...');
        const app = new App({
            lm: {
                enabled: true,
                provider: 'transformers',
                modelName: 'Xenova/LaMini-Flan-T5-248M', // Faster load
                loadTimeout: 120000,
                temperature: 0.1
            }
        });

        log('3. Starting App (this triggers Agent setup)...');
        const agent = await app.start({ startAgent: true });

        if (!agent) throw new Error('Agent failed to start');

        // Attach progress listener
        if (agent.eventBus) {
            log('4. Attaching event listeners...');
            agent.eventBus.on('lm:model-dl-progress', (data) => {
                const p = data.progress;
                if (typeof p === 'number') {
                    process.stderr.write(`\r[DL] ${Math.round(p)}%`);
                } else if (p.status === 'progress') {
                    process.stderr.write(`\r[DL] ${p.file}: ${Math.round(p.progress)}%`);
                }
            });
        }

        log('5. Warming up LM...');
        await agent.processInput('Hello');
        log('   Warmup complete.');

        log('5. Warming up LM...');
        await agent.processInput('Hello');
        log('   Warmup complete.');

        log('6. Adding context and running cycles...');
        await agent.input('(bird --> animal). %0.9;0.9%');
        await agent.input('(robin --> bird). %0.9;0.9%');
        await agent.runCycles(5);
        log('   Context added.');

        log('7. Sending query: "Is a robin an animal?"...');
        const start = Date.now();
        const response = await agent.processInput('Is a robin an animal?');

        log('');
        log(`8. Response received in ${Date.now() - start}ms:`);
        log(`   "${response}"`);

        await app.shutdown();
        log('7. Verification complete. SUCCESS.');
        process.exit(0);

    } catch (e) {
        log('ERROR: ' + e.message);
        console.error(e);
        process.exit(1);
    }
}

main();
