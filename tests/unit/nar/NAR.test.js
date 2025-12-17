import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { NAR } from '../../../core/src/nar/NAR.js';
import { Memory } from '../../../core/src/memory/Memory.js';

describe('NAR', () => {
    let nar;

    beforeEach(async () => {
        nar = new NAR({
            memory: { maxConcepts: 10 },
            lm: { enabled: false },
            tools: { enabled: false }
        });
        await nar.initialize();
    });

    afterEach(async () => nar?.dispose?.());

    test('initializes correctly', () => {
        expect(nar).toBeDefined();
        expect(nar.memory).toBeInstanceOf(Memory);
        expect(nar.isRunning).toBe(false);
    });

    test('starts and stops', () => {
        expect(nar.start()).toBe(true);
        expect(nar.isRunning).toBe(true);
        expect(nar.stop()).toBe(true);
        expect(nar.isRunning).toBe(false);
    });

    test('processes input', async () => {
        await nar.start();
        expect(await nar.input('<cat --> animal>.')).toBe(true);
        expect(nar.getConceptByName('cat')).toBeDefined();
    });

    test('runs cycles', async () => {
        await nar.start();
        const results = await nar.runCycles(5);
        expect(results).toHaveLength(5);
    });

    test('resets system', async () => {
        await nar.start();
        await nar.input('<cat --> animal>.');
        nar.reset();
        expect(nar.isRunning).toBe(false);
        expect(nar.memory.stats.totalConcepts).toBe(0);
    });

    describe('Observability', () => {
        beforeEach(async () => {
            await nar.start();
            await nar.input('<cat --> animal>.');
            await nar.input('<dog --> animal>.');
            await nar.input('<sky --> blue>!');
            await nar.input('<?x --> ?type>?');
        });

        test('queries concepts', () => {
            const beliefs = nar.query('cat');
            expect(beliefs).toBeDefined();
            expect(Array.isArray(beliefs)).toBe(true);
        });

        test('gets all beliefs', () =>
            expect(Array.isArray(nar.getBeliefs())).toBe(true)
        );

        test('gets goals', () =>
            expect(Array.isArray(nar.getGoals())).toBe(true)
        );

        test('gets questions', () =>
            expect(Array.isArray(nar.getQuestions())).toBe(true)
        );

        test('gets concept priorities', () => {
            const priorities = nar.getConceptPriorities();
            expect(Array.isArray(priorities)).toBe(true);
            expect(priorities.length).toBeGreaterThan(0);
            expect(priorities[0]).toHaveProperty('term');
            expect(priorities[0]).toHaveProperty('priority');
        });
    });

    describe('State Management', () => {
        test('serializes and deserializes', async () => {
            await nar.start();
            await nar.input('<cat --> animal>.');

            const state = nar.serialize();
            expect(state).toBeDefined();
            expect(state.memory).toBeDefined();
            expect(state.config).toBeDefined();

            const newNar = new NAR();
            expect(await newNar.deserialize(state)).toBe(true);
            expect(newNar.getConceptByName('cat')).toBeDefined();
            await newNar.dispose();
        });

        test('gets stats', () => {
            const stats = nar.getStats();
            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('isRunning');
            expect(stats).toHaveProperty('cycleCount');
            expect(stats).toHaveProperty('memoryStats');
        });
    });

    describe('Component Interaction', () => {
        test('error on missing LM for generation', async () =>
            await expect(nar.generateWithLM('test')).rejects.toThrow('Language Model is not enabled')
        );

        test('initializes tools safely', async () =>
            expect(await nar.initializeTools()).toBe(false)
        );
    });
});
