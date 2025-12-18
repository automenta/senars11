import {beforeEach, describe, expect, test} from '@jest/globals';
import {TermFactory} from '../../../core/src/term/TermFactory.js';

describe('TermFactory', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    test('creates atomic terms', () => {
        const term = termFactory.create('cat');
        expect(term.toString()).toBe('cat');
        expect(term.isAtomic).toBe(true);
    });

    test('caches atomic terms', () => {
        const term1 = termFactory.create('dog');
        const term2 = termFactory.create('dog');
        expect(term1).toBe(term2); // Reference equality
    });

    test('creates compound terms via helper', () => {
        const cat = termFactory.create('cat');
        const animal = termFactory.create('animal');
        const term = termFactory.inheritance(cat, animal);

        expect(term.isCompound).toBe(true);
        expect(term.operator).toBe('-->');
        expect(term.components[0]).toBe(cat);
        expect(term.components[1]).toBe(animal);
        // Canonical string format check
        expect(term.toString()).toBe('(-->, cat, animal)');
    });

    test('creates similarity terms via helper', () => {
        const cat = termFactory.create('cat');
        const dog = termFactory.create('dog');
        const term = termFactory.similarity(cat, dog);

        expect(term.operator).toBe('<->');
        expect(term.toString()).toBe('(<->, cat, dog)');
    });

    test('creates variable terms', () => {
        // TermFactory.variable forces '?' prefix
        const query = termFactory.variable('z');
        expect(query.toString()).toBe('?z');
        expect(query.isVariable).toBe(true);

        // Manual creation
        const independent = termFactory.create('$x');
        expect(independent.toString()).toBe('$x');

        const dependent = termFactory.create('#y');
        expect(dependent.toString()).toBe('#y');
    });

    describe('Logical Operators', () => {
        test('creates implication', () => {
            const a = termFactory.create('a');
            const b = termFactory.create('b');
            const term = termFactory.implication(a, b);

            expect(term.operator).toBe('==>');
            expect(term.toString()).toBe('(==>, a, b)');
        });

        test('creates equivalence', () => {
            const a = termFactory.create('a');
            const b = termFactory.create('b');
            const term = termFactory.equivalence(a, b);

            expect(term.operator).toBe('<=>');
            expect(term.toString()).toBe('(<=>, a, b)');
        });

        test('creates conjunction', () => {
            const a = termFactory.create('a');
            const b = termFactory.create('b');
            const term = termFactory.conjunction([a, b]);
            expect(term.operator).toBe('&');
            expect(term.toString()).toBe('(&, a, b)');
        });

        test('creates disjunction', () => {
            const a = termFactory.create('a');
            const b = termFactory.create('b');
            const term = termFactory.disjunction([a, b]);
            expect(term.operator).toBe('|');
            expect(term.toString()).toBe('(|, a, b)');
        });

        test('creates negation', () => {
            const a = termFactory.create('a');
            const term = termFactory.negation(a);
            expect(term.operator).toBe('--');
            expect(term.toString()).toBe('(--, a)');
        });
    });

    describe('Set Operators', () => {
        test('creates extensional set', () => {
            const a = termFactory.create('a');
            const term = termFactory.setExt(a);
            expect(term.operator).toBe('{}');
            expect(term.toString()).toBe('{a}');
        });

        test('creates intensional set', () => {
            const a = termFactory.create('a');
            const term = termFactory.setInt(a);
            expect(term.operator).toBe('[]');
            expect(term.toString()).toBe('[a]');
        });

        // TermFactory doesn't have an explicit 'intersection' helper.
        // We'll test 'product' instead as it is another common operator.
        test('creates product', () => {
            const a = termFactory.create('a');
            const b = termFactory.create('b');
            const term = termFactory.product(a, b);
            expect(term.operator).toBe('*');
            expect(term.toString()).toBe('(*, a, b)');
        });

        test('creates difference', () => {
            const a = termFactory.create('a');
            const b = termFactory.create('b');
            const term = termFactory.difference(a, b);
            expect(term.operator).toBe('<~>');
            expect(term.toString()).toBe('(<~>, a, b)');
        });
    });

    describe('Error Handling', () => {
        test('throws on empty creation', () => {
            expect(() => termFactory.create('')).toThrow();
            expect(() => termFactory.create(null)).toThrow();
        });
    });

    test('clears cache', () => {
        const term1 = termFactory.create('bird');
        termFactory.clearCache();
        const term2 = termFactory.create('bird');
        expect(term1).not.toBe(term2); // Should be new instance
    });
});
