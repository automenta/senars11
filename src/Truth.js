import {TRUTH} from './config/constants.js';
import {clamp} from './util/common.js';

export class Truth {
    constructor(frequency = TRUTH.DEFAULT_FREQUENCY, confidence = TRUTH.DEFAULT_CONFIDENCE) {
        this.frequency = clamp(isNaN(frequency) ? TRUTH.DEFAULT_FREQUENCY : frequency, 0, 1);
        this.confidence = clamp(isNaN(confidence) ? TRUTH.DEFAULT_CONFIDENCE : confidence, 0, 1);
        Object.freeze(this);
    }

    static op = (t1, t2, opFn) => t1 && t2 ? opFn(t1, t2) : null;
    static unaryOp = (truth, opFn) => truth ? opFn(truth) : null;

    static deduction = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(t.frequency * u.frequency, t.confidence * u.confidence));
    static induction = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(u.frequency, Truth.weak(t.confidence * u.confidence) * t.frequency));
    static abduction = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(t.frequency, Truth.weak(t.confidence * u.confidence) * u.frequency));
    static detachment = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(u.frequency, t.frequency * t.confidence * u.confidence));

    static revision = (t1, t2) => {
        if (!t1 || !t2) return t1 || t2;
        const {frequency: f1, confidence: c1} = t1, {frequency: f2, confidence: c2} = t2, cSum = c1 + c2;
        return new Truth(cSum > 0 ? (f1 * c1 + f2 * c2) / cSum : 0, clamp(cSum, 0, 1));
    };

    static negation = t => Truth.unaryOp(t, t => new Truth(1 - t.frequency, t.confidence));
    static conversion = t => Truth.unaryOp(t, t => new Truth(t.frequency, t.frequency * t.confidence));
    static expectation = t => t ? t.frequency * t.confidence : 0;

    static comparison = (t1, t2) => Truth.op(t1, t2, (t, u) => {
        const fProd = t.frequency * u.frequency;
        return new Truth(Truth.safeDiv(fProd, fProd + (1 - t.frequency) * (1 - u.frequency)), t.confidence * u.confidence);
    });

    static analogy = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(t.frequency * u.frequency, t.confidence * u.confidence * u.frequency));
    static resemblance = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth((t.frequency + u.frequency) / 2, t.confidence * u.confidence));

    static contraposition = (t1, t2) => Truth.op(t1, t2, (t, u) => {
        const fContra = u.frequency * (1 - t.frequency);
        return new Truth(Truth.safeDiv(fContra, fContra + (1 - u.frequency) * t.frequency), t.confidence * u.confidence);
    });

    static isStronger = (t1, t2) => Truth.expectation(t1) > Truth.expectation(t2);
    static weak = c => clamp(c / (c + TRUTH.WEAKENING_FACTOR), 0, 1);
    static safeDiv = (num, den) => den === 0 ? 0 : clamp(num / den, 0, 1);

    get f() {
        return this.frequency;
    }

    get c() {
        return this.confidence;
    }

    equals(other) {
        return other instanceof Truth &&
            Math.abs(this.frequency - other.frequency) < TRUTH.EPSILON &&
            Math.abs(this.confidence - other.confidence) < TRUTH.EPSILON;
    }

    toString() {
        return `%${this.frequency.toFixed(TRUTH.PRECISION)};${this.confidence.toFixed(TRUTH.PRECISION)}%`;
    }
}