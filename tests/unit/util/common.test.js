import {jest} from '@jest/globals';
import {deepClone, formatNumber, safeAsync, safeGet} from '../../../src/util/common.js';

describe('Common Utils', () => {
    describe('safeGet', () => {
        const obj = {a: {b: {c: 1}}};

        test('existing nested value', () => {
            expect(safeGet(obj, 'a.b.c')).toBe(1);
        });

        test('non-existent path -> default', () => {
            expect(safeGet(obj, 'a.b.d', 'def')).toBe('def');
        });

        test('null parent -> default', () => {
            expect(safeGet(null, 'a.b', 'def')).toBe('def');
        });
    });

    describe('deepClone', () => {
        test('object', () => {
            const orig = {a: 1, b: {c: 2}, d: [3, 4]};
            const clone = deepClone(orig);

            expect(clone).toEqual(orig);
            expect(clone).not.toBe(orig);
            expect(clone.b).not.toBe(orig.b);
            expect(clone.d).not.toBe(orig.d);
        });

        test('Date', () => {
            const date = new Date('2023-01-01');
            const clone = deepClone(date);
            expect(clone).toEqual(date);
            expect(clone).not.toBe(date);
        });
    });

    describe('formatNumber', () => {
        test('decimals', () => {
            expect(formatNumber(1.2345, 2)).toBe('1.23');
        });

        test('non-numbers', () => {
            expect(formatNumber(null)).toBe('0');
            expect(formatNumber('abc')).toBe('abc');
        });
    });

    describe('safeAsync', () => {
        test('resolves', async () => {
            await expect(safeAsync(async () => 'success')).resolves.toBe('success');
        });

        test('catches error -> default', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const res = await safeAsync(async () => { throw new Error('fail'); }, 'def');
            expect(res).toBe('def');
            spy.mockRestore();
        });
    });
});
