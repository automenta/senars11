#!/usr/bin/env node

import {TransformersJSProvider} from '../../core/src/lm/TransformersJSProvider.js';
import {EventEmitter} from 'events';

const countTokens = text => text.split(/\s+/).length;
const tokensPerSec = (tokens, ms) => ((tokens / ms) * 1000).toFixed(2);

async function main() {
    console.log('=== Minimal LM Inference Example ===\n');

    const eventBus = new EventEmitter();
    eventBus.on('lm:debug', data => {
        console.log('[DEBUG]', data.message, data.output ? '(output captured)' : '');
    });

    const provider = new TransformersJSProvider({
        modelName: 'Xenova/LaMini-Flan-T5-248M',
        debug: true,
        eventBus
    });

    console.log('Initializing model (first run downloads ~250MB)...');
    console.log('This may take 30-60 seconds on first run.\n');

    const prompt = 'Summarize: The cat sat on the mat.';
    console.log(`Prompt: "${prompt}"\n`);

    try {
        const startTime = Date.now();
        const result = await provider.generateText(prompt, {maxTokens: 50, temperature: 0.7});
        const duration = Date.now() - startTime;
        const tokens = countTokens(result);

        console.log(`Result: "${result}"\n`);
        console.log(`Inference time: ${duration}ms`);
        console.log(`Tokens: ~${tokens}`);
        console.log(`Throughput: ~${tokensPerSec(tokens, duration)} tokens/sec`);

    } catch (error) {
        console.error('Error during inference:', error.message);
        await provider.destroy();
        process.exit(1);
    }

    console.log('\n✅ Example completed successfully!');

    // Cleanup and exit
    await provider.destroy();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
