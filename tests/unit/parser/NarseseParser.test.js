import {NarseseParser} from '../../../src/parser/NarseseParser.js';
import {Term} from '../../../src/term/Term.js';

describe('NarseseParser', () => {
    const parser = new NarseseParser();

    test('parses an atomic term', () => {
        const result = parser.parse('a.');
        expect(result.term).toBeInstanceOf(Term);
        expect(result.term.toString()).toBe('a');
    });

    test('parses a simple compound term', () => {
        const result = parser.parse('(a,b).');
        expect(result.term).toBeInstanceOf(Term);
        expect(result.term.toString()).toBe('(a, b)');
    });

    test('parses a statement with a question mark', () => {
        const result = parser.parse('a?');
        expect(result.punctuation).toBe('?');
        expect(result.taskType).toBe('QUESTION');
    });

    test('parses a statement with a goal', () => {
        const result = parser.parse('a!');
        expect(result.punctuation).toBe('!');
        expect(result.taskType).toBe('GOAL');
    });

    test('parses a statement with a truth value', () => {
        const result = parser.parse('a. %1.0;0.9%');
        expect(result.truthValue).toEqual({frequency: 1.0, confidence: 0.9});
    });
});
