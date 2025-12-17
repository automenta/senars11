import { NAR } from '../../../core/src/nar/NAR.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';
import { completeNARIntegrationSuite, flexibleNARIntegrationSuite } from '../../support/commonTestSuites.js';
import { comprehensiveTestSuites, flexibleAssertions } from '../../support/testOrganizer.js';
import { inputAll } from '../../support/testHelpers.js';

describe('NAR Integration Tests', () => {
    let nar;
    const narProvider = () => nar;

    beforeAll(async () => {
        nar = new NAR({ debug: { enabled: false }, cycle: { delay: 10, maxTasksPerCycle: 5 } });
        if (nar.initialize) await nar.initialize();
    });

    afterAll(async () => {
        if (nar) await nar.dispose();
    });
    afterEach(() => {
        if (nar) nar.reset();
    });

    comprehensiveTestSuites.inputOutputModuleTests('NAR',
        async () => {
            const instance = new NAR({ debug: { enabled: false }, cycle: { delay: 10, maxTasksPerCycle: 5 } });
            if (instance.initialize) await instance.initialize();
            return {
                process: async (input) => {
                    await instance.input(input);
                    return [...instance.getBeliefs(), ...instance.getGoals(), ...instance.getQuestions()];
                },
                destroy: async () => await instance.dispose()
            };
        },
        [
            {
                description: 'handles simple belief input',
                input: 'cat.',
                expectedOutput: null,
                validator: (r) => r.some(b => b.term.toString().includes('cat') && b.type === 'BELIEF')
            },
            {
                description: 'handles goal input',
                input: 'want_food!',
                expectedOutput: null,
                validator: (r) => r.some(b => b.term.toString().includes('want_food') && b.type === 'GOAL')
            },
            {
                description: 'handles compound terms',
                input: '(&, A, B).',
                expectedOutput: null,
                validator: (r) => r.some(b => b.term.toString().includes('&'))
            }
        ]
    );

    completeNARIntegrationSuite(narProvider);
    flexibleNARIntegrationSuite(narProvider);

    describe('Memory Storage and Retrieval', () => {
        beforeEach(() => new TermFactory());

        test('should store tasks in appropriate concepts', async () => {
            await inputAll(narProvider(), ['(cat --> animal).', '(dog --> animal).', '(cat --> pet).']);
            const concepts = narProvider().memory.getAllConcepts();
            flexibleAssertions.expectAtLeast(concepts, 3, 'concepts in memory');

            const allConceptTerms = concepts.map(c => c.term.toString());
            ['cat', 'dog', 'animal'].forEach(t => expect(allConceptTerms.some(term => term.includes(t))).toBe(true));

            const catConcept = concepts.find(c => c.term.toString().includes('cat'));
            if (catConcept) flexibleAssertions.expectAtLeast([catConcept], 1, 'cat concept found');
        });

        test('should retrieve beliefs by query term', async () => {
            await inputAll(narProvider(), ['(cat --> animal).', '(dog --> animal).', '(bird --> animal).']);
            const beliefs = narProvider().getBeliefs().filter(b => b.term.toString().toLowerCase().includes('cat'));
            flexibleAssertions.expectAtLeast(beliefs, 1, 'beliefs containing "cat"');
            if (beliefs.length > 0) expect(beliefs[0].term.toString()).toContain('cat');
        });

        test('should handle compound terms correctly', async () => {
            await narProvider().input('(&, cat, pet, animal).');
            expect(narProvider().getBeliefs().find(b => b.term.toString().includes('cat') && b.term.toString().includes('pet'))).toBeDefined();
        });
    });

    describe('System Statistics', () => {
        test('should provide comprehensive statistics', async () => {
            await inputAll(narProvider(), ['(cat --> animal).', '(dog --> animal).']);
            await narProvider().step();
            expect(narProvider().getStats()).toMatchObject({
                memoryStats: expect.anything(),
                taskManagerStats: expect.anything(),
                streamReasonerStats: expect.anything()
            });
        });

        test('should track memory usage correctly', async () => {
            await inputAll(narProvider(), ['(cat --> animal).', '(dog --> animal).', '(bird --> animal).']);
            const stats = narProvider().getStats();
            expect(stats.memoryStats.totalConcepts).toBeGreaterThanOrEqual(1);
            expect(stats.memoryStats.totalTasks).toBeGreaterThanOrEqual(1);
        });
    });
});
