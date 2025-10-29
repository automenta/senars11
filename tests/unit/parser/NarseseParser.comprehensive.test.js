import { NarseseParser } from '../../../src/parser/NarseseParser.js';

describe('NarseseParser - Comprehensive Format Support', () => {
    const parser = new NarseseParser();

    const testCases = [
        { input: 'cat.', desc: 'Atomic term with punctuation' },
        { input: '(cat --> animal).', desc: 'Parentheses with spaced inheritance' },
        { input: '<cat --> animal>.', desc: 'Angle brackets with spaced inheritance' },
        { input: '(a ==> b).', desc: 'Parentheses implication' },
        { input: '<a ==> b>.', desc: 'Angle implication' },
        { input: '(&, a, b).', desc: 'Prefix conjunction' },
        { input: '{a, b}.', desc: 'Extensional set' },
        { input: '[a].', desc: 'Intensional set (single element)' },
    ];

    testCases.forEach(testCase => {
        test(`should parse ${testCase.desc}: ${testCase.input}`, () => {
            const result = parser.parse(testCase.input);
            expect(result).toBeDefined();
            expect(result.term).toBeDefined();
        });
    });
});