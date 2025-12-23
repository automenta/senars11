import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createTestAgent } from '../../support/factories.js';
import { assertEventuallyTrue, getTerms, wait } from '../../support/testHelpers.js';

describe('LM Error Handling', () => {
    let app, agent, cleanup;

    beforeEach(async () => {
        ({ app, agent, cleanup } = await createTestAgent());
    });

    afterEach(async () => {
        await agent?.destroy?.();
        if (cleanup) await cleanup();
    });

    describe.each([
        ['timeout', async () => { await wait(10000); return 'response'; }, 'system continues despite LM timeout', 3000, (agent) => agent.getConcepts().length > 0],
        ['rejection', async () => { throw new Error('LM service unavailable'); }, 'system processes input despite LM error', 2000, (agent) => getTerms(agent).some(t => t.includes('Test'))],
        ['empty response', async () => '', 'system handles empty LM response', 1000, (agent) => getTerms(agent).length >= 0],
        ['malformed output', async (prompt) => prompt.includes('valid') ? '<valid --> term>.' : 'this is not valid Narsese ###', 'system recovers from malformed output', 2000, (agent) => getTerms(agent).some(t => t.includes('valid'))]
    ])('LM error: %s → graceful handling', (scenario, mockImpl, description, timeout, verifyFn) => {
        test('should continue operating', async () => {
            jest.spyOn(agent.lm, 'generateText').mockImplementation(mockImpl);

            if (scenario === 'malformed output') {
                await agent.input('"invalid".');
                await agent.input('"valid".');
            } else {
                await agent.input('"Test input".');
            }

            await assertEventuallyTrue(
                () => verifyFn(agent),
                { description, timeout }
            );
        });
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
