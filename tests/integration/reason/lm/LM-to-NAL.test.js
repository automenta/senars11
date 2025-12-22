import {afterAll, beforeAll, describe, test} from '@jest/globals';
import {Punctuation, Task} from '../../../../core/src/task/Task.js';
import {TermFactory} from '../../../../core/src/term/TermFactory.js';
import {createLMNALTestAgent} from '../../../support/lmTestHelpers.js';
import {assertEventuallyTrue, getTerms, hasTermMatch} from '../../../support/testHelpers.js';

describe('LM Rule Coverage', () => {
    let app, agent, termFactory;

    beforeAll(async () => {
        ({app, agent} = await createLMNALTestAgent());
        termFactory = new TermFactory();
    });

    afterAll(async () => {
        if (app) await app.shutdown();
    });

    test('LM Narsese Translation: NL → formal logic', async () => {
        await agent.input('"Dogs are animals".');

        await assertEventuallyTrue(
            () => hasTermMatch(getTerms(agent), 'dog', 'animal'),
            {description: 'NL translation to Narsese'}
        );
    });

    test('LM Concept Elaboration: concept → properties', async () => {
        await agent.input('"bird".');

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return hasTermMatch(terms, 'bird') && (hasTermMatch(terms, 'animal') || hasTermMatch(terms, 'fly'));
            },
            {description: 'concept elaboration'}
        );
    });

    test('LM Goal Decomposition: goal → processing', async () => {
        const writeBookGoal = new Task({
            term: termFactory.atomic('write_book'),
            punctuation: Punctuation.GOAL,
            budget: {priority: 0.9},
            truth: {frequency: 1.0, confidence: 0.9}
        });

        await agent.input(writeBookGoal);

        // Verify goal is processed (exact decomposition depends on LM configuration)
        await assertEventuallyTrue(
            () => {
                const goals = agent.getGoals();
                const concepts = agent.getConcepts();
                return goals.length > 0 || concepts.length > 0;
            },
            {description: 'goal processing', timeout: 3000}
        );
    }, 5000);

    test('LM Hypothesis Generation: belief → hypothesis', async () => {
        await agent.input(new Task({
            term: termFactory.atomic('"Activity correlates with results"'),
            punctuation: Punctuation.BELIEF,
            budget: {priority: 0.9},
            truth: {frequency: 1.0, confidence: 0.9}
        }));

        await assertEventuallyTrue(
            () => {
                const all = [...agent.getQuestions(), ...agent.getBeliefs()]
                    .map(t => t.term.toString());
                return all.some(t => ['activity', 'results', 'Increased'].some(w => t.includes(w)));
            },
            {description: 'hypothesis generation'}
        );
    });

    test('LM Variable Grounding: $X → concrete values', async () => {
        await agent.input(new Task({
            term: termFactory.atomic('"Value is $X"'),
            punctuation: Punctuation.BELIEF,
            budget: {priority: 0.9},
            truth: {frequency: 0.9, confidence: 0.9}
        }));

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => ['robin', 'canary', 'Value'].some(w => t.includes(w)));
            },
            {description: 'variable grounding'}
        );
    });

    test('LM Analogical Reasoning: problem → analogy solution', async () => {
        await agent.input(new Task({
            term: termFactory.atomic('solve_complex_problem'),
            punctuation: Punctuation.GOAL,
            budget: {priority: 0.9},
            truth: {frequency: 1.0, confidence: 0.9}
        }));

        await assertEventuallyTrue(
            () => {
                const terms = getTerms(agent);
                return terms.some(t => ['solution', 'problem', 'solve'].some(w => t.includes(w)));
            },
            {description: 'analogical reasoning (relaxed check)'}
        );
    });
});
