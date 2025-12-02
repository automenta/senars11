import {jest, describe, beforeAll, afterAll, test, expect} from '@jest/globals';
import {App} from '../../../src/app/App.js';

describe('Hybrid LM-NAL Reasoning Integration', () => {
    let app;
    let agent;

    const config = {
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/flan-t5-small',
            enabled: true,
            temperature: 0.1,
            circuitBreaker: {
                failureThreshold: 5,
                resetTimeout: 10000
            }
        },
        subsystems: {
            lm: true
        }
    };

    beforeAll(async () => {
        app = new App(config);
        agent = await app.start({startAgent: true});

        // Wait for components to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock the LM generation
        jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
            console.log('[MockLM] Prompt:', prompt);

            // Narsese Translation
            if (prompt.includes('"Dogs are animals"')) {
                return '<dog --> animal>.';
            }
            if (prompt.includes('"Fish live in water"')) {
                return '<fish --> [live_in_water]>.';
            }

            // Concept Elaboration
            if (prompt.includes('Concept property elaboration')) {
                if (prompt.includes('"bird"')) return '<bird --> [fly]>.';
            }

            return '';
        });
    });

    afterAll(async () => {
        if (app) await app.shutdown();
        jest.restoreAllMocks();
    });

    test('should translate natural language to Narsese and update stats', async () => {
        console.log('Testing NL translation...');
        const input = '"Dogs are animals".';
        await agent.input(input);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        const concepts = agent.getConcepts();
        // Check for derived concept <dog --> animal>
        const hasDerived = concepts.some(c =>
            c.term.toString().includes('dog --> animal') ||
            c.term.toString().includes('<dog --> animal>')
        );

        expect(hasDerived).toBe(true);

        // Check stats
        const stats = agent.getStats();
        // Note: AsyncExecutions might be 0 if the rule decides not to run or if reasoner loop is tight.
        // But we expect it to run.
        const asyncExecs = stats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0;
        console.log('Async Rule Executions:', asyncExecs);
        expect(asyncExecs).toBeGreaterThan(0);
    });

    test('should elaborate concepts using LM', async () => {
        console.log('Testing Concept Elaboration...');
        await agent.input('bird.');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const concepts = agent.getConcepts();
        const hasElaboration = concepts.some(c =>
            c.term.toString().includes('fly')
        );

        expect(hasElaboration).toBe(true);
    });

    test('should support bidirectional synergy (Question Answering)', async () => {
        console.log('Testing Bidirectional Synergy...');
        await agent.input('"Fish live in water".');
        await new Promise(resolve => setTimeout(resolve, 3000));

        await agent.input('<fish --> ?x>?');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const concepts = agent.getConcepts();
        const hasKnowledge = concepts.some(c => c.term.toString().includes('live_in_water'));
        expect(hasKnowledge).toBe(true);
    });
});
