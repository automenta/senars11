/**
 * Unit Test for Task Validation - Proper Jest Format
 * 
 * This test validates that Task instantiation properly validates:
 * 1. BELIEF tasks must have truth values
 * 2. GOAL tasks must have truth values  
 * 3. QUESTION tasks cannot have truth values
 */

import {Task} from '../src/task/Task.js';
import {Truth} from '../src/Truth.js';
import {Term} from '../src/term/Term.js';

describe('Task Validation', () => {
    let mockTerm;

    beforeEach(() => {
        // Create a mock term for testing
        mockTerm = new Term({name: 'test'});
    });

    test('BELIEF task without truth should throw error', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '.',
                truth: null,
                budget: {priority: 0.5}
            });
        }).toThrow(/BELIEF tasks must have valid truth values/);
    });

    test('BELIEF task with valid truth should succeed', () => {
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
    });

    test('GOAL task without truth should throw error', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '!',
                truth: null,
                budget: {priority: 0.5}
            });
        }).toThrow(/GOAL tasks must have valid truth values/);
    });

    test('GOAL task with valid truth should succeed', () => {
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
    });

    test('QUESTION task with truth should throw error', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '?',
                truth: new Truth(1.0, 0.9), // Invalid - question with truth
                budget: {priority: 0.5}
            });
        }).toThrow(/Questions cannot have truth values/);
    });

    test('QUESTION task without truth should succeed', () => {
        const task = new Task({
            term: mockTerm,
            punctuation: '?',
            truth: null, // Valid - question without truth
            budget: {priority: 0.5}
        });

        expect(task).toBeDefined();
        expect(task.type).toBe('QUESTION');
        expect(task.truth).toBeNull();
    });

    test('Default punctuation (.) should require truth for BELIEF', () => {
        expect(() => {
            new Task({
                term: mockTerm,
                // no punctuation, should default to '.'
                truth: null,
                budget: {priority: 0.5}
            });
        }).toThrow(/BELIEF tasks must have valid truth values/);
    });
});