import { TypeSystem } from '../../../core/src/metta/TypeSystem.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';
import { TypeMismatchError } from '../../../core/src/metta/helpers/MeTTaHelpers.js';

describe('TypeSystem', () => {
    let typeSystem, termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        typeSystem = new TypeSystem({}, null, termFactory);
    });

    describe('Type Inference', () => {
        test('infers Symbol type', () => {
            const term = termFactory.atomic('foo');
            expect(typeSystem.inferType(term)).toBe('Symbol');
        });

        test('infers Variable type', () => {
            const term = termFactory.atomic('$x');
            expect(typeSystem.inferType(term)).toBe('Variable');
        });

        test('infers Number type', () => {
            const term = termFactory.atomic('42');
            expect(typeSystem.inferType(term)).toBe('Number');
        });

        test('infers Expression type', () => {
            const term = termFactory.conjunction(
                termFactory.atomic('a'),
                termFactory.atomic('b')
            );
            expect(typeSystem.inferType(term)).toBe('Expression');
        });
    });

    describe('Type Checking', () => {
        test('hasType checks type correctly', () => {
            const numTerm = termFactory.atomic('42');
            expect(typeSystem.hasType(numTerm, 'Number')).toBe(true);
            expect(typeSystem.hasType(numTerm, 'Variable')).toBe(false); // Number is not a Variable
        });

        test('checkTypeAnnotation passes for matching types', () => {
            const numTerm = termFactory.atomic('42');
            expect(() => typeSystem.checkTypeAnnotation(numTerm, 'Number')).not.toThrow();
        });

        test('checkTypeAnnotation throws for mismatched types', () => {
            const symbolTerm = termFactory.atomic('foo');
            expect(() => typeSystem.checkTypeAnnotation(symbolTerm, 'Number'))
                .toThrow(TypeMismatchError);
        });

        test('checkTypeAnnotation allows subtypes', () => {
            const numTerm = termFactory.atomic('42');
            // Number is subtype of Symbol
            expect(() => typeSystem.checkTypeAnnotation(numTerm, 'Symbol')).not.toThrow();
        });
    });

    describe('Custom Types', () => {
        test('defineType allows custom types', () => {
            typeSystem.defineType('Even', (t) => {
                const num = Number(t.name);
                return !isNaN(num) && num % 2 === 0;
            });

            const evenTerm = termFactory.atomic('42');
            const oddTerm = termFactory.atomic('43');

            expect(typeSystem.hasType(evenTerm, 'Even')).toBe(true);
            expect(typeSystem.hasType(oddTerm, 'Even')).toBe(false);
        });
    });

    describe('Cache', () => {
        test('caches type checks', () => {
            const term = termFactory.atomic('42');

            typeSystem.inferType(term);
            const cachedResult = typeSystem.inferType(term);

            expect(cachedResult).toBe('Number');
        });

        test('clearCache empties cache', () => {
            const term = termFactory.atomic('42');
            typeSystem.inferType(term);

            typeSystem.clearCache();
            expect(typeSystem.getStats().cacheSize).toBe(0);
        });
    });
});
