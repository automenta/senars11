import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Punctuation, Task } from '../../../../core/src/task/Task.js';
import { TermFactory } from '../../../../core/src/term/TermFactory.js';
import { createLMNALTestAgent, assertNALDerivation, assertLMTranslation } from '../../../support/lmTestHelpers.js';
import { assertEventuallyTrue, getTerms, hasTermMatch } from '../../../support/testHelpers.js';

describe('NAL → LM Reasoning', () => {
    let app, agent, termFactory;

    beforeAll(async () => {
        ({ app, agent } = await createLMNALTestAgent());
        termFactory = new TermFactory();
    });

    afterAll(async () => {
        if (app) await app.shutdown();
    });

    test('NAL syllogism → LM explanation', async () => {
        await agent.input('<exercise --> activity>.');
        await agent.input('<activity --> healthy_behavior>.');

        await assertEventuallyTrue(
            () => hasTermMatch(getTerms(agent), 'exercise', 'healthy') || hasTermMatch(getTerms(agent), 'explanation'),
            { description: 'syllogistic derivation or explanation' }
        );
    });

    test('NAL induction → LM elaboration', async () => {
        await agent.input('<robin --> bird>.');
        await agent.input('<robin --> [red_breast]>.');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return hasTermMatch(terms, 'bird', 'red') || hasTermMatch(terms, 'robin');
            },
            { description: 'induction result or elaboration' }
        );
    });

    test('NAL abduction → LM validation', async () => {
        await agent.input('<cat --> mammal>.');
        await agent.input('<dog --> mammal>.');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => ['cat', 'dog', 'mammal'].some(w => t.includes(w)));
            },
            { description: 'abduction result' }
        );
    });

    test('NAL conversion → reversed inheritance', async () => {
        await agent.input('<student --> person>.');

        await assertEventuallyTrue(
            () => hasTermMatch(getTerms(agent), 'student', 'person'),
            { description: 'conversion result' }
        );
    });
});
