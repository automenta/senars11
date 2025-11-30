import {ImplicationSyllogisticRule as SyllogisticRule} from '../../../src/reason/rules/nal/SyllogisticRule.js';
import {ModusPonensRule} from '../../../src/reason/rules/nal/ModusPonensRule.js';
import {Task} from '../../../src/task/Task.js';
import {Truth} from '../../../src/Truth.js';
import {ArrayStamp} from '../../../src/Stamp.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Rule Application Tests', () => {
    let termFactory, termA, termB, termC;
    const createTestTask = (term, truthValues = [0.9, 0.9]) => new Task({
        term,
        punctuation: '.',
        truth: new Truth(...truthValues),
        stamp: new ArrayStamp(),
        budget: {priority: 0.9, durability: 0.9, quality: 0.9}
    });

    beforeEach(() => {
        termFactory = new TermFactory();
        [termA, termB, termC] = ['a', 'b', 'c'].map(n => termFactory.atomic(n));
    });

    describe('SyllogisticRule', () => {
        let syllogisticRule;
        beforeEach(() => syllogisticRule = new SyllogisticRule());

        test('should apply correctly to syllogistic pattern (a==>b) and (b==>c)', () => {
            const [taskAB, taskBC] = [
                createTestTask(termFactory.implication(termA, termB), [0.9, 0.9]),
                createTestTask(termFactory.implication(termB, termC), [0.8, 0.8])
            ];

            expect(syllogisticRule.canApply(taskAB, taskBC)).toBe(true);
            expect(syllogisticRule.canApply(taskBC, taskAB)).toBe(true);

            const results = syllogisticRule.apply(taskAB, taskBC);
            expect(results).toHaveLength(1);
            expect(results[0].term).toMatchObject({
                operator: '==>',
                components: [expect.objectContaining({name: 'a'}), expect.objectContaining({name: 'c'})]
            });
        });

        test('should not apply to non-syllogistic patterns', () => {
            const [task1, task2] = [createTestTask(termA), createTestTask(termB)];
            expect(syllogisticRule.canApply(task1, task2)).toBe(false);
            expect(syllogisticRule.canApply(task2, task1)).toBe(false);
        });

        test('should handle term comparison correctly', () => {
            const [taskAB, taskBA] = [
                createTestTask(termFactory.implication(termA, termB)),
                createTestTask(termFactory.implication(termB, termA))
            ];
            expect(syllogisticRule.canApply(taskAB, taskBA)).toBe(true);
        });
    });

    describe('ModusPonensRule', () => {
        let modusPonensRule;
        beforeEach(() => modusPonensRule = new ModusPonensRule());

        test('should apply correctly to modus ponens pattern (a==>c) and a', () => {
            const [taskAC, taskA] = [
                createTestTask(termFactory.implication(termA, termC)),
                createTestTask(termA, [0.8, 0.8])
            ];

            expect(modusPonensRule.canApply(taskAC, taskA)).toBe(true);
            expect(modusPonensRule.canApply(taskA, taskAC)).toBe(true);

            const results = modusPonensRule.apply(taskAC, taskA);
            expect(results).toHaveLength(1);
            expect(results[0].term.name).toBe('c');
        });

        test('should not apply when terms do not support it', () => {
            const [task1, task2] = [createTestTask(termA), createTestTask(termB)];
            expect(modusPonensRule.canApply(task1, task2)).toBe(false);
            expect(modusPonensRule.canApply(task2, task1)).toBe(false);
        });
    });

    describe('Term Comparison Logic', () => {
        test('should correctly compare terms using equals method', () => {
            const [term1, term2] = [termFactory.atomic('a'), termFactory.atomic('a')];
            expect(term1.equals(term2)).toBe(true);
            expect(term2.equals(term1)).toBe(true);
        });

        test('should correctly compare compound terms', () => {
            const termAB1 = termFactory.implication(termA, termB);
            const termAB2 = termFactory.implication(termA, termB);
            const termAC = termFactory.implication(termA, termC);

            expect(termAB1.equals(termAB2)).toBe(true);
            expect(termAB2.equals(termAB1)).toBe(true);
            expect(termAB1.equals(termAC)).toBe(false);
            expect(termAC.equals(termAB1)).toBe(false);
        });

        test('should handle different term structures correctly', () => {
            const compoundTerm = termFactory.implication(termA, termB);
            expect(termA.equals(compoundTerm)).toBe(false);
            expect(compoundTerm.equals(termA)).toBe(false);
        });
    });
});
