import {TermFactory} from '../../../core/src/term/TermFactory.js';

describe('TermFactory', () => {
    let tf;
    beforeEach(() => {
        tf = new TermFactory();
    });

    describe('Caching', () => {
        test.each([
            ['identical atomic', f => f.atomic('A'), f => f.atomic('A'), true],
            ['identical compound', f => f.inheritance(f.atomic('A'), f.atomic('B')), f => f.inheritance(f.atomic('A'), f.atomic('B')), true],
            ['different atomic', f => f.atomic('A'), f => f.atomic('B'), false],
            ['different compound', f => f.inheritance(f.atomic('A'), f.atomic('B')), f => f.similarity(f.atomic('A'), f.atomic('B')), false],
        ])('%s', (_, create1, create2, expected) => {
            expect(create1(tf) === create2(tf)).toBe(expected);
        });
    });

    describe('Normalization', () => {
        test.each([
            ['commutativity', f => f.conjunction(f.atomic('A'), f.atomic('B')), f => f.conjunction(f.atomic('B'), f.atomic('A'))],
            ['associativity', f => f.conjunction(f.atomic('A'), f.conjunction(f.atomic('B'), f.atomic('C'))), f => f.conjunction(f.atomic('A'), f.atomic('B'), f.atomic('C'))],
            ['redundancy', f => f.conjunction(f.atomic('A'), f.atomic('A')), f => f.conjunction(f.atomic('A'))],
        ])('%s', (_, term1, term2) => {
            expect(term1(tf)).toBe(term2(tf));
        });

        test('equality: sort but NO redundancy removal', () => {
            const [t1, t2] = [tf.equality(tf.atomic('B'), tf.atomic('A')), tf.equality(tf.atomic('A'), tf.atomic('A'))];
            expect(t1.name).toBe('(=, A, B)');
            expect(t2.name).toBe('(=, A, A)');
            expect(t2.components).toHaveLength(2);
        });
    });

    describe('Convenience', () => {
        test('predicate -> ^', () => {
            const [pred, args] = [tf.atomic('pred'), tf.atomic('args')];
            expect(tf.predicate(pred, args)).toMatchObject({operator: '^', components: [pred, args]});
        });

        test('tuple -> ,', () => {
            const [tA, tB] = [tf.atomic('a'), tf.atomic('b')];
            expect(tf.tuple(tA, tB)).toMatchObject({operator: ',', components: [tA, tB]});
        });

        test('atomic', () => {
            expect(tf.atomic('A')).toMatchObject({isAtomic: true, name: 'A'});
        });
    });

    describe('Edge Cases', () => {
        test('should distinguish between (A ==> B) and (B ==> A) inside a commutative operator', () => {
            const A = tf.atomic('A');
            const B = tf.atomic('B');

            const imp1 = tf.implication(A, B); // (==>, A, B)
            const imp2 = tf.implication(B, A); // (==>, B, A)

            const conjunction = tf.conjunction(imp1, imp2);

            expect(conjunction.components.length).toBe(2);
        });
    });
});
