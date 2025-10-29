import { NarseseParser } from '../../../src/parser/NarseseParser.js';
import { TermFactory } from '../../../src/term/TermFactory.js';

describe('NarseseParser - Variable Parsing', () => {
    const parser = new NarseseParser();

    test('should parse simple query variables', () => {
        const result = parser.parse('?x.');
        expect(result.term.toString()).toBe('?x');
    });

    test('should parse simple dependent variables', () => {
        const result = parser.parse('$x.');
        expect(result.term.toString()).toBe('$x');
    });

    test('should parse simple independent variables', () => {
        const result = parser.parse('#x.');
        expect(result.term.toString()).toBe('#x');
    });

    test('should parse pattern variables', () => {
        const result = parser.parse('*.');
        expect(result.term.toString()).toBe('*');
    });

    test('should parse products with variables', () => {
        const result = parser.parse('(?a, ?b).');
        expect(result.term.toString()).toBe('(?a, ?b)');
    });

    test('should parse equality with variables', () => {
        const result = parser.parse('(?a = 1).');
        expect(result.term.toString()).toBe('(=, ?a, 1)');
    });

    test('should parse complex expressions with variables', () => {
        const result = parser.parse('(add(?a, ?b) = 3).');
        expect(result.term.toString()).toBe('(=, (add, ?a, ?b), 3)');
    });

    test('should parse complex back-solving formulas', () => {
        const result = parser.parse('((&, (?a = 1), (add(?a, ?b) = 3)) ==> accept(*, ?b)).');
        expect(result.term.toString()).toBe('(==>, (&, (=, ?a, 1), (=, (add, ?a, ?b), 3)), (accept, *, ?b))');
    });
});