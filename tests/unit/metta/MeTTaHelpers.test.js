import { MeTTaAST, Unification, TermBuilders, Reduction, MeTTaError, TypeMismatchError } from '../../../core/src/metta/helpers/MeTTaHelpers.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';

describe('MeTTaHelpers', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    describe('MeTTaAST', () => {
        test('creates symbol nodes', () => {
            const node = MeTTaAST.symbol('foo');
            expect(node).toEqual({ type: 'atom', tokenType: 'SYMBOL', value: 'foo' });
        });

        test('creates variable nodes with $ prefix', () => {
            const node = MeTTaAST.variable('x');
            expect(node.value).toBe('$x');
        });

        test('creates number nodes', () => {
            const node = MeTTaAST.number(42);
            expect(node.value).toBe('42');
        });

        test('creates expression nodes', () => {
            const node = MeTTaAST.expr(
                MeTTaAST.symbol('f'),
                MeTTaAST.symbol('a')
            );
            expect(node.type).toBe('list');
            expect(node.elements).toHaveLength(2);
        });

        test('isSymbol predicate', () => {
            expect(MeTTaAST.isSymbol(MeTTaAST.symbol('foo'))).toBe(true);
            expect(MeTTaAST.isSymbol(MeTTaAST.variable('x'))).toBe(false);
        });

        test('map transforms nodes', () => {
            const node = MeTTaAST.symbol('foo');
            const mapped = MeTTaAST.map(node, n => ({ ...n, value: n.value.toUpperCase() }));
            expect(mapped.value).toBe('FOO');
        });
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
            // Check the second component (args) first component
            expect(result.components[1].components[0].name).toBe('42');
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

    describe('Reduction', () => {
        test('isReduced identifies reduced terms', () => {
            const reduced = termFactory.atomic('foo');
            const unreduced = termFactory.predicate(
                termFactory.atomic('f'),
                termFactory.product(termFactory.atomic('x'))
            );

            expect(Reduction.isReduced(reduced)).toBe(true);
            expect(Reduction.isReduced(unreduced)).toBe(false);
        });

        test('reduce applies matching rule', () => {
            const pattern = termFactory.predicate(
                termFactory.atomic('f'),
                termFactory.product(termFactory.atomic('$x'))
            );
            const result = termFactory.atomic('$x');
            const expr = termFactory.predicate(
                termFactory.atomic('f'),
                termFactory.product(termFactory.atomic('a'))
            );

            const { reduced, applied } = Reduction.reduce(expr, pattern, result);
            expect(applied).toBe(true);
            expect(reduced.name).toBe('a');
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
