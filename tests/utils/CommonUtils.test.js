import { safeGet, clamp, deepClone, formatNumber, safeAsync, debounce, groupBy, flatten } from '../../src/util/CommonUtils.js';

describe('CommonUtils', () => {
    describe('safeGet', () => {
        test('should return value at path if exists', () => {
            const obj = { a: { b: { c: 42 } } };
            expect(safeGet(obj, 'a.b.c')).toBe(42);
        });

        test('should return default value if path does not exist', () => {
            const obj = { a: { b: { c: 42 } } };
            expect(safeGet(obj, 'a.b.d', 'default')).toBe('default');
        });

        test('should handle null or undefined objects', () => {
            expect(safeGet(null, 'a.b.c', 'default')).toBe('default');
            expect(safeGet(undefined, 'a.b.c', 'default')).toBe('default');
        });
    });

    describe('clamp', () => {
        test('should return value if within range', () => {
            expect(clamp(5, 1, 10)).toBe(5);
        });

        test('should return min if value is less than min', () => {
            expect(clamp(-5, 1, 10)).toBe(1);
        });

        test('should return max if value is greater than max', () => {
            expect(clamp(15, 1, 10)).toBe(10);
        });
    });

    describe('deepClone', () => {
        test('should clone primitive values', () => {
            expect(deepClone(42)).toBe(42);
            expect(deepClone('test')).toBe('test');
            expect(deepClone(true)).toBe(true);
            expect(deepClone(null)).toBe(null);
        });

        test('should clone objects', () => {
            const obj = { a: 1, b: { c: 2 } };
            const cloned = deepClone(obj);
            expect(cloned).toEqual(obj);
            expect(cloned).not.toBe(obj);
            expect(cloned.b).not.toBe(obj.b);
        });

        test('should clone arrays', () => {
            const arr = [1, [2, 3], 4];
            const cloned = deepClone(arr);
            expect(cloned).toEqual(arr);
            expect(cloned).not.toBe(arr);
            expect(cloned[1]).not.toBe(arr[1]);
        });

        test('should clone dates', () => {
            const date = new Date('2023-01-01');
            const cloned = deepClone(date);
            expect(cloned).toEqual(date);
            expect(cloned).not.toBe(date);
        });
    });

    describe('formatNumber', () => {
        test('should format number to 2 decimal places by default', () => {
            expect(formatNumber(3.14159)).toBe('3.14');
        });

        test('should format to specified decimal places', () => {
            expect(formatNumber(3.14159, 3)).toBe('3.142');
        });

        test('should handle non-number input', () => {
            expect(formatNumber('test')).toBe('test');
            expect(formatNumber(null)).toBe('0');
            expect(formatNumber(undefined)).toBe('0');
        });
    });

    describe('safeAsync', () => {
        test('should return result of successful async function', async () => {
            const result = await safeAsync(async () => 42);
            expect(result).toBe(42);
        });

        test('should return default value if async function throws', async () => {
            const result = await safeAsync(async () => { throw new Error('test'); }, 'default');
            expect(result).toBe('default');
        });
    });

    describe('groupBy', () => {
        test('should group array by property name', () => {
            const arr = [
                { category: 'A', value: 1 },
                { category: 'B', value: 2 },
                { category: 'A', value: 3 }
            ];
            const result = groupBy(arr, 'category');
            expect(result.A).toEqual([
                { category: 'A', value: 1 },
                { category: 'A', value: 3 }
            ]);
            expect(result.B).toEqual([
                { category: 'B', value: 2 }
            ]);
        });

        test('should group array by function', () => {
            const arr = [1, 2, 3, 4, 5];
            const result = groupBy(arr, x => x % 2 === 0 ? 'even' : 'odd');
            expect(result.odd).toEqual([1, 3, 5]);
            expect(result.even).toEqual([2, 4]);
        });
    });

    describe('flatten', () => {
        test('should flatten nested arrays', () => {
            const nested = [1, [2, 3], [4, [5, 6]]];
            const result = flatten(nested);
            expect(result).toEqual([1, 2, 3, 4, 5, 6]);
        });

        test('should handle deeply nested arrays', () => {
            const nested = [1, [2, [3, [4, 5]]]];
            const result = flatten(nested);
            expect(result).toEqual([1, 2, 3, 4, 5]);
        });

        test('should handle empty arrays', () => {
            expect(flatten([])).toEqual([]);
            expect(flatten([[], []])).toEqual([]);
        });
    });
});