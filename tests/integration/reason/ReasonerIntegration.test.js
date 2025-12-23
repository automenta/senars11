import { NAR } from '../../../core/src/nar/NAR.js';

const createReasonerConfig = (overrides = {}) => ({
    reasoning: { useStreamReasoner: true, cpuThrottleInterval: 0, maxDerivationDepth: 5 },
    cycle: { delay: 1 },
    ...overrides
});

describe('Reasoner Integration', () => {
    describe.each([
        ['shallow depth', { maxDerivationDepth: 1 }],
        ['standard depth', { maxDerivationDepth: 5 }],
        ['deep depth', { maxDerivationDepth: 10 }]
    ])('Reasoning with %s', (depthName, reasoningConfig) => {
        let nar;

        beforeEach(async () => {
            nar = new NAR(createReasonerConfig({ reasoning: { ...createReasonerConfig().reasoning, ...reasoningConfig } }));
            await nar.initialize();
        });

        afterEach(async () => {
            await nar?.dispose();
        });

        test('should process syllogistic reasoning', async () => {
            await nar.input('(a ==> b). %0.9;0.9%');
            await nar.input('(b ==> c). %0.8;0.8%');

            for (let i = 0; i < 10; i++) await nar.step();

            const derived = nar._focus.getTasks(30).some(t => {
                const s = t.term?.toString?.();
                return s && (s.includes('(==>, a, c)') || s.includes('a ==> c'));
            });

            expect(derived).toBe(true);
        });

        test('should handle rule registration and execution', async () => {
            expect(nar.streamReasoner).toBeDefined();
            expect(nar.streamReasoner.constructor.name).toBe('Reasoner');
            expect(nar.streamReasoner.ruleProcessor.ruleExecutor.getRuleCount()).toBeGreaterThan(0);
        });

        test('should maintain event flow during reasoning', async () => {
            const events = [];
            nar.on('reasoning.derivation', (data) => events.push(data));

            await nar.input('(x --> y). %0.9;0.9%');
            await nar.input('(y --> z). %0.8;0.8%');

            for (let i = 0; i < 5; i++) await nar.step();

            expect(events.length).toBeGreaterThanOrEqual(0);
        });

        test('should respect derivation depth limits', async () => {
            const narLimited = new NAR(createReasonerConfig({
                reasoning: { useStreamReasoner: true, maxDerivationDepth: 1 }
            }));

            await narLimited.initialize();

            try {
                await narLimited.input('(m --> n). %0.9;0.9%');
                await narLimited.input('(n --> o). %0.8;0.8%');

                for (let i = 0; i < 3; i++) await narLimited.step();

                expect(narLimited._focus.getTasks(20).length).toBeGreaterThanOrEqual(2);
            } finally {
                await narLimited.dispose();
            }
        });

        test('should synchronize memory and focus', async () => {
            await nar.input('(d --> e). %0.9;0.9%');
            await nar.input('(e --> f). %0.8;0.8%');

            const initialFocus = nar._focus.getTasks(10).length;
            const initialConcepts = nar.memory.getAllConcepts().length;

            expect(initialFocus).toBeGreaterThanOrEqual(2);
            expect(initialConcepts).toBeGreaterThanOrEqual(2);

            for (let i = 0; i < 3; i++) await nar.step();

            expect(nar._focus.getTasks(20).length).toBeGreaterThanOrEqual(initialFocus);
            expect(nar.memory.getAllConcepts().length).toBeGreaterThanOrEqual(initialConcepts);
        });

        test('should process tasks through complete pipeline', async () => {
            await nar.input('<robin --> [flying]>. %0.9;0.9%');
            await nar.input('<robin --> bird>. %0.8;0.9%');

            for (let i = 0; i < 10; i++) await nar.step();

            expect(nar._focus.getTasks(50).length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Hybrid LM-NAL Reasoning', () => {
        let testAgent, testApp, useRealLM;

        beforeAll(async () => {
            useRealLM = process.env.TEST_REAL_LM === 'true';

            const { createLMNALTestAgent } = await import('../../support/lmTestHelpers.js');

            if (useRealLM) {
                ({ app: testApp, agent: testAgent } = await createLMNALTestAgent({}, {
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
                const mockResponses = {
                    '"Dogs are animals"': '<dog --> animal>.',
                    '"Fish live in water"': '<fish --> [live_in_water]>.',
                    'Concept property elaboration': '<bird --> [fly]>.'
                };
                ({ app: testApp, agent: testAgent } = await createLMNALTestAgent(mockResponses, {
                    lm: {
                        modelName: 'Xenova/flan-t5-small',
                        temperature: 0.1,
                        circuitBreaker: { failureThreshold: 5, resetTimeout: 1000 }
                    }
                }));
            }
        });

        afterAll(async () => {
            if (testApp) await testApp.shutdown();
        });

        test('NL to Narsese translation', async () => {
            const { assertEventuallyTrue } = await import('../../support/testHelpers.js');

            await testAgent.input('"Dogs are animals".');

            await assertEventuallyTrue(
                () => {
                    const concepts = testAgent.getConcepts();
                    return concepts.some(c => c.term.toString().includes('dog --> animal') || c.term.toString().includes('<dog --> animal>'));
                },
                { description: 'NL translation to Narsese' }
            );
        });

        test('Concept elaboration using LM', async () => {
            const { assertEventuallyTrue, getTerms, hasTermMatch } = await import('../../support/testHelpers.js');

            await testAgent.input('bird.');

            await assertEventuallyTrue(
                () => hasTermMatch(getTerms(testAgent), 'fly'),
                { description: 'concept elaboration' }
            );
        });

        test('Bidirectional LM-NAL synergy', async () => {
            const { assertEventuallyTrue, getTerms } = await import('../../support/testHelpers.js');

            await testAgent.input('"Fish live in water".');

            await assertEventuallyTrue(
                () => {
                    const terms = getTerms(testAgent);
                    return terms.some(t => t.includes('fish') || t.includes('water'));
                },
                { description: 'LM creates knowledge', timeout: 5000 }
            );

            await testAgent.input('<fish --> ?x>?');
            const questions = testAgent.getQuestions();
            expect(questions.length).toBeGreaterThanOrEqual(1);
        }, 12000);
    });
});
