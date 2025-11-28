/**
 * Unit Test for Task Validation
 *
 * This test validates that Task instantiation properly validates:
 * 1. BELIEF tasks must have truth values
 * 2. GOAL tasks must have truth values
 * 3. QUESTION tasks cannot have truth values
 */

import { Task } from '../src/task/Task.js';
import { Truth } from '../src/Truth.js';
import { TermFactory } from '../src/term/TermFactory.js';

describe('Task Validation', () => {
    let mockTerm;
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        mockTerm = termFactory.atomic('test');
    });

    // Parameterized tests for task validation
    test.each([
        { type: 'BELIEF', punctuation: '.', truthRequired: true, validTruth: new Truth(1.0, 0.9) },
        { type: 'GOAL', punctuation: '!', truthRequired: true, validTruth: new Truth(0.8, 0.7) },
        { type: 'QUESTION', punctuation: '?', truthRequired: false, validTruth: null }
    ])('should validate $type tasks correctly', ({ type, punctuation, truthRequired, validTruth }) => {
        if (truthRequired) {
            // Test that task without truth throws error
            expect(() => {
                new Task({
                    term: mockTerm,
                    punctuation,
                    truth: null,
                    budget: { priority: 0.5 }
                });
            }).toThrow(new RegExp(`${type} tasks must have valid truth values`));

            // Test that task with valid truth succeeds
            const task = new Task({
                term: mockTerm,
                punctuation,
                truth: validTruth,
                budget: { priority: 0.5 }
            });

            expect(task).toBeDefined();
            expect(task.type).toBe(type);
            expect(task.truth).toBe(validTruth);
        } else {
            // For questions, test that task with truth throws error
            expect(() => {
                new Task({
                    term: mockTerm,
                    punctuation,
                    truth: new Truth(1.0, 0.9),
                    budget: { priority: 0.5 }
                });
            }).toThrow(/Questions cannot have truth values/);

            // Test that task without truth succeeds
            const task = new Task({
                term: mockTerm,
                punctuation,
                truth: null,
                budget: { priority: 0.5 }
            });

            expect(task).toBeDefined();
            expect(task.type).toBe(type);
            expect(task.truth).toBeNull();
        }
    });

    test('Default punctuation (.) should require truth for BELIEF', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                truth: null,
                budget: { priority: 0.5 }
            });
        }).toThrow(/BELIEF tasks must have valid truth values/);
    });
});