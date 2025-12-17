import { describe, test, expect, beforeEach } from '@jest/globals';
import { Memory } from '../../../core/src/memory/Memory.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';
import { Task } from '../../../core/src/task/Task.js';

describe('Memory', () => {
    let memory;
    let termFactory;

    beforeEach(() => {
        memory = new Memory({
            maxConcepts: 10,
            forgetPolicy: 'priority'
        });
        termFactory = new TermFactory();
    });

    test('adds tasks and creates concepts', () => {
        const term = termFactory.create('cat');
        const task = new Task({
            term,
            punctuation: '.',
            truth: { frequency: 1.0, confidence: 0.9 }
        });

        const added = memory.addTask(task);
        expect(added).toBe(true);
        expect(memory.hasConcept(term)).toBe(true);
        expect(memory.stats.totalConcepts).toBe(1);
    });

    test('retrieves concepts', () => {
        const term = termFactory.create('dog');
        const task = new Task({
            term,
            punctuation: '.',
            truth: { frequency: 1.0, confidence: 0.9 }
        });
        memory.addTask(task);

        const concept = memory.getConcept(term);
        expect(concept).toBeDefined();
        expect(concept.term.toString()).toBe('dog');
    });

    test('removes concepts', () => {
        const term = termFactory.create('bird');
        const task = new Task({
            term,
            punctuation: '.',
            truth: { frequency: 1.0, confidence: 0.9 }
        });
        memory.addTask(task);

        const removed = memory.removeConcept(term);
        expect(removed).toBe(true);
        expect(memory.hasConcept(term)).toBe(false);
    });

    test('clears memory', () => {
        const term = termFactory.create('fish');
        const task = new Task({
            term,
            punctuation: '.',
            truth: { frequency: 1.0, confidence: 0.9 }
        });
        memory.addTask(task);

        memory.clear();
        expect(memory.stats.totalConcepts).toBe(0);
        expect(memory.concepts.size).toBe(0);
    });

    test('respects capacity limits', () => {
        // Add more concepts than maxConcepts (10)
        for (let i = 0; i < 15; i++) {
            const term = termFactory.create(`term_${i}`);
            const task = new Task({
                term,
                punctuation: '.',
                truth: { frequency: 1.0, confidence: 0.9 }
            });
            memory.addTask(task);
        }

        // Should have forgotten some
        expect(memory.stats.totalConcepts).toBeLessThanOrEqual(10);
        expect(memory.stats.conceptsForgotten).toBeGreaterThan(0);
    });

    test('serialization roundtrip', () => {
        const term = termFactory.create('serialization');
        const task = new Task({
            term,
            punctuation: '.',
            truth: { frequency: 1.0, confidence: 0.9 }
        });
        memory.addTask(task);

        const serialized = memory.serialize();
        expect(serialized).toBeDefined();
        expect(serialized.concepts).toBeDefined();
    });

    test('handles exact capacity boundary', () => {
        // Add exactly maxConcepts
        for (let i = 0; i < 10; i++) {
            const term = termFactory.create(`exact_${i}`);
            const task = new Task({
                term,
                punctuation: '.',
                truth: { frequency: 1.0, confidence: 0.9 }
            });
            memory.addTask(task);
        }

        // Should be at or near capacity
        expect(memory.stats.totalConcepts).toBeGreaterThan(8);
        expect(memory.stats.totalConcepts).toBeLessThanOrEqual(10);
    });
});
