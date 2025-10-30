/**
 * Unit Test for Task Instantiation Validation
 *
 * This test verifies that Task instantiation properly validates:
 * 1. BELIEF tasks must have truth values
 * 2. GOAL tasks must have truth values
 * 3. QUESTION tasks cannot have truth values
 * 4. Only valid Truth objects are accepted
 * 5. Default punctuation behavior
 *
 * Each test either creates a valid Task or throws an appropriate error.
 */

import {Task} from '../src/task/Task.js';
import {Truth} from '../src/Truth.js';
import {Term} from '../src/term/Term.js';

describe('Task Instantiation Validation', () => {
    let mockTerm;

    beforeEach(() => {
        // Create a mock term for testing
        mockTerm = new Term({name: 'test'});
    });

    test('1. BELIEF task without truth should throw error', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '.',
                truth: null,
                budget: {priority: 0.5}
            });
        }).toThrow(/BELIEF tasks must have valid truth values/);
    });

    test('2. BELIEF task with valid truth should succeed', () => {
        const validTruth = new Truth(1.0, 0.9);
        const task = new Task({
            term: mockTerm,
            punctuation: '.',
            truth: validTruth,
            budget: {priority: 0.5}
        });

        expect(task).toBeDefined();
        expect(task.type).toBe('BELIEF');
        expect(task.truth).toBe(validTruth);
        expect(task.punctuation).toBe('.');
    });

    test('3. GOAL task without truth should throw error', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '!',
                truth: null,
                budget: {priority: 0.5}
            });
        }).toThrow(/GOAL tasks must have valid truth values/);
    });

    test('4. GOAL task with valid truth should succeed', () => {
        const validTruth = new Truth(0.8, 0.7);
        const task = new Task({
            term: mockTerm,
            punctuation: '!',
            truth: validTruth,
            budget: {priority: 0.5}
        });

        expect(task).toBeDefined();
        expect(task.type).toBe('GOAL');
        expect(task.truth).toBe(validTruth);
        expect(task.punctuation).toBe('!');
    });

    test('5. QUESTION task with truth should throw error', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '?',
                truth: new Truth(1.0, 0.9), // Invalid - question with truth
                budget: {priority: 0.5}
            });
        }).toThrow(/Questions cannot have truth values/);
    });

    test('6. QUESTION task without truth should succeed', () => {
        const task = new Task({
            term: mockTerm,
            punctuation: '?',
            truth: null, // Valid - question without truth
            budget: {priority: 0.5}
        });

        expect(task).toBeDefined();
        expect(task.type).toBe('QUESTION');
        expect(task.truth).toBeNull();
        expect(task.punctuation).toBe('?');
    });

    test('7. Default punctuation should be BELIEF and require truth', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                // no punctuation specified, should default to '.'
                truth: null,
                budget: {priority: 0.5}
            });
        }).toThrow(/BELIEF tasks must have valid truth values/);
    });

    test('8. Default punctuation with truth should succeed', () => {
        const validTruth = new Truth(0.9, 0.8);
        const task = new Task({
            term: mockTerm,
            // no punctuation specified, should default to '.'
            truth: validTruth,
            budget: {priority: 0.5}
        });

        expect(task).toBeDefined();
        expect(task.type).toBe('BELIEF');
        expect(task.punctuation).toBe('.');
        expect(task.truth).toBe(validTruth);
    });

    test('9. Proper term validation', () => {
        expect(() => {
            new Task({
                term: 'not a Term object', // Invalid term
                punctuation: '.',
                truth: new Truth(1.0, 0.9),
                budget: {priority: 0.5}
            });
        }).toThrow(/Task must be initialized with a valid Term object/);
    });

    test('10. Valid Truth object creation', () => {
        // Test creating Truth with valid values
        const truth = new Truth(0.75, 0.85);
        expect(truth.frequency).toBe(0.75);
        expect(truth.confidence).toBe(0.85);
    });

    test('11. Truth object validation in Task context', () => {
        // Test that invalid truth values are handled properly
        const truth = new Truth(-1, 2); // Invalid values (clamped by Truth constructor)
        expect(truth.frequency).toBe(0); // Should be clamped to [0,1] range
        expect(truth.confidence).toBe(1); // Should be clamped to [0,1] range

        // This should still work in a Task
        const task = new Task({
            term: mockTerm,
            punctuation: '.',
            truth: truth,
            budget: {priority: 0.5}
        });

        expect(task).toBeDefined();
        expect(task.truth.frequency).toBe(0);
        expect(task.truth.confidence).toBe(1);
    });

    test('12. Budget is properly frozen', () => {
        const budget = {priority: 0.7, durability: 0.6};
        const task = new Task({
            term: mockTerm,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
            budget: budget
        });

        expect(Object.isFrozen(task.budget)).toBe(true);
        expect(task.budget.priority).toBe(0.7);
    });

    test('13. Task object is frozen', () => {
        const task = new Task({
            term: mockTerm,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
            budget: {priority: 0.7}
        });

        expect(Object.isFrozen(task)).toBe(true);
    });

    test('14. Task type correctly set from punctuation', () => {
        const beliefTask = new Task({
            term: mockTerm,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
            budget: {priority: 0.5}
        });
        expect(beliefTask.type).toBe('BELIEF');

        const goalTask = new Task({
            term: mockTerm,
            punctuation: '!',
            truth: new Truth(1.0, 0.9),
            budget: {priority: 0.5}
        });
        expect(goalTask.type).toBe('GOAL');

        const questionTask = new Task({
            term: mockTerm,
            punctuation: '?',
            truth: null,
            budget: {priority: 0.5}
        });
        expect(questionTask.type).toBe('QUESTION');
    });
});

// Simple test runner for when executed directly
if (typeof require !== 'undefined' && require.main === module) {
    console.log('🧪 Running Task Instantiation Validation Tests...');

    // Run validation tests manually
    const tests = {
        'BELIEF without truth throws': () => {
            try {
                new Task({
                    term: mockTerm,
                    punctuation: '.',
                    truth: null,
                    budget: {priority: 0.5}
                });
                return false;
            } catch (e) {
                return e.message.includes('BELIEF tasks must have valid truth values');
            }
        },

        'BELIEF with truth succeeds': () => {
            try {
                const task = new Task({
                    term: mockTerm,
                    punctuation: '.',
                    truth: new Truth(1.0, 0.9),
                    budget: {priority: 0.5}
                });
                return task.type === 'BELIEF';
            } catch (e) {
                return false;
            }
        },

        'QUESTION with truth throws': () => {
            try {
                new Task({
                    term: mockTerm,
                    punctuation: '?',
                    truth: new Truth(1.0, 0.9),
                    budget: {priority: 0.5}
                });
                return false;
            } catch (e) {
                return e.message.includes('Questions cannot have truth values');
            }
        },

        'QUESTION without truth succeeds': () => {
            try {
                const task = new Task({
                    term: mockTerm,
                    punctuation: '?',
                    truth: null,
                    budget: {priority: 0.5}
                });
                return task.type === 'QUESTION';
            } catch (e) {
                return false;
            }
        }
    };

    // Create a simple mock term for the manual run
    const mockTerm = new (require('../src/term/Term.js').Term)({name: 'test'});

    Object.entries(tests).forEach(([name, testFn]) => {
        const result = testFn();
        console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'PASSED' : 'FAILED'}`);
    });

    console.log('\\n📋 Task validation tests completed.');
}