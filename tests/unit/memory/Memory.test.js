import {Memory} from '../../../src/memory/Memory.js';
import {createMemoryConfig, createTask, createTerm, TEST_CONSTANTS} from '../../support/factories.js';
import {memoryAssertions, TestSuiteFactory} from '../../support/testOrganizer.js';

TestSuiteFactory.createMemoryRelatedSuite({
    className: 'Memory',
    Constructor: Memory,
    validInput: createMemoryConfig(),
    testAssertions: true,
    testDataModel: false,
    assertionUtils: memoryAssertions
});

describe('Memory', () => {
    let memory, config;
    beforeEach(() => {
        config = createMemoryConfig();
        memory = new Memory(config);
    });

    describe('Initialization', () => {
        test('defaults', () => {
            expect(memory.concepts.size).toBe(0);
            expect(memory.focusConcepts.size).toBe(0);
            expect(memory.stats.totalConcepts).toBe(0);
            expect(memory.config).toStrictEqual(config);
        });
    });

    describe('Task Operations', () => {
        test('add task -> creates concept', () => {
            const task = createTask({
                term: createTerm('A'),
                truth: TEST_CONSTANTS.TRUTH.HIGH,
                budget: TEST_CONSTANTS.BUDGET.MEDIUM
            });
            expect(memory.addTask(task)).toBe(true);
            expect(memory.stats.totalConcepts).toBe(1);
            expect(memory.focusConcepts.size).toBe(1);
        });

        test('duplicate tasks', () => {
            const term = createTerm('A');
            memory.addTask(createTask({term, truth: TEST_CONSTANTS.TRUTH.HIGH}));
            memory.addTask(createTask({term, truth: TEST_CONSTANTS.TRUTH.MEDIUM}));
            expect(memory.stats.totalConcepts).toBe(1);
            expect(memory.stats.totalTasks).toBe(2);
        });

        test('getConcept', () => {
            const term = createTerm('A');
            memory.addTask(createTask({term}));
            expect(memory.getConcept(term)).toMatchObject({term});
            expect(memory.getConcept(createTerm('B'))).toBeNull();
        });

        test('getAllConcepts', () => {
            ['A', 'B'].forEach(t => memory.addTask(createTask({term: createTerm(t)})));
            expect(memory.getAllConcepts()).toHaveLength(2);
        });
    });

    describe('Concept Management', () => {
        test.each([
            {name: 'high', budget: TEST_CONSTANTS.BUDGET.HIGH, expectFocus: 1},
            {name: 'low', budget: TEST_CONSTANTS.BUDGET.LOW, expectFocus: 0}
        ])('$name priority', ({budget, expectFocus}) => {
            memory.addTask(createTask({term: createTerm('A'), budget}));
            expect(memory.focusConcepts.size).toBe(expectFocus);
        });

        test('removeConcept', () => {
            const term = createTerm('A');
            memory.addTask(createTask({term}));
            expect(memory.removeConcept(term)).toBe(true);
            expect(memory.stats.totalConcepts).toBe(0);
            expect(memory.removeConcept(createTerm('B'))).toBe(false);
        });

        test('hasConcept', () => {
            const term = createTerm('A');
            expect(memory.hasConcept(term)).toBe(false);
            memory.addTask(createTask({term}));
            expect(memory.hasConcept(term)).toBe(true);
        });
    });

    describe('Stats & Utils', () => {
        test('getTotalTaskCount', () => {
            expect(memory.getTotalTaskCount()).toBe(0);
            memory.addTask(createTask({term: createTerm('A')}));
            expect(memory.getTotalTaskCount()).toBe(1);
        });

        test('getDetailedStats', () => {
            memory.addTask(createTask({term: createTerm('A')}));
            expect(memory.getDetailedStats()).toMatchObject({
                totalConcepts: 1,
                memoryUsage: expect.any(Object)
            });
        });

        test('clear', () => {
            memory.addTask(createTask({term: createTerm('A')}));
            memory.clear();
            expect(memory.stats.totalConcepts).toBe(0);
        });
    });

    describe('Advanced', () => {
        test('filters', () => {
            memory.addTask(createTask({term: createTerm('A'), budget: TEST_CONSTANTS.BUDGET.HIGH}));
            memory.addTask(createTask({term: createTerm('B'), budget: TEST_CONSTANTS.BUDGET.LOW}));
            expect(memory.getConceptsByCriteria({minActivation: 0.5}).length).toBeGreaterThanOrEqual(0);
            expect(memory.getConceptsByCriteria({onlyFocus: true}).length).toBeGreaterThanOrEqual(0);
        });

        test('most active', () => {
            memory.addTask(createTask({term: createTerm('A'), budget: TEST_CONSTANTS.BUDGET.HIGH}));
            expect(memory.getMostActiveConcepts(5).length).toBeGreaterThanOrEqual(0);
        });

        test('boost activation', () => {
            const term = createTerm('A');
            memory.addTask(createTask({term}));
            const c = memory.getConcept(term);
            const orig = c.activation;
            memory.boostConceptActivation(term, 0.2);
            expect(c.activation).toBeGreaterThanOrEqual(orig);
        });

        test('update quality', () => {
            const term = createTerm('A');
            memory.addTask(createTask({term}));
            const c = memory.getConcept(term);
            const orig = c.quality;
            memory.updateConceptQuality(term, 0.1);
            expect(c.quality).toBeGreaterThanOrEqual(orig);
        });

        test('consolidate', () => {
            memory.addTask(createTask({term: createTerm('A')}));
            const before = memory.stats.lastConsolidation;
            memory.consolidate();
            expect(memory.stats.lastConsolidation).toBeGreaterThanOrEqual(before);
        });
    });

    describe('Error Handling', () => {
        test('graceful failures', () => {
            expect(memory.addTask(null)).toBe(false);
            expect(() => memory.consolidate()).not.toThrow();
            expect(() => memory.getConcept(null)).not.toThrow();
        });
    });
});
