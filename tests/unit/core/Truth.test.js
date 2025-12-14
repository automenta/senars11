import {TRUTH} from '../../../core/src/config/constants.js';
import {Truth} from '../../../core/src/Truth.js';

describe('Truth', () => {
    test('initialization', () => {
        expect(new Truth()).toMatchObject({frequency: TRUTH.DEFAULT_FREQUENCY, confidence: TRUTH.DEFAULT_CONFIDENCE});
        expect(new Truth(0.8, 0.9)).toMatchObject({frequency: 0.8, confidence: 0.9});
        expect(new Truth(-0.5, 1.5)).toMatchObject({frequency: 0, confidence: 1});
        expect(new Truth(NaN, NaN)).toMatchObject({
            frequency: TRUTH.DEFAULT_FREQUENCY,
            confidence: TRUTH.DEFAULT_CONFIDENCE
        });
    });

    test('immutability', () => {
        const t = new Truth(0.7, 0.8);
        expect(Object.isFrozen(t)).toBe(true);
        expect(() => t.frequency = 0.9).toThrow();
    });

    const [t1, t2] = [new Truth(0.8, 0.9), new Truth(0.7, 0.6)];

    test.each([
        ['deduction', t1, t2, 0.8 * 0.7, 0.9 * 0.6],
        ['induction', t1, t2, 0.7, 0.9 * 0.6],
        ['abduction', t1, t2, 0.8, Math.min(0.9 * 0.6, 0.6)],
        ['detachment', t1, t2, 0.7, 0.8 * 0.9 * 0.6],
        ['analogy', t1, t2, 0.8 * 0.7, 0.9 * 0.6 * 0.7],
        ['resemblance', t1, t2, (0.8 + 0.7) / 2, 0.9 * 0.6]
    ])('operation: %s', (op, a, b, f, c) => {
        expect(Truth[op](a, b)).toMatchObject({frequency: f, confidence: c});
    });

    test('revision', () => {
        const tRev = Truth.revision(t1, t2);
        const confSum = 0.9 + 0.6;
        expect(tRev.frequency).toBeCloseTo((0.8 * 0.9 + 0.7 * 0.6) / confSum);
        expect(tRev.confidence).toBe(Math.min(confSum, 1));
        expect(Truth.revision(t1, t1)).toBe(t1);
        expect(Truth.revision(t1, null)).toBe(t1);
    });

    test('negation', () => {
        expect(Truth.negation(t1)).toMatchObject({frequency: 1 - 0.8, confidence: 0.9});
    });

    test('conversion', () => {
        expect(Truth.conversion(t1)).toMatchObject({frequency: 0.8, confidence: 0.8 * 0.9});
    });

    test('comparison', () => {
        const comp = Truth.comparison(t1, t2);
        const fProd = 0.8 * 0.7;
        const denom = fProd + (1 - 0.8) * (1 - 0.7);
        expect(comp.frequency).toBeCloseTo(fProd / denom);
        expect(comp.confidence).toBe(0.9 * 0.6);
    });

    test('contraposition', () => {
        const contra = Truth.contraposition(t1, t2);
        const n1 = 0.7 * (1 - 0.8);
        const d1 = n1 + (1 - 0.7) * 0.8;
        expect(contra.frequency).toBeCloseTo(n1 / d1);
        expect(contra.confidence).toBe(0.9 * 0.6);
    });

    test('expectation', () => {
        expect(Truth.expectation(t1)).toBe(0.8 * 0.9);
        expect(Truth.expectation(null)).toBe(0);
    });

    test('isStronger', () => {
        expect(Truth.isStronger(t1, t2)).toBe(true);
    });

    test('equality', () => {
        expect(t1.equals(new Truth(0.8, 0.9))).toBe(true);
        expect(t1.equals(t2)).toBe(false);
    });

    test('toString', () => {
        expect(t1.toString()).toMatch(/^%[0-9.]+;[0-9.]+%$/);
    });

    test('new operations', () => {
        // Intersection: f1*f2, c1*c2
        expect(Truth.intersection(t1, t2)).toMatchObject({frequency: 0.8 * 0.7, confidence: 0.9 * 0.6});

        // Union: 1-(1-f1)(1-f2), c1*c2
        const unionF = 1 - (1 - 0.8) * (1 - 0.7);
        expect(Truth.union(t1, t2).frequency).toBeCloseTo(unionF);
        expect(Truth.union(t1, t2).confidence).toBeCloseTo(0.9 * 0.6);

        // Subtract
        expect(Truth.subtract(t1, t2).frequency).toBeCloseTo(Math.max(0, 0.8 - 0.7));

        // Diff
        expect(Truth.diff(t1, t2).frequency).toBeCloseTo(Math.abs(0.8 - 0.7));

        // Exemplification
        const w = 0.9 / (0.9 + 1);
        expect(Truth.exemplification(t1, t2).confidence).toBeCloseTo(w * 0.9 * 0.6 * 0.8 * 0.7);

        // Sameness
        const diff = Math.abs(0.8 - 0.7);
        expect(Truth.sameness(t1, t2).frequency).toBeCloseTo(1 - diff);

        // Structural Deduction
        const c = 0.9 / (0.9 + 1);
        expect(Truth.structuralDeduction(t1).frequency).toBeCloseTo(0.8 * 0.8);
        expect(Truth.structuralDeduction(t1).confidence).toBeCloseTo(c * 0.9);
    });
});
