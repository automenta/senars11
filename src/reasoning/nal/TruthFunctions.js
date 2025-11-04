import {TRUTH} from '../../config/constants.js';
import {Truth} from '../../Truth.js';
import {clamp} from '../../util/common.js';

export class TruthFunctions {
    static toTruth(v) {
        return v instanceof Truth ? v : new Truth(v?.frequency ?? 0.5, v?.confidence ?? 0.9);
    }

    static processDual(fn, v1, v2) {
        if (!v1 || !v2) return null;
        const result = fn(this.toTruth(v1), this.toTruth(v2));
        return result ? { frequency: result.frequency, confidence: result.confidence } : null;
    }

    static processSingle(fn, v) {
        if (!v) return null;
        const result = fn(this.toTruth(v));
        return result ? { frequency: result.frequency, confidence: result.confidence } : null;
    }

    static revision(v1, v2) {
        if (!v1 || !v2) return v1 || v2;
        const result = Truth.revision(this.toTruth(v1), this.toTruth(v2));
        return { frequency: result.frequency, confidence: result.confidence };
    }

    static deduction = (v1, v2) => this.processDual((t1, t2) => Truth.deduction(t1, t2), v1, v2);
    static induction = (v1, v2) => this.processDual((t1, t2) => Truth.induction(t1, t2), v1, v2);
    static abduction = (v1, v2) => this.processDual((t1, t2) => Truth.abduction(t1, t2), v1, v2);
    static comparison = (v1, v2) => this.processDual((t1, t2) => Truth.comparison(t1, t2), v1, v2);

    static exemplification(v1, v2) {
        if (!v1 || !v2) return null;
        const t1 = this.toTruth(v1);
        const t2 = this.toTruth(v2);
        const result = Truth.op(t1, t2, (t, u) => 
            new Truth(t.frequency, t.confidence * u.confidence * (TRUTH.EXEMPLIFICATION_CONFIDENCE_FACTOR || 0.1))
        );
        return result ? { frequency: result.frequency, confidence: result.confidence } : null;
    }

    static conversion = (v) => this.processSingle(t => Truth.conversion(t), v);
    static negation = (v) => this.processSingle(t => Truth.negation(t), v);

    static expectation(v) {
        return v ? Truth.expectation(this.toTruth(v)) : 0.5;
    }

    static normalize(v) {
        if (!v) return { frequency: 0.5, confidence: 0.9 };
        const truth = this.toTruth(v);
        return { 
            frequency: clamp(truth.frequency, 0, 1), 
            confidence: clamp(truth.confidence, 0, 1) 
        };
    }
}