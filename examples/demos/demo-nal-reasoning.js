
import { App } from '@senars/agent';

const log = (msg) => console.error(`[${new Date().toISOString().slice(11, 23)}] ${msg}`);

async function main() {
    log('1. Initializing Agent...');
    const app = new App({
        lm: {
            enabled: true,
            provider: 'transformers',
            modelName: 'Xenova/LaMini-Flan-T5-248M',
            loadTimeout: 60000
        },
        subsystems: { lm: true, rules: ['syllogistic-core'] }
    });

    const agent = await app.start({ startAgent: true });

    // Warmup
    log('2. Warmup...');
    await agent.processInput('Hello');

    log('3. Injecting Context...');
    await agent.input('(bird --> animal). %1.0;0.9%');
    await agent.input('(robin --> bird). %1.0;0.9%');

    log('4. Reasoning Cycles...');
    await agent.runCycles(5);

    log('5. Querying...');
    const start = Date.now();
    const response = await agent.processInput('Is a robin an animal?');
    log(`6. Response: "${response}" (${Date.now() - start}ms)`);

    if (!response.toLowerCase().includes('yes')) {
        log('WARNING: Unexpected response content');
    }

    log('7. Cleanup...');
    await app.shutdown();
    process.exit(0);
}

main().catch(e => {
    console.error('FAIL:', e.message);
    process.exit(1);
});
