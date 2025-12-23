import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createLMNALTestAgent } from '../../support/lmTestHelpers.js';
import { assertEventuallyTrue, getTerms, hasTermMatch } from '../../support/testHelpers.js';

const mockResponses = {
    '"Dogs are animals"': '<dog --> animal>.',
    '"Fish live in water"': '<fish --> [live_in_water]>.',
    'Concept property elaboration': '<bird --> [fly]>.'
};

describe('Hybrid LM-NAL Reasoning', () => {
    let app, agent;
    const useRealLM = process.env.TEST_REAL_LM === 'true';

    beforeAll(async () => {
        if (useRealLM) {
            // Real LM configuration for optional real model testing
            ({ app, agent } = await createLMNALTestAgent({}, {
                lm: {
                    provider: 'transformers',
                    modelName: 'Xenova/flan-t5-small',
                    enabled: true,
                    temperature: 0.1,
                    circuitBreaker: { failureThreshold: 5, resetTimeout: 1000 }
                },
                subsystems: { lm: true }
            }));
        } else {
            // Mock-based testing (default, fast)
            ({ app, agent } = await createLMNALTestAgent(mockResponses, {
                lm: {
                    modelName: 'Xenova/flan-t5-small',
                    temperature: 0.1,
                    circuitBreaker: { failureThreshold: 5, resetTimeout: 1000 }
                }
            }));
        }
    });

    afterAll(async () => {
        if (app) await app.shutdown();
    });

    test('should translate NL to Narsese', async () => {
        await agent.input('"Dogs are animals".');

        await assertEventuallyTrue(
            () => {
                const concepts = agent.getConcepts();
                return concepts.some(c => c.term.toString().includes('dog --> animal') || c.term.toString().includes('<dog --> animal>'));
            },
            { description: 'NL translation to Narsese' }
        );
    });

    test('should elaborate concepts using LM', async () => {
        await agent.input('bird.');

        await assertEventuallyTrue(
            () => hasTermMatch(getTerms(agent), 'fly'),
            { description: 'concept elaboration' }
        );
    });

    test('should support bidirectional synergy', async () => {
        await agent.input('"Fish live in water".');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => t.includes('fish') || t.includes('water'));
            },
            { description: 'LM creates knowledge', timeout: 5000 }
        );

        await agent.input('<fish --> ?x>?');
        const questions = agent.getQuestions();
        expect(questions.length).toBeGreaterThanOrEqual(1);
    }, 12000);
});
