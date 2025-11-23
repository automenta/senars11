import {jest} from '@jest/globals';
import {deepClone, formatNumber, safeAsync, safeGet} from '../../../src/util/common.js';

describe('Common Utils', () => {
    describe('safeGet', () => {
        const obj = {
            a: {
                b: {
                    c: 1
                }
            }
        };

        test('gets existing nested value', () => {
            expect(safeGet(obj, 'a.b.c')).toBe(1);
        });

        test('returns default for non-existent path', () => {
            expect(safeGet(obj, 'a.b.d', 'default')).toBe('default');
        });

        test('returns default for null parent', () => {
            expect(safeGet(null, 'a.b', 'default')).toBe('default');
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
});
