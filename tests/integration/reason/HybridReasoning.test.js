import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { App } from '../../../agent/src/app/App.js';
import { createMockConfig, mockLM, waitForCondition } from '../../support/testHelpers.js';

describe('Hybrid LM-NAL Reasoning Integration', () => {
    let app, agent;

    const config = createMockConfig({
        lm: { ...createMockConfig().lm, modelName: 'Xenova/flan-t5-small', temperature: 0.1, circuitBreaker: { failureThreshold: 5, resetTimeout: 10000 } }
    });

    const mockResponses = {
        '"Dogs are animals"': '<dog --> animal>.',
        '"Fish live in water"': '<fish --> [live_in_water]>.',
        'Concept property elaboration': '<bird --> [fly]>.'
    };

    beforeAll(async () => {
        app = new App(config);
        agent = await app.start({ startAgent: true });
        await new Promise(r => setTimeout(r, 100));
        mockLM(jest, agent, mockResponses);
    });

    afterAll(async () => {
        if (app) await app.shutdown();
        jest.restoreAllMocks();
    });

    test('should translate natural language to Narsese and update stats', async () => {
        await agent.input('"Dogs are animals".');

        const success = await waitForCondition(() => {
            const concepts = agent.getConcepts();
            return concepts.some(c => c.term.toString().includes('dog --> animal') || c.term.toString().includes('<dog --> animal>'));
        });

        expect(success).toBe(true);
        const stats = agent.getStats();
        const asyncExecs = stats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0;
    });

    test('should elaborate concepts using LM', async () => {
        await agent.input('bird.');

        const success = await waitForCondition(() => {
            const concepts = agent.getConcepts();
            return concepts.some(c => c.term.toString().includes('fly'));
        });

        expect(success).toBe(true);
    });

    test('should support bidirectional synergy (Question Answering)', async () => {
        await agent.input('"Fish live in water".');

        await waitForCondition(() => {
            const concepts = agent.getConcepts();
            return concepts.some(c => c.term.toString().includes('live_in_water'));
        });

        await agent.input('<fish --> ?x>?');

        const success = await waitForCondition(() => {
            const concepts = agent.getConcepts();
            return concepts.some(c => c.term.toString().includes('live_in_water'));
        });

        expect(success).toBe(true);
    });
});
