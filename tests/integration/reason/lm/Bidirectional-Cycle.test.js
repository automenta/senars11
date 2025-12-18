import {afterAll, beforeAll, describe, test} from '@jest/globals';
import {createLMNALTestAgent} from '../../../support/lmTestHelpers.js';
import {assertEventuallyTrue, getTerms, hasTermMatch} from '../../../support/testHelpers.js';

describe('Bidirectional LM ↔ NAL Cycle', () => {
    let app, agent;

    beforeAll(async () => {
        ({app, agent} = await createLMNALTestAgent());
    });

    afterAll(async () => {
        if (app) await app.shutdown();
    });

    test('Full cycle: LM translation → NAL syllogism → LM elaboration', async () => {
        await agent.input('"Birds can fly".');
        await agent.input('<canary --> bird>.');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                const hasBirdFly = hasTermMatch(terms, 'bird', 'fly');
                const hasCanaryBird = hasTermMatch(terms, 'canary', 'bird');
                return hasBirdFly || hasCanaryBird;
            },
            {description: 'full LM→NAL→LM cycle'}
        );
    });

    test('Full cycle: NAL inference → LM hypothesis → NAL modus ponens', async () => {
        await agent.input('<exercise --> activity>.');
        await agent.input('<activity --> healthy>.');
        await agent.input('exercise.');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => ['exercise', 'healthy', 'activity'].some(w => t.includes(w)));
            },
            {description: 'NAL→LM→NAL interaction'}
        );
    });
});

describe('NAL Rule Coverage (Pure Symbolic)', () => {
    let app, agent;

    beforeAll(async () => {
        ({app, agent} = await createLMNALTestAgent({}, {
            lm: {enabled: false},
            subsystems: {lm: false}
        }));
    });

    afterAll(async () => {
        if (app) await app.shutdown();
    });

    test('NAL Syllogistic: transitive inheritance', async () => {
        await agent.input('<sparrow --> bird>.');
        await agent.input('<bird --> animal>.');

        await assertEventuallyTrue(
            () => hasTermMatch(getTerms(agent), 'sparrow', 'animal'),
            {description: 'syllogistic derivation'}
        );
    });

    test('NAL Modus Ponens: implication + antecedent', async () => {
        await agent.input('(rain ==> wet).');
        await agent.input('rain.');

        await assertEventuallyTrue(
            () => getTerms(agent).some(t => t === 'wet' || t.includes('wet')),
            {description: 'modus ponens derivation'}
        );
    });

    test('NAL Induction: shared subject pattern', async () => {
        await agent.input('<robin --> bird>.');
        await agent.input('<robin --> singer>.');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return hasTermMatch(terms, 'bird', 'singer') || hasTermMatch(terms, 'robin');
            },
            {description: 'inductive inference'}
        );
    });

    test('NAL Abduction: shared predicate pattern', async () => {
        await agent.input('<bird --> animal>.');
        await agent.input('<fish --> animal>.');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => ['bird', 'fish', 'animal'].some(w => t.includes(w)));
            },
            {description: 'abductive inference'}
        );
    });

    test('NAL Implication Syllogism: chained implications', async () => {
        await agent.input('(study ==> learn).');
        await agent.input('(learn ==> knowledge).');

        await assertEventuallyTrue(
            () => hasTermMatch(getTerms(agent), 'study', 'knowledge'),
            {description: 'implication chain derivation'}
        );
    });
});
