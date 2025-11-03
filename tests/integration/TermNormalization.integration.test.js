import { TermFactory } from '../../src/term/TermFactory.js';
import { NarseseParser } from '../../src/parser/NarseseParser.js';

describe('Term Normalization Integration Test', () => {
    let termFactory;
    let parser;

    beforeEach(() => {
        termFactory = new TermFactory();
        parser = new NarseseParser(termFactory);
    });

    test('should treat terms with commutative operators as equal regardless of component order', () => {
        // This test will fail until canonical normalization is implemented
        const term1 = parser.parse('(&, A, B).');
        const term2 = parser.parse('(&, B, A).');

        // The TermFactory should return the *exact same* term object for canonically equivalent terms.
        // Or, at the very least, they should be considered deeply equal.
        expect(term1.term.equals(term2.term)).toBe(true);
        expect(term1.term.name).toEqual(term2.term.name);
    });
});
