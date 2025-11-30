import fc from 'fast-check';
import {TermType} from '../../../src/term/Term.js';
import {TermFactory} from '../../../src/term/TermFactory.js';
import {createCompoundTerm, createTerm} from '../../support/factories.js';

const tf = new TermFactory();

describe('Term', () => {
    const [atomA, atomB, atomC] = ['A', 'B', 'C'].map(c => tf.atomic(c));
    const inheritanceAB = tf.inheritance(atomA, atomB);
    const inheritanceAB_clone = tf.inheritance(atomA, atomB);
    const similarityAB = tf.similarity(atomA, atomB);

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
        ])('should create $name with correct properties', ({term, expected}) => {
            expect(term).toMatchObject({
                type: expected.type,
                name: expected.name,
                complexity: expected.complexity
            });
            expect(term.components).toEqual(expect.arrayContaining(expected.components));
            expect(term.toString()).toBe(expected.string);
            expect(term.hash).toBeDefined();
        });

        test('should maintain strict immutability', () => {
            expect(() => atomA.name = 'B').toThrow();
            expect(() => inheritanceAB.components.push(atomC)).toThrow();
        });
    });

    describe('Comparison and Hashing', () => {
        test.each([
            {name: 'reflexivity', t1: atomA, t2: atomA, expected: true},
            {name: 'identity', t1: atomA, t2: tf.atomic('A'), expected: true},
            {name: 'different atoms', t1: atomA, t2: atomB, expected: false},
            {name: 'compound identity', t1: inheritanceAB, t2: inheritanceAB_clone, expected: true},
            {name: 'different compounds', t1: inheritanceAB, t2: similarityAB, expected: false},
            {name: 'null comparison', t1: atomA, t2: null, expected: false},
            {name: 'different type comparison', t1: atomA, t2: 'A', expected: false},
        ])('$name: should correctly compare terms with equals()', ({t1, t2, expected}) => {
            expect(t1.equals(t2)).toBe(expected);
        });

        test('should generate consistent hash codes for equal terms', () => {
            expect(atomA.hash).toBe(tf.atomic('A').hash);
            expect(inheritanceAB.hash).toBe(inheritanceAB_clone.hash);
        });
    });

    describe('Normalization', () => {
        test('should handle commutative operators by canonicalization', () => {
            const term1 = tf.conjunction(atomA, atomB);
            const term2 = tf.conjunction(atomB, atomA);

            expect(term1.name).toBe('(&, A, B)');
            expect(term2.name).toBe('(&, A, B)');
            expect(term1.equals(term2)).toBe(true);
        });

        test('should handle associativity by flattening components', () => {
            const term1 = tf.conjunction(atomA, tf.conjunction(atomB, atomC));
            expect(term1.name).toBe('(&, A, B, C)');
        });

        test('should handle redundancy by removing duplicate components', () => {
            const term = tf.conjunction(atomA, atomA);
            expect(term.name).toBe('(&, A)');
        });
    });

    describe('Traversal', () => {
        test('should implement visitor pattern correctly', () => {
            const visited = [];
            const visitorFn = t => visited.push(t.name);

            inheritanceAB.visit(visitorFn, 'pre-order');
            expect(visited).toEqual(['(-->, A, B)', 'A', 'B']);

            visited.length = 0;
            inheritanceAB.visit(visitorFn, 'post-order');
            expect(visited).toEqual(['A', 'B', '(-->, A, B)']);
        });

        test('should implement reduce pattern correctly', () => {
            expect(inheritanceAB.reduce((sum, t) => sum + t.complexity, 0)).toBe(5);
            expect(inheritanceAB.reduce((names, t) => [...names, t.name], [])).toEqual(['(-->, A, B)', 'A', 'B']);
        });
    });

    describe('Property-Based Tests', () => {
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

        test('normalization should be idempotent and correct', () => {
            fc.assert(fc.property(compoundTermArb, (term) => {
                if (!term.operator) return;

                const normalizedOnce = createCompoundTerm(term.operator, term.components);
                const normalizedTwice = createCompoundTerm(normalizedOnce.operator, normalizedOnce.components);
                expect(normalizedOnce.equals(normalizedTwice)).toBe(true);

                if (['&', '|', '<->'].includes(term.operator)) {
                    const reversedTerm = createCompoundTerm(term.operator, [...term.components].reverse());
                    expect(term.equals(reversedTerm)).toBe(true);
                }
                if (['&', '|'].includes(term.operator)) {
                    expect(!term.components.some(c => c.operator === term.operator)).toBe(true);
                    expect(new Set(term.components).size).toBe(term.components.length);
                }
            }));
        });

        test('equality should follow equivalence relation properties', () => {
            fc.assert(fc.property(compoundTermArb, compoundTermArb, (t1, t2) => {
                expect(t1.equals(t1)).toBe(true);
                expect(t1.equals(t2)).toEqual(t2.equals(t1));
                if (t1.equals(t2) && t2.operator) {
                    const t2_clone = createCompoundTerm(t2.operator, t2.components);
                    expect(t1.equals(t2_clone)).toBe(true);
                }
            }));
        });

        test('equal terms should have consistent hash codes', () => {
            fc.assert(fc.property(compoundTermArb, compoundTermArb, (t1, t2) => {
                if (t1.equals(t2)) expect(t1.hash).toBe(t2.hash);
            }));
        });
    });
});
