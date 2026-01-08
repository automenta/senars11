import { TypeChecker, TypeConstructors, freshTypeVar } from '../../../core/src/metta/TypeChecker.js';
import { TypeSystem } from '../../../core/src/metta/TypeSystem.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';

describe('TypeChecker', () => {
    let typeChecker, typeSystem, termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        typeSystem = new TypeSystem({}, null, termFactory);
        typeChecker = new TypeChecker(typeSystem, {}, null, termFactory);
    });

    describe('Type Inference', () => {
        test('infers Number type', () => {
            const term = termFactory.atomic('42');
            const type = typeChecker.infer(term);
            expect(type.kind).toBe('Number');
        });

        test('infers String type', () => {
            const term = termFactory.atomic('"hello"');
            const type = typeChecker.infer(term);
            expect(type.kind).toBe('String');
        });

        test('infers Bool type', () => {
            const term = termFactory.atomic('True');
            const type = typeChecker.infer(term);
            expect(type.kind).toBe('Bool');
        });

        test('infers function application type', () => {
            const context = new Map();
            context.set('add', TypeConstructors.Arrow(
                TypeConstructors.Number,
                TypeConstructors.Arrow(TypeConstructors.Number, TypeConstructors.Number)
            ));

            const addTerm = termFactory.predicate(
                termFactory.atomic('add'),
                termFactory.product(termFactory.atomic('5'))
            );

            const type = typeChecker.infer(addTerm, context);
            expect(type).toBeDefined();
        });
    });

    describe('Type Unification', () => {
        test('unifies identical types', () => {
            const t1 = TypeConstructors.Number;
            const t2 = TypeConstructors.Number;
            const subst = typeChecker.unify(t1, t2);
            expect(subst).toBeTruthy();
        });

        test('unifies type variable with concrete type', () => {
            const tvar = freshTypeVar();
            const concrete = TypeConstructors.Number;
            const subst = typeChecker.unify(tvar, concrete);
            expect(subst.get(tvar.id)).toEqual(concrete);
        });

        test('unifies arrow types', () => {
            const t1 = TypeConstructors.Arrow(TypeConstructors.Number, TypeConstructors.Bool);
            const t2 = TypeConstructors.Arrow(TypeConstructors.Number, TypeConstructors.Bool);
            const subst = typeChecker.unify(t1, t2);
            expect(subst).toBeTruthy();
        });

        test('fails to unify incompatible types', () => {
            const t1 = TypeConstructors.Number;
            const t2 = TypeConstructors.String;
            const subst = typeChecker.unify(t1, t2);
            expect(subst).toBeNull();
        });
    });

    describe('Type Constructors', () => {
        test('creates Arrow type', () => {
            const arrType = TypeConstructors.Arrow(TypeConstructors.Number, TypeConstructors.Bool);
            expect(arrType.kind).toBe('Arrow');
            expect(arrType.from.kind).toBe('Number');
            expect(arrType.to.kind).toBe('Bool');
        });

        test('creates List type', () => {
            const listType = TypeConstructors.List(TypeConstructors.Number);
            expect(listType.kind).toBe('List');
            expect(listType.elemType.kind).toBe('Number');
        });

        test('creates Maybe type', () => {
            const maybeType = TypeConstructors.Maybe(TypeConstructors.String);
            expect(maybeType.kind).toBe('Maybe');
            expect(maybeType.elemType.kind).toBe('String');
        });

        test('creates Vector dependent type', () => {
            const vecType = TypeConstructors.Vector(3);
            expect(vecType.kind).toBe('Vector');
            expect(vecType.length).toBe(3);
        });
    });

    describe('Type String Conversion', () => {
        test('converts Number to string', () => {
            expect(typeChecker.typeToString(TypeConstructors.Number)).toBe('Number');
        });

        test('converts Arrow to string', () => {
            const arrType = TypeConstructors.Arrow(TypeConstructors.Number, TypeConstructors.Bool);
            expect(typeChecker.typeToString(arrType)).toBe('(-> Number Bool)');
        });

        test('converts List to string', () => {
            const listType = TypeConstructors.List(TypeConstructors.Number);
            expect(typeChecker.typeToString(listType)).toBe('(List Number)');
        });

        test('converts Vector to string', () => {
            const vecType = TypeConstructors.Vector(5);
            expect(typeChecker.typeToString(vecType)).toBe('(Vector 5)');
        });
    });

    describe('Type Checking', () => {
        test('checks term against expected type', () => {
            const term = termFactory.atomic('42');
            const result = typeChecker.check(term, TypeConstructors.Number);
            expect(result).toBe(true);
        });

        test('fails check for mismatched type', () => {
            const term = termFactory.atomic('42');
            const result = typeChecker.check(term, TypeConstructors.String);
            expect(result).toBe(false);
        });
    });
});
