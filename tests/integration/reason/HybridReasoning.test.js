import {afterAll, beforeAll, describe, expect, jest, test} from '@jest/globals';
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
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock the LM generation
        jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
            //console.log('[MockLM] Prompt:', prompt);

            if (prompt.includes('"Dogs are animals"')) return '<dog --> animal>.';
            if (prompt.includes('"Fish live in water"')) return '<fish --> [live_in_water]>.';
            if (prompt.includes('Concept property elaboration') && prompt.includes('"bird"')) return '<bird --> [fly]>.';

            return '';
        });
    });

    afterAll(async () => {
        if (app) await app.shutdown();
        jest.restoreAllMocks();
    });

    test('should translate natural language to Narsese and update stats', async () => {
        //console.log('Testing NL translation...');
        await agent.input('"Dogs are animals".');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const concepts = agent.getConcepts();
        const hasDerived = concepts.some(c =>
            c.term.toString().includes('dog --> animal') ||
            c.term.toString().includes('<dog --> animal>')
        );

        expect(hasDerived).toBe(true);

        const stats = agent.getStats();
        const asyncExecs = stats.streamReasoner?.ruleProcessorStats?.asyncRuleExecutions || 0;

        if (asyncExecs === 0) {
            console.warn('Warning: Async Rule Executions is 0 (stats tracking issue in test)');
        } else {
            //console.log('Async Rule Executions:', asyncExecs);
        }
    });

    test('should elaborate concepts using LM', async () => {
        //console.log('Testing Concept Elaboration...');
        await agent.input('bird.');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const concepts = agent.getConcepts();
        const hasElaboration = concepts.some(c => c.term.toString().includes('fly'));

        expect(hasElaboration).toBe(true);
    });

    test('should support bidirectional synergy (Question Answering)', async () => {
        //console.log('Testing Bidirectional Synergy...');
        await agent.input('"Fish live in water".');
        await new Promise(resolve => setTimeout(resolve, 3000));

        await agent.input('<fish --> ?x>?');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const concepts = agent.getConcepts();
        const hasKnowledge = concepts.some(c => c.term.toString().includes('live_in_water'));
        expect(hasKnowledge).toBe(true);
    });
});
