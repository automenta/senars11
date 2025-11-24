import {jest} from '@jest/globals';
import {
    deepClone,
    formatNumber,
    safeAsync,
    getNestedProperty,
    sortByProperty,
    mergeConfig
} from '../../../src/util/common.js';

describe('Common Utils', () => {
    describe('getNestedProperty', () => {
        const obj = {
            a: {
                b: {
                    c: 1
                }
            }
        };

        test('gets existing nested value', () => {
            expect(getNestedProperty(obj, 'a.b.c')).toBe(1);
        });

        test('returns default for non-existent path', () => {
            expect(getNestedProperty(obj, 'a.b.d', 'default')).toBe('default');
        });

        test('returns default for null parent', () => {
            expect(getNestedProperty(null, 'a.b', 'default')).toBe('default');
        });
    });

    describe('deepClone', () => {
        test('clones object deeply', () => {
            const original = {
                a: 1,
                b: {
                    c: 2
                },
                d: [3, 4]
            };
            const clone = deepClone(original);

            expect(clone).toEqual(original);
            expect(clone).not.toBe(original);
            expect(clone.b).not.toBe(original.b);
            expect(clone.d).not.toBe(original.d);
        });

        test('clones Date', () => {
            const date = new Date('2023-01-01');
            const clone = deepClone(date);
            expect(clone).toEqual(date);
            expect(clone).not.toBe(date);
        });
    });

    describe('formatNumber', () => {
        test('formats number to decimals', () => {
            expect(formatNumber(1.2345, 2)).toBe('1.23');
        });

        test('handles non-numbers', () => {
            expect(formatNumber(null)).toBe('0');
            expect(formatNumber('abc')).toBe('abc');
        });
    });

    describe('safeAsync', () => {
        test('resolves successful promise', async () => {
            const result = await safeAsync(async () => 'success');
            expect(result).toBe('success');
        });

        test('catches error and returns default', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
            });
            const result = await safeAsync(async () => {
                throw new Error('fail');
            }, 'default');
            expect(result).toBe('default');
            consoleSpy.mockRestore();
        });
    });

    describe('sortByProperty', () => {
        const items = [
            { id: 1, val: 10 },
            { id: 2, val: 5 },
            { id: 3, val: 20 }
        ];

        test('sorts ascending', () => {
            const sorted = sortByProperty(items, 'val');
            expect(sorted[0].id).toBe(2);
            expect(sorted[1].id).toBe(1);
            expect(sorted[2].id).toBe(3);
        });

        test('sorts descending', () => {
            const sorted = sortByProperty(items, 'val', true);
            expect(sorted[0].id).toBe(3);
            expect(sorted[1].id).toBe(1);
            expect(sorted[2].id).toBe(2);
        });

        test('handles empty/null input', () => {
            expect(sortByProperty(null, 'val')).toEqual([]);
            expect(sortByProperty([], 'val')).toEqual([]);
        });
    });

    describe('mergeConfig', () => {
        test('deep merges objects', () => {
            const defaults = { a: 1, b: { c: 2 } };
            const overrides = { b: { d: 3 } };
            const merged = mergeConfig(defaults, overrides);
            expect(merged).toEqual({ a: 1, b: { c: 2, d: 3 } });
        });

        test('does not mutate defaults', () => {
            const defaults = { a: 1, b: { c: 2 } };
            const overrides = { b: { d: 3 } };
            mergeConfig(defaults, overrides);
            expect(defaults).toEqual({ a: 1, b: { c: 2 } });
        });

        test('handles multiple overrides', () => {
            const defaults = { a: 1 };
            const o1 = { b: 2 };
            const o2 = { c: 3 };
            const merged = mergeConfig(defaults, o1, o2);
            expect(merged).toEqual({ a: 1, b: 2, c: 3 });
        });
    });
});
