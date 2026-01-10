import { Space } from '../../../../core/src/metta/kernel/Space.js';
import { Term } from '../../../../core/src/metta/kernel/Term.js';

describe('Kernel Space', () => {
    let space;

    beforeEach(() => {
        space = new Space();
        Term.clearSymbolTable();
    });

    describe('Atom management', () => {
        test('add atoms to space', () => {
            const atom = Term.sym('foo');
            space.add(atom);

            expect(space.has(atom)).toBe(true);
            expect(space.size()).toBe(1);
        });

        test('remove atoms from space', () => {
            const atom = Term.sym('foo');
            space.add(atom);

            const removed = space.remove(atom);
            expect(removed).toBe(true);
            expect(space.has(atom)).toBe(false);
            expect(space.size()).toBe(0);
        });

        test('remove non-existent atom returns false', () => {
            const atom = Term.sym('foo');
            const removed = space.remove(atom);
            expect(removed).toBe(false);
        });

        test('all() returns all atoms', () => {
            const a = Term.sym('a');
            const b = Term.sym('b');
            const c = Term.sym('c');

            space.add(a);
            space.add(b);
            space.add(c);

            const all = space.all();
            expect(all.length).toBe(3);
            expect(all).toContain(a);
            expect(all).toContain(b);
            expect(all).toContain(c);
        });

        test('adding same atom multiple times has no effect', () => {
            const atom = Term.sym('foo');
            space.add(atom);
            space.add(atom);
            space.add(atom);

            expect(space.size()).toBe(1);
        });

        test('throws on adding null', () => {
            expect(() => space.add(null)).toThrow();
        });
    });

    describe('Rule management', () => {
        test('addRule adds rewrite rules', () => {
            const pattern = Term.exp('f', [Term.var('x')]);
            const result = Term.sym('result');

            space.addRule(pattern, result);

            const rules = space.getRules();
            expect(rules.length).toBe(1);
            expect(rules[0].pattern).toBe(pattern);
            expect(rules[0].result).toBe(result);
        });

        test('supports function results', () => {
            const pattern = Term.exp('test', []);
            const resultFn = (bindings) => Term.sym('computed');

            space.addRule(pattern, resultFn);

            const rules = space.getRules();
            expect(rules[0].result).toBe(resultFn);
            expect(typeof rules[0].result).toBe('function');
        });

        test('throws on null pattern', () => {
            expect(() => space.addRule(null, Term.sym('result'))).toThrow();
        });
    });

    describe('Functor indexing', () => {
        test('rulesFor returns rules matching operator', () => {
            const plusPattern = Term.exp('+', [Term.var('x'), Term.var('y')]);
            const minusPattern = Term.exp('-', [Term.var('x'), Term.var('y')]);
            const timesPattern = Term.exp('*', [Term.var('x'), Term.var('y')]);

            space.addRule(plusPattern, Term.sym('add-result'));
            space.addRule(minusPattern, Term.sym('sub-result'));
            space.addRule(timesPattern, Term.sym('mul-result'));
            space.addRule(plusPattern, Term.sym('add-result-2'));

            const plusRules = space.rulesFor('+');
            expect(plusRules.length).toBe(2);
            expect(plusRules[0].pattern.operator).toBe('+');
            expect(plusRules[1].pattern.operator).toBe('+');

            const minusRules = space.rulesFor('-');
            expect(minusRules.length).toBe(1);
            expect(minusRules[0].pattern.operator).toBe('-');
        });

        test('rulesFor returns empty array for unknown operator', () => {
            const rules = space.rulesFor('unknown');
            expect(rules).toEqual([]);
        });

        test('rulesFor with no operator returns all rules', () => {
            const p1 = Term.exp('+', [Term.var('x')]);
            const p2 = Term.exp('-', [Term.var('x')]);

            space.addRule(p1, Term.sym('r1'));
            space.addRule(p2, Term.sym('r2'));

            const allRules = space.rulesFor(null);
            expect(allRules.length).toBe(2);
        });

        test('atomic pattern rules not in functor index', () => {
            const atomPattern = Term.sym('constant');
            space.addRule(atomPattern, Term.sym('result'));

            // Should be in general rules but not in functor index
            expect(space.getRules().length).toBe(1);
            expect(space.rulesFor(null).length).toBe(1);
        });
    });

    describe('Clear and stats', () => {
        test('clear removes all atoms and rules', () => {
            const a = Term.sym('a');
            const pattern = Term.exp('f', [Term.var('x')]);

            space.add(a);
            space.addRule(pattern, Term.sym('result'));

            space.clear();

            expect(space.size()).toBe(0);
            expect(space.getRules().length).toBe(0);
            expect(space.rulesFor('f').length).toBe(0);
        });

        test('stats returns space statistics', () => {
            const a = Term.sym('a');
            const b = Term.sym('b');
            const p1 = Term.exp('+', [Term.var('x')]);
            const p2 = Term.exp('-', [Term.var('x')]);

            space.add(a);
            space.add(b);
            space.addRule(p1, Term.sym('r1'));
            space.addRule(p2, Term.sym('r2'));

            const stats = space.getStats();
            expect(stats.atomCount).toBe(2);
            expect(stats.ruleCount).toBe(2);
            // getStats doesn't return indexedFunctors directly in some versions, but let's check functorCount
            expect(stats.functorCount).toBe(2); // '+' and '-'
        });
    });

    describe('Integration scenarios', () => {
        test('fibonacci rules scenario', () => {
            // Add fibonacci rules
            const fib0 = Term.exp('fib', [Term.sym('0')]);
            const fib1 = Term.exp('fib', [Term.sym('1')]);
            const fibN = Term.exp('fib', [Term.var('$n')]);

            space.addRule(fib0, Term.sym('0'));
            space.addRule(fib1, Term.sym('1'));
            space.addRule(fibN, Term.sym('recursive'));

            const fibRules = space.rulesFor('fib');
            expect(fibRules.length).toBe(3);
            expect(fibRules.every(r => r.pattern.operator === 'fib')).toBe(true);
        });

        test('mixed atoms and rules', () => {
            // Add some facts as atoms
            space.add(Term.exp('Inh', [Term.sym('Socrates'), Term.sym('Human')]));
            space.add(Term.exp('Inh', [Term.sym('Human'), Term.sym('Mortal')]));

            // Add inference rules
            const dedPattern = Term.exp('ded', [
                Term.exp('Inh', [Term.var('$s'), Term.var('$m')]),
                Term.exp('Inh', [Term.var('$m'), Term.var('$p')])
            ]);
            space.addRule(dedPattern, Term.sym('deduced'));

            expect(space.size()).toBe(2); // Two atoms
            expect(space.getRules().length).toBe(1); // One rule
            expect(space.rulesFor('ded').length).toBe(1);
        });
    });
});
