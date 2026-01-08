import { NonDeterminism } from '../../../core/src/metta/NonDeterminism.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';

describe('NonDeterminism', () => {
    let nonDet, termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        nonDet = new NonDeterminism({}, null, termFactory);
    });

    describe('Superposition', () => {
        test('creates superposition', () => {
            const s = nonDet.superpose('a', 'b', 'c');
            expect(nonDet.isSuperposition(s)).toBe(true);
            expect(s.values).toEqual(['a', 'b', 'c']);
        });

        test('flattens nested arrays', () => {
            const s = nonDet.superpose(['a', 'b'], 'c');
            expect(s.values).toEqual(['a', 'b', 'c']);
        });
    });

    describe('Collapse', () => {
        test('collapses superposition to single value', () => {
            const s = nonDet.superpose('a', 'b', 'c');
            const result = nonDet.collapse(s);
            expect(['a', 'b', 'c']).toContain(result);
        });

        test('collapse on non-superposition returns value', () => {
            const result = nonDet.collapse('foo');
            expect(result).toBe('foo');
        });

        test('collapseFirst returns first value', () => {
            const s = nonDet.superpose('a', 'b', 'c');
            expect(nonDet.collapseFirst(s)).toBe('a');
        });

        test('collapseAll returns all values', () => {
            const s = nonDet.superpose('a', 'b', 'c');
            expect(nonDet.collapseAll(s)).toEqual(['a', 'b', 'c']);
        });
    });

    describe('Map', () => {
        test('maps function over superposition', () => {
            const s = nonDet.superpose(1, 2, 3);
            const result = nonDet.mapSuperpose(s, x => x * 2);
            expect(result.values).toEqual([2, 4, 6]);
        });

        test('maps function over non-superposition', () => {
            const result = nonDet.mapSuperpose(5, x => x * 2);
            expect(result).toBe(10);
        });

        test('flattens nested superpositions from map', () => {
            const s = nonDet.superpose(1, 2);
            const result = nonDet.mapSuperpose(s, x => nonDet.superpose(x, x * 2));
            expect(result.values).toEqual([1, 2, 2, 4]);
        });
    });

    describe('Filter', () => {
        test('filters superposition values', () => {
            const s = nonDet.superpose(1, 2, 3, 4);
            const result = nonDet.filterSuperpose(s, x => x % 2 === 0);
            expect(result.values).toEqual([2, 4]);
        });

        test('returns null for empty filter', () => {
            const s = nonDet.superpose(1, 3, 5);
            const result = nonDet.filterSuperpose(s, x => x > 10);
            expect(result).toBeNull();
        });

        test('returns single value if only one passes filter', () => {
            const s = nonDet.superpose(1, 2, 3);
            const result = nonDet.filterSuperpose(s, x => x === 2);
            expect(result).toBe(2);
        });
    });

    describe('Bind', () => {
        test('binds function over superposition', () => {
            const s = nonDet.superpose(1, 2);
            const result = nonDet.bind(s, x => x + 10);
            expect(result.values).toEqual([11, 12]);
        });

        test('flattens nested superpositions', () => {
            const s = nonDet.superpose(1, 2);
            const result = nonDet.bind(s, x => nonDet.superpose(x, x * 2));
            expect(result.values).toEqual([1, 2, 2, 4]);
        });
    });

    describe('Combine', () => {
        test('combines two superpositions', () => {
            const s1 = nonDet.superpose(1, 2);
            const s2 = nonDet.superpose(10, 20);
            const result = nonDet.combine(s1, s2, (a, b) => a + b);
            expect(result.values).toEqual([11, 21, 12, 22]);
        });

        test('combines superposition with non-superposition', () => {
            const s = nonDet.superpose(1, 2);
            const result = nonDet.combine(s, 10, (a, b) => a + b);
            expect(result.values).toEqual([11, 12]);
        });
    });
});
