import { Statistics } from '../../../src/util/Statistics.js';

describe('Statistics Utils', () => {
    test('mean', () => {
        expect(Statistics.mean([1, 2, 3])).toBe(2);
        expect(Statistics.mean([])).toBe(0);
    });

    test('stdDev', () => {
        const values = [2, 4, 4, 4, 5, 5, 7, 9];
        // Mean = 5
        // Variance = ((4+4+4+4+5+5+7+9)/8 - 5)^2 ... wait.
        // (9+1+1+1+0+0+4+16)/8 = 32/8 = 4. Sqrt(4) = 2.
        // (2-5)^2 = 9
        // (4-5)^2 = 1
        // ...
        // Sum sq diff: 9 + 1 + 1 + 1 + 0 + 0 + 4 + 16 = 32.
        // Variance = 32 / 8 = 4.
        // StdDev = 2.
        expect(Statistics.stdDev(values)).toBe(2);
        expect(Statistics.stdDev([])).toBe(0);
    });

    test('median', () => {
        expect(Statistics.median([1, 3, 2])).toBe(2);
        expect(Statistics.median([1, 2, 3, 4])).toBe(2.5);
        expect(Statistics.median([])).toBe(0);
    });

    test('quantile', () => {
        const values = [1, 2, 3, 4, 5];
        expect(Statistics.quantile(values, 0.5)).toBe(3);
        expect(Statistics.quantile(values, 0)).toBe(1);
        expect(Statistics.quantile(values, 1)).toBe(5);
    });

    test('quantiles', () => {
         const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
         // 0.5 is median -> 6
         const result = Statistics.quantiles(values, [0.5]);
         expect(result.p50).toBe(6);
    });
});
