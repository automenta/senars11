import {NarseseParser} from '../../../src/parser/NarseseParser.js';

describe('NarseseParser - Regression Test for Parser Fix', () => {
    const parser = new NarseseParser();

    test('should parse tight operators correctly', () => {
        const result = parser.parse('(a-->b). %1.0;0.9%');
        expect(result.term.toString()).toBe('(-->, a, b)');
        expect(result.truthValue).toEqual({frequency: 1.0, confidence: 0.9});
    });
});