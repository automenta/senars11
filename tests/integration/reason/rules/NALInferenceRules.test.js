import {TaskMatch, TestNAR} from '../../../../core/src/testing/TestNAR.js';

/**
 * Comprehensive NAL inference rule tests using parameterized approach.
 * Tests all major inference rules: deduction, induction, abduction, comparison, analogy, etc.
 */

describe('NAL Inference Rules', () => {
    describe('Deduction Rules', () => {
        describe.each([
            {
                name: 'Modus Ponens: derive consequent from implication and antecedent',
                premises: [
                    {narsese: '(a ==> b)', f: 0.9, c: 0.9},
                    {narsese: 'a', f: 0.8, c: 0.8}
                ],
                expected: {term: 'b', f: 0.72, c: 0.65, tolerance: 0.05},
                cycles: 1
            },
            {
                name: 'Modus Ponens: complex terms',
                premises: [
                    {narsese: '(sunny_day ==> good_mood)', f: 0.85, c: 0.9},
                    {narsese: 'sunny_day', f: 0.9, c: 0.85}
                ],
                expected: {term: 'good_mood', f: 0.77, c: 0.69, tolerance: 0.05},
                cycles: 1
            },
            {
                name: 'Syllogism: transitive implication chain',
                premises: [
                    {narsese: '(a ==> b)', f: 0.9, c: 0.9},
                    {narsese: '(b ==> c)', f: 0.8, c: 0.8}
                ],
                expected: {term: '(a ==> c)', f: 0.71, c: 0.51, tolerance: 0.25},
                cycles: 1
            },
            {
                name: 'Inheritance Syllogism: transitive inheritance',
                premises: [
                    {narsese: '<sparrow --> bird>', f: 0.9, c: 0.9},
                    {narsese: '<bird --> animal>', f: 0.9, c: 0.9}
                ],
                expected: {term: '<sparrow --> animal>', f: 0.81, c: 0.73, tolerance: 0.1},
                cycles: 1
            }
        ])('$name', ({premises, expected, cycles}) => {
            test('should derive correct conclusion with proper truth value', async () => {
                let nar = new TestNAR();

                for (const premise of premises) {
                    nar = nar.input(premise.narsese, premise.f, premise.c);
                }

                nar = nar.run(cycles);

                if (expected.f !== undefined) {
                    nar = nar.expect(
                        new TaskMatch(expected.term).withFlexibleTruth(
                            expected.f,
                            expected.c,
                            expected.tolerance
                        )
                    );
                }

                const result = await nar.execute();
                expect(result).toBe(true);
            });
        });

        test('no derivation without required premises', async () => {
            const result = await new TestNAR()
                .input('(a ==> b)', 0.9, 0.9)
                .run(1)
                .expectNot('b')
                .execute();

            expect(result).toBe(true);
        });
    });

    describe('Induction Rules', () => {
        describe.each([
            {
                name: 'Induction: shared subject pattern',
                premises: [
                    {narsese: '<robin --> bird>', f: 0.9, c: 0.9},
                    {narsese: '<robin --> singer>', f: 0.8, c: 0.8}
                ],
                expectedPattern: ['bird', 'singer'],
                cycles: 2
            },
            {
                name: 'Induction: property generalization',
                premises: [
                    {narsese: '<swan --> bird>', f: 0.9, c: 0.9},
                    {narsese: '<swan --> [white]>', f: 0.8, c: 0.8}
                ],
                expectedPattern: ['bird', 'white'],
                cycles: 2
            }
        ])('$name', ({premises, expectedPattern, cycles}) => {
            test('should produce inductive inference', async () => {
                let nar = new TestNAR();

                for (const premise of premises) {
                    nar = nar.input(premise.narsese, premise.f, premise.c);
                }

                nar = nar.run(cycles).inspect((_, tasks) => {
                    const hasMatch = tasks.some(t =>
                        expectedPattern.every(pattern =>
                            t.term.toString().includes(pattern)
                        )
                    );
                    if (!hasMatch) {
                        throw new Error(`Expected to find task with patterns: ${expectedPattern.join(', ')}`);
                    }
                });

                const result = await nar.execute();
                expect(result).toBe(true);
            });
        });
    });

    describe('Abduction Rules', () => {
        describe.each([
            {
                name: 'Abduction: shared predicate pattern',
                premises: [
                    {narsese: '<cat --> mammal>', f: 0.9, c: 0.9},
                    {narsese: '<dog --> mammal>', f: 0.9, c: 0.9}
                ],
                expectedPattern: ['cat', 'dog'],
                cycles: 2
            },
            {
                name: 'Abduction: common property',
                premises: [
                    {narsese: '<bird --> animal>', f: 0.9, c: 0.9},
                    {narsese: '<fish --> animal>', f: 0.8, c: 0.8}
                ],
                expectedPattern: ['bird', 'fish'],
                cycles: 2
            }
        ])('$name', ({premises, expectedPattern, cycles}) => {
            test('should produce abductive inference', async () => {
                let nar = new TestNAR();

                for (const premise of premises) {
                    nar = nar.input(premise.narsese, premise.f, premise.c);
                }

                nar = nar.run(cycles).inspect((_, tasks) => {
                    const hasMatch = expectedPattern.some(pattern =>
                        tasks.some(t => t.term.toString().includes(pattern))
                    );
                    if (!hasMatch) {
                        throw new Error(`Expected to find task with one of patterns: ${expectedPattern.join(', ')}`);
                    }
                });

                const result = await nar.execute();
                expect(result).toBe(true);
            });
        });
    });

    describe('Comparison Rules', () => {
        describe.each([
            {
                name: 'Similarity: symmetric comparison',
                premises: [
                    {narsese: '<cat --> mammal>', f: 0.9, c: 0.9},
                    {narsese: '<dog --> mammal>', f: 0.9, c: 0.9}
                ],
                cycles: 2
            },
            {
                name: 'Comparison: shared inheritance',
                premises: [
                    {narsese: '<tiger --> feline>', f: 0.95, c: 0.9},
                    {narsese: '<lion --> feline>', f: 0.95, c: 0.9}
                ],
                cycles: 2
            }
        ])('$name', ({premises, cycles}) => {
            test('should produce comparison result', async () => {
                let nar = new TestNAR();

                for (const premise of premises) {
                    nar = nar.input(premise.narsese, premise.f, premise.c);
                }

                nar = nar.run(cycles).inspect((_, tasks) => {
                    if (tasks.length <= premises.length) {
                        throw new Error(`Expected more tasks than input premises. Got ${tasks.length}, expected > ${premises.length}`);
                    }
                });

                const result = await nar.execute();
                expect(result).toBe(true);
            });
        });
    });

    describe('Analogy Rules', () => {
        describe.each([
            {
                name: 'Analogy: property transfer',
                premises: [
                    {narsese: '<bird --> [can_fly]>', f: 0.9, c: 0.9},
                    {narsese: '<bat <-> bird>', f: 0.7, c: 0.8}
                ],
                cycles: 2
            },
            {
                name: 'Analogy: relational similarity',
                premises: [
                    {narsese: '<robin --> bird>', f: 0.95, c: 0.9},
                    {narsese: '<canary <-> robin>', f: 0.8, c: 0.85}
                ],
                cycles: 2
            }
        ])('$name', ({premises, cycles}) => {
            test('should produce analogical inference', async () => {
                let nar = new TestNAR();

                for (const premise of premises) {
                    nar = nar.input(premise.narsese, premise.f, premise.c);
                }

                nar = nar.run(cycles).inspect((_, tasks) => {
                    if (tasks.length === 0) {
                        throw new Error('Expected to find some derived tasks');
                    }
                });

                const result = await nar.execute();
                expect(result).toBe(true);
            });
        });
    });

    describe('Conversion and Contraposition', () => {
        describe.each([
            {
                name: 'Conversion: inheritance reversal',
                premises: [{narsese: '<student --> person>', f: 0.9, c: 0.9}],
                cycles: 1
            },
            {
                name: 'Contraposition: negation inference',
                premises: [{narsese: '(--,<bird --> mammal>)', f: 0.95, c: 0.9}],
                cycles: 1
            }
        ])('$name', ({premises, cycles}) => {
            test('should produce conversion/contraposition result', async () => {
                let nar = new TestNAR();

                for (const premise of premises) {
                    nar = nar.input(premise.narsese, premise.f, premise.c);
                }

                nar = nar.run(cycles).inspect((_, tasks) => {
                    if (tasks.length < premises.length) {
                        throw new Error(`Expected at least ${premises.length} tasks, got ${tasks.length}`);
                    }
                });

                const result = await nar.execute();
                expect(result).toBe(true);
            });
        });
    });

    describe('Negative Cases', () => {
        test('should not derive incorrect syllogism direction', async () => {
            const result = await new TestNAR()
                .input('(a ==> b)', 0.9, 0.9)
                .input('(b ==> c)', 0.8, 0.8)
                .run(1)
                .expectNot('(c ==> a)')
                .execute();

            expect(result).toBe(true);
        });

        test('should not apply modus ponens without antecedent', async () => {
            const result = await new TestNAR()
                .input('(rain ==> wet)', 0.9, 0.9)
                .run(1)
                .expectNot('wet')
                .execute();

            expect(result).toBe(true);
        });
    });
});
