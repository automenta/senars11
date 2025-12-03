import {jest, describe, beforeAll, afterAll, test, expect} from '@jest/globals';
import {App} from '../../../src/app/App.js';
import {Task, Punctuation} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Advanced Hybrid Reasoning (Mocked)', () => {
    let app;
    let agent;
    let termFactory;

    const config = {
        lm: {
            provider: 'transformers', // Mocked
            modelName: 'mock-model',
            enabled: true,
        },
        subsystems: {
            lm: true
        }
    };

    beforeAll(async () => {
        app = new App(config);
        agent = await app.start({startAgent: true});
        termFactory = new TermFactory();

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock the LM generation
        jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
            console.log('[MockLM] Prompt:', prompt);

            if (prompt.includes('Decompose the following goal')) {
                return 'Sub-goal: research topic\nSub-goal: draft content';
            }
            if (prompt.includes('concrete values for the variable')) {
                return 'value_A\nvalue_B';
            }
            if (prompt.includes('Think of a similar, well-understood problem')) {
                return 'Analogy: writing a book. Solution: Break it down into chapters.';
            }
            if (prompt.includes('plausible and testable hypothesis')) {
                return 'Hypothesis: Increased activity leads to better results.';
            }

            return '';
        });
    });

    afterAll(async () => {
        if (app) await app.shutdown();
        jest.restoreAllMocks();
    });

    test('should decompose high-level goals', async () => {
        console.log('Testing Goal Decomposition...');
        // Input a high priority goal manually
        const goalTaskWithTruth = new Task({
            term: termFactory.atomic('Write a book'),
            punctuation: Punctuation.GOAL,
            budget: {priority: 0.9},
            truth: {frequency: 1.0, confidence: 0.9}
        });

        await agent.input(goalTaskWithTruth);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const goals = agent.getGoals();
        const subGoalTerms = goals.map(g => g.term.toString());
        console.log('Goals found:', subGoalTerms);

        const hasSubGoal = subGoalTerms.some(t => t.includes('research topic') || t.includes('draft content'));
        expect(hasSubGoal).toBe(true);
    });

    test('should generate hypotheses from beliefs', async () => {
        console.log('Testing Hypothesis Generation...');
        const beliefTask = new Task({
            term: termFactory.atomic('Activity correlates with results'),
            punctuation: Punctuation.BELIEF,
            budget: {priority: 0.9},
            truth: {frequency: 1.0, confidence: 0.9}
        });

        await agent.input(beliefTask);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const questions = agent.getQuestions();
        const questionTerms = questions.map(q => q.term.toString());
        console.log('Questions found:', questionTerms);

        const hasHypothesis = questionTerms.some(t => t.includes('Increased activity') || t.includes('better results'));
        expect(hasHypothesis).toBe(true);
    });

    test.skip('should suggest values for variables (Grounding)', async () => {
        console.log('Testing Variable Grounding...');
        const variableTask = new Task({
            term: termFactory.atomic('Value is $X'),
            punctuation: Punctuation.BELIEF,
            budget: {priority: 0.9},
            truth: {frequency: 1.0, confidence: 0.9}
        });

        await agent.input(variableTask);

        await new Promise(resolve => setTimeout(resolve, 3000));

        const beliefs = agent.getBeliefs();
        const beliefTerms = beliefs.map(b => b.term.toString());
        console.log('Beliefs found:', beliefTerms);

        const hasGrounded = beliefTerms.some(t => t.includes('value_A') || t.includes('value_B'));
        expect(hasGrounded).toBe(true);
    });
});
