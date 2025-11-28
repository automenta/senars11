import { TermFactory } from '../../src/term/TermFactory.js';

describe('TermFactory Commutative Operator Test', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    test('equality operator should preserve both components even if identical', () => {
        const [fiveTerm, anotherFiveTerm] = [termFactory.atomic('5'), termFactory.atomic('5')];
        const equalityTerm = termFactory.equality(fiveTerm, anotherFiveTerm);

        expect(equalityTerm.components.length).toBe(2);
        expect(equalityTerm.operator).toBe('=');
    });

    test('equality operator with different components', () => {
        const [fiveTerm, threeTerm] = [termFactory.atomic('5'), termFactory.atomic('3')];
        const equalityTerm = termFactory.equality(fiveTerm, threeTerm);

        expect(equalityTerm.components.length).toBe(2);
    });
});