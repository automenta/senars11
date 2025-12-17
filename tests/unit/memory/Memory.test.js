import { describe, test, expect, beforeEach } from '@jest/globals';
import { Memory } from '../../../core/src/memory/Memory.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';
import { Task } from '../../../core/src/task/Task.js';

describe('Memory', () => {
    let memory, termFactory;

    beforeEach(() => {
        memory = new Memory({ maxConcepts: 10, forgetPolicy: 'priority' });
        termFactory = new TermFactory();
    });

    const createTask = (termName) => new Task({
        term: termFactory.create(termName),
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
    });

    test('adds tasks and creates concepts', () => {
        const task = createTask('cat');
        expect(memory.addTask(task)).toBe(true);
        expect(memory.hasConcept(task.term)).toBe(true);
        expect(memory.stats.totalConcepts).toBe(1);
    });

    test('retrieves concepts', () => {
        const task = createTask('dog');
        memory.addTask(task);
        const concept = memory.getConcept(task.term);
        expect(concept).toBeDefined();
        expect(concept.term.toString()).toBe('dog');
    });

    test('removes concepts', () => {
        const task = createTask('bird');
        memory.addTask(task);
        expect(memory.removeConcept(task.term)).toBe(true);
        expect(memory.hasConcept(task.term)).toBe(false);
    });

    test('clears memory', () => {
        memory.addTask(createTask('fish'));
        memory.clear();
        expect(memory.stats.totalConcepts).toBe(0);
        expect(memory.concepts.size).toBe(0);
    });

    test('respects capacity limits', () => {
        for (let i = 0; i < 15; i++) {
            memory.addTask(createTask(`term_${i}`));
        }
        expect(memory.stats.totalConcepts).toBeLessThanOrEqual(10);
        expect(memory.stats.conceptsForgotten).toBeGreaterThan(0);
    });

    test('serialization roundtrip', () => {
        memory.addTask(createTask('serialization'));
        const serialized = memory.serialize();
        expect(serialized).toBeDefined();
        expect(serialized.concepts).toBeDefined();
    });

    test('handles exact capacity boundary', () => {
        for (let i = 0; i < 10; i++) {
            memory.addTask(createTask(`exact_${i}`));
        }
        expect(memory.stats.totalConcepts).toBeGreaterThan(8);
        expect(memory.stats.totalConcepts).toBeLessThanOrEqual(10);
    });
});
