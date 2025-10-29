import { NarseseParser } from '../../../src/parser/NarseseParser.js';
import { TermFactory } from '../../../src/term/TermFactory.js';

describe('NarseseParser - Basic Functionality', () => {
    const parser = new NarseseParser();

    test('should parse atomic terms', () => {
        const result = parser.parse('cat.');
        expect(result.term.toString()).toBe('cat');
    });

    test('should parse product terms', () => {
        const result = parser.parse('(cat,dog).');
        expect(result.term.toString()).toBe('(cat, dog)');
    });

    test('should parse infix compounds with spaced operators', () => {
        const result = parser.parse('(cat --> dog).');
        expect(result.term.toString()).toBe('(-->, cat, dog)');
    });

    test('should parse infix compounds with tight operators', () => {
        const result = parser.parse('(cat-->dog).');
        expect(result.term.toString()).toBe('(-->, cat, dog)'); // Should normalize spacing
    });
});