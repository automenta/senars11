import {TermFactory} from '../../../src/term/TermFactory.js';

describe('TermFactory', () => {
    let tf;
    beforeEach(() => { tf = new TermFactory(); });

    describe('Caching and Uniqueness', () => {
        test.each([
            {
                name: 'identical atomic terms',
                create1: f => f.atomic('A'),
                create2: f => f.atomic('A'),
                expected: true
            },
            {
                name: 'identical compound terms',
                create1: f => f.inheritance(f.atomic('A'), f.atomic('B')),
                create2: f => f.inheritance(f.atomic('A'), f.atomic('B')),
                expected: true
            },
            {
                name: 'different atomic terms',
                create1: f => f.atomic('A'),
                create2: f => f.atomic('B'),
                expected: false
            },
            {
                name: 'different compound terms (operator)',
                create1: f => f.inheritance(f.atomic('A'), f.atomic('B')),
                create2: f => f.similarity(f.atomic('A'), f.atomic('B')),
                expected: false
            },
        ])('$name', ({create1, create2, expected}) => {
            const [t1, t2] = [create1(tf), create2(tf)];
            expect(t1 === t2).toBe(expected);
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
            expect(term1(tf)).toBe(term2(tf));
        });

        test('equality operator: sort but NO redundancy removal', () => {
            const t1 = tf.equality(tf.atomic('B'), tf.atomic('A'));
            expect(t1.name).toBe('(=, A, B)');

            const t2 = tf.equality(tf.atomic('A'), tf.atomic('A'));
            expect(t2.components).toHaveLength(2);
            expect(t2.name).toBe('(=, A, A)');
        });
    });

    describe('Convenience Methods', () => {
        test('predicate -> ^ term', () => {
            const [pred, args] = [tf.atomic('pred'), tf.atomic('args')];
            const term = tf.predicate(pred, args);
            expect(term).toMatchObject({ operator: '^', components: [pred, args] });
        });

        test('tuple -> , term', () => {
            const [a, b] = [tf.atomic('a'), tf.atomic('b')];
            const term = tf.tuple(a, b);
            expect(term).toMatchObject({ operator: ',', components: [a, b] });
        });

        test('atomic -> atomic term', () => {
            const term = tf.atomic('A');
            expect(term).toMatchObject({ isAtomic: true, name: 'A' });
        });
    });
});
