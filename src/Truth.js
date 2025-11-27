import {TRUTH} from './config/constants.js';
import {clamp} from './util/common.js';

export class Truth {
    constructor(frequency = TRUTH.DEFAULT_FREQUENCY, confidence = TRUTH.DEFAULT_CONFIDENCE) {
        this.frequency = clamp(isNaN(frequency) ? TRUTH.DEFAULT_FREQUENCY : frequency, 0, 1);
        this.confidence = clamp(isNaN(confidence) ? TRUTH.DEFAULT_CONFIDENCE : confidence, 0, 1);
        Object.freeze(this);
    }

    get f() {
        return this.frequency;
    }

    get c() {
        return this.confidence;
    }

    static binaryOperation = (truth1, truth2, operation) =>
        truth1 && truth2 ? operation(truth1, truth2) : null;

    static unaryOperation = (truth, operation) =>
        truth ? operation(truth) : null;

    static deduction = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) =>
            new Truth(t.frequency * u.frequency, t.confidence * u.confidence));

    static induction = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) =>
            new Truth(u.frequency, t.confidence * u.confidence));

    static abduction = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) =>
            new Truth(t.frequency, Math.min(t.confidence * u.confidence, u.confidence)));

    static detachment = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) =>
            new Truth(u.frequency, t.frequency * t.confidence * u.confidence));

    static revision = (truth1, truth2) => {
        if (!truth1 || !truth2) return truth1 || truth2;
        if (truth1.equals(truth2)) return truth1;

        const {frequency: f1, confidence: c1} = truth1;
        const {frequency: f2, confidence: c2} = truth2;
        const confidenceSum = c1 + c2;

        return new Truth(
            confidenceSum > 0 ? (f1 * c1 + f2 * c2) / confidenceSum : (f1 + f2) / 2,
            clamp(confidenceSum, 0, 1)
        );
    };

    static negation = truth =>
        Truth.unaryOperation(truth, t => new Truth(1 - t.frequency, t.confidence));

    static conversion = truth =>
        Truth.unaryOperation(truth, t => new Truth(t.frequency, t.frequency * t.confidence));

    static expectation = truth => truth?.frequency * truth?.confidence ?? 0;

    static comparison = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) => {
            const frequencyProduct = t.frequency * u.frequency;
            const denominator = frequencyProduct + (1 - t.frequency) * (1 - u.frequency);
            return new Truth(Truth.safeDiv(frequencyProduct, denominator), t.confidence * u.confidence);
        });

    static analogy = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) =>
            new Truth(t.frequency * u.frequency, t.confidence * u.confidence * u.frequency));

    static resemblance = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) =>
            new Truth((t.frequency + u.frequency) / 2, t.confidence * u.confidence));

    static contraposition = (t1, t2) =>
        Truth.binaryOperation(t1, t2, (t, u) => {
            const contraFreq = u.frequency * (1 - t.frequency);
            const denom = contraFreq + (1 - u.frequency) * t.frequency;
            return new Truth(Truth.safeDiv(contraFreq, denom), t.confidence * u.confidence);
        });

    static isStronger = (t1, t2) => Truth.expectation(t1) > Truth.expectation(t2);

    static weak = confidence => clamp(confidence / (confidence + TRUTH.WEAKENING_FACTOR), 0, 1);

    static safeDiv = (numerator, denominator) =>
        denominator === 0 ? 0 : clamp(numerator / denominator, 0, 1);

    equals(other) {
        return other instanceof Truth &&
            Math.abs(this.frequency - other.frequency) < TRUTH.EPSILON &&
            Math.abs(this.confidence - other.confidence) < TRUTH.EPSILON;
    }

    toString() {
        return `%${this.frequency.toFixed(TRUTH.PRECISION)};${this.confidence.toFixed(TRUTH.PRECISION)}%`;
    }
}