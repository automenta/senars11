
import {createNarseseTranslationRule} from '../../../../../src/reason/rules/lm/LMNarseseTranslationRule.js';
import {Task} from '../../../../../src/task/Task.js';
import {Term, TermType} from '../../../../../src/term/Term.js';
import {Punctuation} from '../../../../../src/reason/utils/TaskUtils.js';
import {jest} from '@jest/globals';

class MockLM {
    constructor(response) {
        this.response = response;
    }
    async generateText() {
        return this.response;
    }
    async process(prompt) { return this.generateText(prompt); }
    async query(prompt) { return this.generateText(prompt); }
}

class MockParser {
    parse(text) {
        // Simple mock that returns an object if text looks like (a --> b).
        // Matches (content).
        const trimmed = text.trim();
        if (trimmed.startsWith('(') && trimmed.endsWith('.')) {
            const content = trimmed.slice(1, -2); // remove ( and ).
            const term = new Term(TermType.ATOM, `(${content})`);
            return {
                term: term,
                punctuation: '.',
                truthValue: null
            };
        }
        return null;
    }
}

describe('LMNarseseTranslationRule Extraction', () => {
    let mockParser;
    let mockTermFactory;

    beforeEach(() => {
        mockParser = new MockParser();
        mockTermFactory = {};
    });

    test('should extract Narsese from clean output', async () => {
        const lm = new MockLM('(cat --> mammal).');
        const rule = createNarseseTranslationRule({lm, parser: mockParser, termFactory: mockTermFactory});

        const premise = {
            term: new Term(TermType.ATOM, '"Cats are mammals"'),
            type: 'BELIEF'
        };

        const result = await rule.apply(premise);
        expect(result).toHaveLength(1);
        expect(result[0].term.toString()).toBe('(cat --> mammal)');
    });

    test('should extract Narsese from output with prefix', async () => {
        const lm = new MockLM('Sentence: "Cats are mammals." -> (cat --> mammal).');
        const rule = createNarseseTranslationRule({lm, parser: mockParser, termFactory: mockTermFactory});

        const premise = {
            term: new Term(TermType.ATOM, '"Cats are mammals"'),
            type: 'BELIEF'
        };

        const result = await rule.apply(premise);
        expect(result).toHaveLength(1);
        expect(result[0].term.toString()).toBe('(cat --> mammal)');
    });

    test('should extract Narsese from output with suffix', async () => {
        const lm = new MockLM('(cat --> mammal). This is the translation.');
        const rule = createNarseseTranslationRule({lm, parser: mockParser, termFactory: mockTermFactory});

        const premise = {
            term: new Term(TermType.ATOM, '"Cats are mammals"'),
            type: 'BELIEF'
        };

        const result = await rule.apply(premise);
        expect(result).toHaveLength(1);
        expect(result[0].term.toString()).toBe('(cat --> mammal)');
    });

    test('should extract Narsese from output with both prefix and suffix', async () => {
        const lm = new MockLM('Translation: (cat --> mammal). Correct?');
        const rule = createNarseseTranslationRule({lm, parser: mockParser, termFactory: mockTermFactory});

        const premise = {
            term: new Term(TermType.ATOM, '"Cats are mammals"'),
            type: 'BELIEF'
        };

        const result = await rule.apply(premise);
        expect(result).toHaveLength(1);
        expect(result[0].term.toString()).toBe('(cat --> mammal)');
    });

    test('should fail gracefully if no valid Narsese found', async () => {
        const lm = new MockLM('No translation available.');
        const rule = createNarseseTranslationRule({lm, parser: mockParser, termFactory: mockTermFactory});

        const premise = {
            term: new Term(TermType.ATOM, '"Cats are mammals"'),
            type: 'BELIEF'
        };

        const result = await rule.apply(premise);
        expect(result).toHaveLength(0);
    });
});
