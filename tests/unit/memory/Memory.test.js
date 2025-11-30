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

    test('initialization', () => {
        expect(memory.concepts.size).toBe(0);
        expect(memory.config).toStrictEqual(config);
    });

    test('task operations', () => {
        const term = createTerm('A');
        const task = createTask({term, truth: TEST_CONSTANTS.TRUTH.HIGH, budget: TEST_CONSTANTS.BUDGET.MEDIUM});

        expect(memory.addTask(task)).toBe(true);
        expect(memory.stats.totalConcepts).toBe(1);
        expect(memory.getConcept(term)).toMatchObject({term});

        memory.addTask(createTask({term, truth: TEST_CONSTANTS.TRUTH.MEDIUM})); // Duplicate task (concept exists)
        expect(memory.stats.totalConcepts).toBe(1);
        expect(memory.stats.totalTasks).toBe(2);

        expect(memory.removeConcept(term)).toBe(true);
        expect(memory.stats.totalConcepts).toBe(0);
    });

    test('priority and focus', () => {
        memory.addTask(createTask({term: createTerm('A'), budget: TEST_CONSTANTS.BUDGET.HIGH}));
        expect(memory.focusConcepts.size).toBe(1);

        memory.addTask(createTask({term: createTerm('B'), budget: TEST_CONSTANTS.BUDGET.LOW}));
        // Low priority might not enter focus depending on threshold
    });

    test('stats & utils', () => {
        memory.addTask(createTask({term: createTerm('A')}));
        expect(memory.getTotalTaskCount()).toBe(1);
        expect(memory.getDetailedStats()).toMatchObject({totalConcepts: 1});
        memory.clear();
        expect(memory.stats.totalConcepts).toBe(0);
    });

    test('advanced', () => {
        const tA = createTerm('A');
        memory.addTask(createTask({term: tA, budget: TEST_CONSTANTS.BUDGET.HIGH}));

        memory.boostConceptActivation(tA, 0.6);
        expect(memory.getConceptsByCriteria({minActivation: 0.5})).not.toHaveLength(0);
        expect(memory.getMostActiveConcepts(5)).not.toHaveLength(0);

        const c = memory.getConcept(tA);
        const [origAct, origQual] = [c.activation, c.quality];

        memory.boostConceptActivation(tA, 0.2);
        expect(c.activation).toBeGreaterThanOrEqual(origAct);

        memory.updateConceptQuality(tA, 0.1);
        expect(c.quality).toBeGreaterThanOrEqual(origQual);

        const lastConsolidation = memory.stats.lastConsolidation;
        memory.consolidate();
        expect(memory.stats.lastConsolidation).toBeGreaterThanOrEqual(lastConsolidation);
    });

    test('error handling', () => {
        expect(memory.addTask(null)).toBe(false);
        expect(() => memory.consolidate()).not.toThrow();
        expect(() => memory.getConcept(null)).not.toThrow();
    });
});
