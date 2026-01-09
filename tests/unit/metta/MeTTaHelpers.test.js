import { Unification, TermBuilders, TaskBuilders, MeTTaError, TypeMismatchError } from '../../../core/src/metta/helpers/MeTTaHelpers.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';

describe('MeTTaHelpers', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    describe('Unification', () => {
        test('isVar detects variables', () => {
            const varTerm = termFactory.atomic('$x');
            const atomTerm = termFactory.atomic('foo');

            expect(Unification.isVar(varTerm)).toBe(true);
            expect(Unification.isVar(atomTerm)).toBe(false);
        });

        test('unifies variable with term', () => {
            const pattern = termFactory.atomic('$x');
            const term = termFactory.atomic('foo');

            const bindings = Unification.unify(pattern, term);
            expect(bindings).toEqual({ '$x': term });
        });

        test('unifies matching atoms', () => {
            const pattern = termFactory.atomic('foo');
            const term = termFactory.atomic('foo');

            const bindings = Unification.unify(pattern, term);
            expect(bindings).toEqual({});
        });

        test('fails to unify different atoms', () => {
            const pattern = termFactory.atomic('foo');
            const term = termFactory.atomic('bar');

            const bindings = Unification.unify(pattern, term);
            expect(bindings).toBeNull();
        });

        test('unifies compound terms', () => {
            const pattern = termFactory.predicate(
                termFactory.atomic('f'),
                termFactory.product(termFactory.atomic('$x'))
            );
            const term = termFactory.predicate(
                termFactory.atomic('f'),
                termFactory.product(termFactory.atomic('a'))
            );

            const bindings = Unification.unify(pattern, term);
            expect(bindings).toBeTruthy();
            expect(bindings['$x'].name).toBe('a');
        });

        test('substitutes variables', () => {
            const term = termFactory.predicate(
                termFactory.atomic('f'),
                termFactory.product(termFactory.atomic('$x'))
            );
            const bindings = { '$x': termFactory.atomic('42') };

            const result = Unification.subst(term, bindings);
            // After substitution, components[1] should be the atomic term '42'
            expect(result.components[1].name).toBe('42');
        });
    });

    describe('TermBuilders', () => {
        test('functor creates predicate with product', () => {
            const term = TermBuilders.functor(
                termFactory,
                termFactory.atomic('f'),
                termFactory.atomic('x'),
                termFactory.atomic('y')
            );

            expect(term.operator).toBe('^');
            expect(term.components[1].operator).toBe('*');
        });

        test('eq creates equality', () => {
            const term = TermBuilders.eq(
                termFactory,
                termFactory.atomic('a'),
                termFactory.atomic('b')
            );

            expect(term.operator).toBe('=');
        });

        test('typed creates inheritance', () => {
            const term = TermBuilders.typed(
                termFactory,
                termFactory.atomic('x'),
                termFactory.atomic('Type')
            );

            expect(term.operator).toBe('-->');
        });

        test('and creates conjunction', () => {
            const term = TermBuilders.and(
                termFactory,
                termFactory.atomic('a'),
                termFactory.atomic('b')
            );

            expect(term.operator).toBe('&');
        });
    });

    describe('TaskBuilders', () => {
        test('creates SeNARS task', () => {
            const term = termFactory.atomic('foo');
            const task = TaskBuilders.task(term);

            expect(task.term).toBe(term);
            expect(task.punctuation).toBe('.');
            expect(task.truth.frequency).toBe(0.9);
        });

        test('creates task with custom truth', () => {
            const term = termFactory.atomic('foo');
            const truth = { frequency: 0.5, confidence: 0.5 };
            const task = TaskBuilders.task(term, '?', truth);

            expect(task.punctuation).toBe('?');
            expect(task.truth).toBe(truth);
        });
    });

    describe('Error Classes', () => {
        test('MeTTaError includes context', () => {
            const error = new MeTTaError('test error', { foo: 'bar' });
            expect(error.name).toBe('MeTTaError');
            expect(error.context.foo).toBe('bar');
        });

        test('TypeMismatchError stores types', () => {
            const term = termFactory.atomic('x');
            const error = new TypeMismatchError('Number', 'Symbol', term);
            expect(error.expected).toBe('Number');
            expect(error.actual).toBe('Symbol');
        });
    });
});
