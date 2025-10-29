import { NarseseParser } from '../../../src/parser/NarseseParser.js';

describe('NarseseParser - Operator Parsing', () => {
    const parser = new NarseseParser();

    // Test operators that work with parentheses (basic inheritance and similarity)
    const basicParenOperators = [
        { input: '(a-->b).', desc: 'tight inheritance' },
        { input: '(a<->b).', desc: 'tight similarity' },
        { input: '(a=b).', desc: 'tight equality' },
        { input: '(a&&b).', desc: 'tight conjunction' },
        { input: '(a||b).', desc: 'tight disjunction' },
    ];

    basicParenOperators.forEach(testCase => {
        test(`should parse ${testCase.desc}: ${testCase.input}`, () => {
            expect(() => parser.parse(testCase.input)).not.toThrow();
        });
    });

    const spacingTests = [
        { input: '(a --> b).', desc: 'spaced inheritance' },
        { input: '(a <-> b).', desc: 'spaced similarity' },
        { input: '(a = b).', desc: 'spaced equality' },
        { input: '(a && b).', desc: 'spaced conjunction' },
        { input: '(a || b).', desc: 'spaced disjunction' },
    ];

    spacingTests.forEach(testCase => {
        test(`should parse ${testCase.desc}: ${testCase.input}`, () => {
            const result = parser.parse(testCase.input);
            expect(result).toBeDefined();
        });
    });
});