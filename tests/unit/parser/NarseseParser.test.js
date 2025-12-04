import {NarseseParser} from '../../../core/src/parser/NarseseParser.js';
import {Term} from '../../../core/src/term/Term.js';

describe('NarseseParser', () => {
    const parser = new NarseseParser();

    describe('Basic Terms', () => {
        test.each([
            ['atomic', 'a.', 'a'],
            ['compound', '(a,b).', '(a, b)'],
            ['product', '(cat,dog).', '(cat, dog)']
        ])('%s', (_, input, expected) => {
            const result = parser.parse(input);
            expect(result.term).toBeInstanceOf(Term);
            expect(result.term.toString()).toBe(expected);
        });
    });

    describe('Statements & Punctuation', () => {
        test.each([
            ['question', 'a?', '?', 'QUESTION'],
            ['goal', 'a!', '!', 'GOAL'],
            ['belief', 'a.', '.', 'BELIEF']
        ])('%s', (_, input, punct, type) => {
            const result = parser.parse(input);
            expect(result.punctuation).toBe(punct);
            expect(result.taskType).toBe(type);
        });

        test('truth value', () => {
            expect(parser.parse('a. %1.0;0.9%').truthValue).toEqual({frequency: 1.0, confidence: 0.9});
        });
    });

    describe('Operators & Spacing', () => {
        const operators = [
            ['inheritance', '-->'], ['similarity', '<->'], ['equality', '='],
            ['conjunction', '&&'], ['disjunction', '||'], ['implication', '==>']
        ];

        test.each(operators)('%s tight', (name, op) => {
            // Support both ( ) and < > where appropriate, usually implication uses < >
            const input = op === '==>' ? `<a${op}b>.` : `(a${op}b).`;
            expect(parser.parse(input).term.operator).toBe(op);
        });

        test.each(operators)('%s spaced', (name, op) => {
            const input = op === '==>' ? `<a ${op} b>.` : `(a ${op} b).`;
            expect(parser.parse(input).term.operator).toBe(op);
        });

        test('mixed brackets support', () => {
            expect(parser.parse('(a==>b).').term.operator).toBe('==>');
        });
    });
});
