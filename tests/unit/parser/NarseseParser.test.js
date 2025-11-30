import {NarseseParser} from '../../../src/parser/NarseseParser.js';
import {Term} from '../../../src/term/Term.js';

describe('NarseseParser', () => {
    const parser = new NarseseParser();

    describe('Basic Terms', () => {
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

        test('should parse product terms', () => {
            const result = parser.parse('(cat,dog).');
            expect(result.term.toString()).toBe('(cat, dog)');
        });
    });

    describe('Statements & Punctuation', () => {
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

    describe('Infix Compounds', () => {
         test('should parse infix compounds with spaced operators', () => {
            const result = parser.parse('(cat --> dog).');
            expect(result.term.toString()).toBe('(-->, cat, dog)');
        });

        test('should parse infix compounds with tight operators', () => {
            const result = parser.parse('(cat-->dog).');
            expect(result.term.toString()).toBe('(-->, cat, dog)');
        });
    });
});
