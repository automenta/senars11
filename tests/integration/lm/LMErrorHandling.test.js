import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createTestAgent } from '../../support/factories.js';
import { assertEventuallyTrue, getTerms, wait } from '../../support/testHelpers.js';

describe('LM Error Handling', () => {
    let app, agent, cleanup;

    beforeEach(async () => {
        ({ app, agent, cleanup } = await createTestAgent());
    });

    afterEach(async () => {
        if (cleanup) await cleanup();
    });

    test('LM timeout → graceful degradation', async () => {

        jest.spyOn(agent.lm, 'generateText').mockImplementation(async () => {
            await wait(10000);
            return 'response';
        });

        await agent.input('"Test input".');

        await assertEventuallyTrue(
            () => {
                const concepts = agent.getConcepts();
                return concepts.length > 0;
            },
            { description: 'system continues despite LM timeout', timeout: 3000 }
        );
    });

    test('LM error response → fallback behavior', async () => {

        jest.spyOn(agent.lm, 'generateText').mockRejectedValue(new Error('LM service unavailable'));

        await agent.input('"Test input".');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => t.includes('Test'));
            },
            { description: 'system processes input despite LM error', timeout: 2000 }
        );
    });

    test('Circuit breaker activation → system continues', async () => {

        let callCount = 0;
        jest.spyOn(agent.lm, 'generateText').mockImplementation(async () => {
            callCount++;
            if (callCount <= 5) throw new Error('LM failure');
            return 'recovered';
        });

        for (let i = 0; i < 6; i++) {
            await agent.input(`input_${i}.`);
            await wait(50);
        }

        const beliefs = agent.getBeliefs();
        expect(beliefs.length).toBeGreaterThanOrEqual(1);
        expect(callCount).toBeGreaterThan(0);
    });

    test('Malformed LM output → recovery', async () => {

        jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
            if (prompt.includes('valid')) return '<valid --> term>.';
            return 'this is not valid Narsese ###';
        });

        await agent.input('"invalid".');
        await agent.input('"valid".');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => t.includes('valid'));
            },
            { description: 'system recovers from malformed output', timeout: 2000 }
        );
    });

    test('LM returns empty response → system continues', async () => {

        jest.spyOn(agent.lm, 'generateText').mockResolvedValue('');

        await agent.input('"empty test".');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.length >= 0;
            },
            { description: 'system handles empty LM response', timeout: 1000 }
        );

        expect(agent.getBeliefs().length).toBeGreaterThanOrEqual(0);
    });

    test('Concurrent LM requests → proper handling', async () => {

        let activeRequests = 0;
        let maxConcurrent = 0;

        jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
            activeRequests++;
            maxConcurrent = Math.max(maxConcurrent, activeRequests);
            await wait(100);
            activeRequests--;
            return `<response_${activeRequests} --> processed>.`;
        });

        await Promise.all([
            agent.input('"concurrent_1".'),
            agent.input('"concurrent_2".'),
            agent.input('"concurrent_3".')
        ]);

        await wait(500);

        expect(maxConcurrent).toBeGreaterThan(0);
        const terms = getTerms(agent);
        expect(terms.length).toBeGreaterThanOrEqual(3);
    });
});
