import {TRUTH} from '../../config/constants.js';
import {Truth} from '../../Truth.js';
import {clamp} from '../../util/common.js';

export class TruthFunctions {
    static toTruth(v) {
        return v instanceof Truth ? v : new Truth(v?.frequency ?? 0.5, v?.confidence ?? 0.9);
    }

    static processDual(fn, v1, v2) {
        return v1 && v2 ? 
            ((result) => result ? {frequency: result.frequency, confidence: result.confidence} : null)(fn(this.toTruth(v1), this.toTruth(v2))) : 
            null;
    }

    static processSingle(fn, v) {
        return v ? 
            ((result) => result ? {frequency: result.frequency, confidence: result.confidence} : null)(fn(this.toTruth(v))) : 
            null;
    }

    static revision(v1, v2) {
        return v1 && v2 ? 
            {frequency: (Truth.revision(this.toTruth(v1), this.toTruth(v2))).frequency, confidence: (Truth.revision(this.toTruth(v1), this.toTruth(v2))).confidence} : 
            v1 || v2;
    }

    static deduction = (v1, v2) => this.processDual((t1, t2) => Truth.deduction(t1, t2), v1, v2);
    static induction = (v1, v2) => this.processDual((t1, t2) => Truth.induction(t1, t2), v1, v2);
    static abduction = (v1, v2) => this.processDual((t1, t2) => Truth.abduction(t1, t2), v1, v2);
    static comparison = (v1, v2) => this.processDual((t1, t2) => Truth.comparison(t1, t2), v1, v2);

    static exemplification(v1, v2) {
        return v1 && v2 ? 
            ((t1, t2) => ((result) => result ? {frequency: result.frequency, confidence: result.confidence} : null)(Truth.op(t1, t2, (t, u) => 
                new Truth(t.frequency, t.confidence * u.confidence * (TRUTH.EXEMPLIFICATION_CONFIDENCE_FACTOR || 0.1))
            )))(this.toTruth(v1), this.toTruth(v2)) : 
            null;
    }

    static conversion = (v) => this.processSingle(t => Truth.conversion(t), v);
    static negation = (v) => this.processSingle(t => Truth.negation(t), v);

    static expectation(v) {
        return v ? Truth.expectation(this.toTruth(v)) : 0.5;
    }

    static normalize(v) {
        return v ? 
            {frequency: clamp((this.toTruth(v)).frequency, 0, 1), confidence: clamp((this.toTruth(v)).confidence, 0, 1)} : 
            {frequency: 0.5, confidence: 0.9};
    }
}