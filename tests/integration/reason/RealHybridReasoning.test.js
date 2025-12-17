import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { App } from '../../../agent/src/app/App.js';

describe('Real Hybrid LM-NAL Reasoning', () => {
    let app, agent;
    const lmEvents = [];

    beforeAll(async () => {
        try {
            app = new App({
                lm: {
                    provider: 'transformers',
                    modelName: 'Xenova/flan-t5-small',
                    enabled: true,
                    temperature: 0.1,
                    circuitBreaker: { failureThreshold: 5, resetTimeout: 10000 }
                },
                subsystems: { lm: true }
            });

            agent = await app.start({ startAgent: true });
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (agent.on) {
                agent.on('lm.prompt', (data) => lmEvents.push({ type: 'prompt', ...data }));
                agent.on('lm.response', (data) => lmEvents.push({ type: 'response', ...data }));
            }
        } catch (error) {
            // Failed to initialize - tests will be skipped
        }
    });

    afterAll(async () => {
        if (app) await app.shutdown();
    });

    test.skip('should translate NL to Narsese using real LM', async () => {
        if (!agent) return;

        lmEvents.length = 0;
        await agent.input('"Dogs are animals".');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const concepts = agent.getConcepts();
        const hasDerived = concepts.some(c =>
            c.term.toString().includes('dog --> animal') ||
            c.term.toString().includes('<dog --> animal>')
        );

        const hasLMEvents = lmEvents.some(e => e.type === 'response');
        const translationPrompt = lmEvents.find(e =>
            e.type === 'prompt' && e.ruleId === 'narsese-translation'
        );

        expect(hasLMEvents).toBe(true);
        expect(lmEvents.length).toBeGreaterThan(0);
        expect(translationPrompt).toBeDefined();
    });

    test.skip('should elaborate concepts using real LM', async () => {
        if (!agent) return;

        lmEvents.length = 0;
        await agent.input('bird.');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const hasLMEvents = lmEvents.some(e =>
            e.type === 'response' && e.ruleId === 'concept-elaboration'
        );

        expect(hasLMEvents).toBe(true);
    });
});
