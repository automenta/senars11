import {TermFactory} from '../../../src/term/TermFactory.js';

describe('TermFactory', () => {
    let factory;

    beforeEach(() => {
        factory = new TermFactory();
    });

    describe('Caching and Uniqueness', () => {
        test.each([
            {
                name: 'identical atomic terms',
                create1: f => f.atomic('A'),
                create2: f => f.atomic('A'),
                expected: 'same'
            },
            {
                name: 'identical compound terms',
                create1: f => f.inheritance(f.atomic('A'), f.atomic('B')),
                create2: f => f.inheritance(f.atomic('A'), f.atomic('B')),
                expected: 'same'
            },
            {
                name: 'different atomic terms',
                create1: f => f.atomic('A'),
                create2: f => f.atomic('B'),
                expected: 'different'
            },
            {
                name: 'different compound terms (operator)',
                create1: f => f.inheritance(f.atomic('A'), f.atomic('B')),
                create2: f => f.similarity(f.atomic('A'), f.atomic('B')),
                expected: 'different'
            },
        ])('$name -> $expected instance', ({create1, create2, expected}) => {
            const [t1, t2] = [create1(factory), create2(factory)];
            expected === 'same' ? expect(t1).toBe(t2) : expect(t1).not.toBe(t2);
        });
    });

    describe('Normalization', () => {
        test.each([
            {
                name: 'commutativity',
                term1: f => f.conjunction(f.atomic('A'), f.atomic('B')),
                term2: f => f.conjunction(f.atomic('B'), f.atomic('A'))
            },
            {
                name: 'associativity',
                term1: f => f.conjunction(f.atomic('A'), f.conjunction(f.atomic('B'), f.atomic('C'))),
                term2: f => f.conjunction(f.atomic('A'), f.atomic('B'), f.atomic('C'))
            },
            {
                name: 'redundancy',
                term1: f => f.conjunction(f.atomic('A'), f.atomic('A')),
                term2: f => f.conjunction(f.atomic('A'))
            },
        ])('$name', ({term1, term2}) => {
            expect(term1(factory)).toBe(term2(factory));
        });

        test('equality operator: sort but NO redundancy removal', () => {
            const t1 = factory.equality(factory.atomic('B'), factory.atomic('A'));
            expect(t1.name).toBe('(=, A, B)');

            const t2 = factory.equality(factory.atomic('A'), factory.atomic('A'));
            expect(t2.components).toHaveLength(2);
            expect(t2.name).toBe('(=, A, A)');
        });
    });

    describe('Convenience Methods', () => {
        test('predicate -> ^ term', () => {
            const [pred, args] = [factory.atomic('pred'), factory.atomic('args')];
            const term = factory.predicate(pred, args);

            expect(term).toMatchObject({
                operator: '^',
                components: [pred, args]
            });
            expect(term.components).toHaveLength(2);
        });

        test('tuple -> , term', () => {
            const [a, b] = [factory.atomic('a'), factory.atomic('b')];
            const term = factory.tuple(a, b);

            expect(term).toMatchObject({
                operator: ',',
                components: [a, b]
            });
            expect(term.components).toHaveLength(2);
        });

        test('atomic -> atomic term', () => {
            const term = factory.atomic('A');
            expect(term).toMatchObject({
                isAtomic: true,
                name: 'A'
            });
        });
    });
});
