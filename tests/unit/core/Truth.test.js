import { TRUTH } from '../../../src/config/constants.js';
import { Truth } from '../../../src/Truth.js';

describe('Truth', () => {
    describe('Initialization', () => {
        test('defaults', () => {
            expect(new Truth()).toMatchObject({ frequency: TRUTH.DEFAULT_FREQUENCY, confidence: TRUTH.DEFAULT_CONFIDENCE });
        });

        test('specified values', () => {
            const [f, c] = [0.8, 0.9];
            expect(new Truth(f, c)).toMatchObject({ frequency: f, confidence: c });
        });

        test('clamping', () => {
            expect(new Truth(-0.5, -0.2)).toMatchObject({ frequency: 0, confidence: 0 });
            expect(new Truth(1.5, 1.8)).toMatchObject({ frequency: 1, confidence: 1 });
        });

        test('NaN handling', () => {
            expect(new Truth(NaN, NaN)).toMatchObject({ frequency: TRUTH.DEFAULT_FREQUENCY, confidence: TRUTH.DEFAULT_CONFIDENCE });
        });

        test('immutability', () => {
            const t = new Truth(0.7, 0.8);
            expect(Object.isFrozen(t)).toBe(true);
            expect(() => t.frequency = 0.9).toThrow();
        });
    });

    describe('Operations', () => {
        const [t1, t2] = [new Truth(0.8, 0.9), new Truth(0.7, 0.6)];

        test('deduction', () => {
            expect(Truth.deduction(t1, t2)).toMatchObject({ frequency: 0.8 * 0.7, confidence: 0.9 * 0.6 });
        });

        test('induction', () => {
            expect(Truth.induction(t1, t2)).toMatchObject({ frequency: 0.7, confidence: 0.9 * 0.6 });
        });

        test('null/undefined inputs', () => {
            expect(Truth.deduction(t1, null)).toBeNull();
            expect(Truth.induction(undefined, t1)).toBeNull();
        });

        test('expectation', () => {
            expect(Truth.expectation(new Truth(0.8, 0.7))).toBe(0.8 * 0.7);
        });

        test('isStronger', () => {
            const [weak, strong] = [new Truth(0.8, 0.5), new Truth(0.6, 0.7)];
            expect(Truth.isStronger(strong, weak)).toBe(true);
            expect(Truth.isStronger(weak, strong)).toBe(false);
        });
    });

    describe('Equality', () => {
        test('equals', () => {
            const t1 = new Truth(0.7, 0.8);
            expect(t1.equals(new Truth(0.7, 0.8))).toBe(true);
            expect(t1.equals(new Truth(0.8, 0.8))).toBe(false);
            expect(t1.equals("not a truth object")).toBe(false);
        });
    });

    describe('String Representation', () => {
        test('toString', () => {
            expect(new Truth(0.75, 0.85).toString()).toMatch(/^%[0-9.]+;[0-9.]+%$/);
        });
    });
});
