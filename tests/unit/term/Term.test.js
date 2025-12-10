import fc from 'fast-check';
import {TermType} from '../../../core/src/term/Term.js';
import {TermFactory} from '../../../core/src/term/TermFactory.js';

const tf = new TermFactory();

describe('Term', () => {
    const [atomA, atomB, atomC] = ['A', 'B', 'C'].map(c => tf.atomic(c));
    const [inheritanceAB, similarityAB] = [tf.inheritance(atomA, atomB), tf.similarity(atomA, atomB)];

    describe('Core Functionality', () => {
        test.each([
            {
                name: 'atomic term',
                term: atomA,
                expected: {type: TermType.ATOM, name: 'A', components: ['A'], complexity: 1, string: 'A'}
            },
            {
                name: 'compound term',
                term: inheritanceAB,
                expected: {
                    type: TermType.COMPOUND,
                    name: '(-->, A, B)',
                    components: [atomA, atomB],
                    complexity: 3,
                    string: '(-->, A, B)'
                }
            },
            {
                name: 'nested compound term',
                term: tf.similarity(atomC, inheritanceAB),
                expected: {
                    type: TermType.COMPOUND,
                    name: '(<->, (-->, A, B), C)',
                    components: [inheritanceAB, atomC],
                    complexity: 5,
                    string: '(<->, (-->, A, B), C)'
                }
            },
        ])('$name', ({term, expected}) => {
            expect(term).toMatchObject({
                type: expected.type,
                name: expected.name,
                complexity: expected.complexity
            });
            expect(term.components).toEqual(expect.arrayContaining(expected.components));
            expect(term.toString()).toBe(expected.string);
            expect(term.hash).toBeDefined();
        });

        test('immutability', () => {
            expect(() => atomA.name = 'B').toThrow();
            expect(() => inheritanceAB.components.push(atomC)).toThrow();
        });
    });

    describe('Comparison and Hashing', () => {
        test.each([
            ['reflexivity', atomA, atomA, true],
            ['identity', atomA, tf.atomic('A'), true],
            ['different atoms', atomA, atomB, false],
            ['compound identity', inheritanceAB, tf.inheritance(atomA, atomB), true],
            ['different compounds', inheritanceAB, similarityAB, false],
            ['null comparison', atomA, null, false],
            ['different type comparison', atomA, 'A', false],
        ])('%s', (_, t1, t2, expected) => {
            expect(t1.equals(t2)).toBe(expected);
            if (expected) expect(t1.hash).toBe(t2.hash);
        });
    });

    describe('Normalization', () => {
        test('commutative', () => {
            const [t1, t2] = [tf.conjunction(atomA, atomB), tf.conjunction(atomB, atomA)];
            expect(t1.name).toBe('(&, A, B)');
            expect(t1.equals(t2)).toBe(true);
        });

        test('associative', () => {
            expect(tf.conjunction(atomA, tf.conjunction(atomB, atomC)).name).toBe('(&, A, B, C)');
        });

        test('redundancy', () => {
            expect(tf.conjunction(atomA, atomA).name).toBe('(&, A)');
        });
    });

    describe('Traversal', () => {
        test('visitor', () => {
            const [pre, post] = [[], []];
            inheritanceAB.visit(t => pre.push(t.name), 'pre-order');
            expect(pre).toEqual(['(-->, A, B)', 'A', 'B']);

            inheritanceAB.visit(t => post.push(t.name), 'post-order');
            expect(post).toEqual(['A', 'B', '(-->, A, B)']);
        });

        test('reduce', () => {
            expect(inheritanceAB.reduce((sum, t) => sum + t.complexity, 0)).toBe(5);
            expect(inheritanceAB.reduce((names, t) => [...names, t.name], [])).toEqual(['(-->, A, B)', 'A', 'B']);
        });
    });

    describe('Property-Based', () => {
        const createTerm = (name) => tf.atomic(name);
        const createCompoundTerm = (operator, components) => tf.create(operator, components);

        const atomicTermArb = fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd'), {
            minLength: 1,
            maxLength: 1
        }).map(createTerm);

        const compoundTermArb = fc.letrec(tie => ({
            term: fc.oneof(atomicTermArb, tie('compound')),
            compound: fc.record({
                op: fc.constantFrom('-->', '<->', '&', '|'),
                components: fc.array(tie('term'), {minLength: 2, maxLength: 3})
            }).map(({op, components}) => createCompoundTerm(op, components))
        })).term;

        test('normalization idempotent', () => {
            fc.assert(fc.property(compoundTermArb, (term) => {
                if (!term.operator) return;

                const normalized = createCompoundTerm(term.operator, term.components);
                expect(normalized.equals(createCompoundTerm(normalized.operator, normalized.components))).toBe(true);

                if (['&', '|', '<->'].includes(term.operator)) {
                    expect(term.equals(createCompoundTerm(term.operator, [...term.components].reverse()))).toBe(true);
                }
                if (['&', '|'].includes(term.operator)) {
                    expect(new Set(term.components).size).toBe(term.components.length);
                }
            }));
        });

        test('equality equivalence', () => {
            fc.assert(fc.property(compoundTermArb, compoundTermArb, (t1, t2) => {
                expect(t1.equals(t1)).toBe(true);
                expect(t1.equals(t2)).toEqual(t2.equals(t1));
                if (t1.equals(t2)) expect(t1.hash).toBe(t2.hash);
            }));
        });
    });
});
