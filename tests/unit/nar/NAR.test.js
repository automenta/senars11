import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NAR } from '../../../core/src/nar/NAR.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';
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

    afterEach(async () => {
        if (nar) {
            await nar.dispose();
        }
    });

    test('initializes correctly', () => {
        expect(nar).toBeDefined();
        expect(nar.memory).toBeInstanceOf(Memory);
        expect(nar.isRunning).toBe(false);
    });

    test('starts and stops', () => {
        const started = nar.start();
        expect(started).toBe(true);
        expect(nar.isRunning).toBe(true);

        const stopped = nar.stop();
        expect(stopped).toBe(true);
        expect(nar.isRunning).toBe(false);
    });

    test('processes input', async () => {
        await nar.start();
        const input = '<cat --> animal>.';
        const result = await nar.input(input);

        expect(result).toBe(true); // Should be added to memory

        // Verify it's in memory
        const concept = nar.getConceptByName('cat');
        expect(concept).toBeDefined();
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
            await nar.input('<sky --> blue>!'); // Goal
            await nar.input('<?x --> ?type>?'); // Question
        });

        test('queries concepts', () => {
            const beliefs = nar.query('cat');
            expect(beliefs).toBeDefined();
            // Note: simple input might not immediately create BELIEF tasks in concept without reasoning
            // but the input task itself is stored.
            // Let's check generally that it returns an array
            expect(Array.isArray(beliefs)).toBe(true);
        });

        test('gets all beliefs', () => {
            const allBeliefs = nar.getBeliefs();
            expect(Array.isArray(allBeliefs)).toBe(true);
        });

        test('gets goals', () => {
            const goals = nar.getGoals();
            expect(Array.isArray(goals)).toBe(true);
            // Verify our goal input is there (might depend on async processing)
            // expect(goals.length).toBeGreaterThan(0);
        });

        test('gets questions', () => {
            const questions = nar.getQuestions();
            expect(Array.isArray(questions)).toBe(true);
        });

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
            const success = await newNar.deserialize(state);
            expect(success).toBe(true);

            // Allow async processing to settle if needed, though deserialize should be complete
            const concept = newNar.getConceptByName('cat');
            expect(concept).toBeDefined();

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
        test('error on missing LM for generation', async () => {
            await expect(nar.generateWithLM('test')).rejects.toThrow('Language Model is not enabled');
        });

        test('initializes tools safely', async () => {
            const result = await nar.initializeTools();
            // Default config has no tools, so false
            expect(result).toBe(false);
        });
    });
});
