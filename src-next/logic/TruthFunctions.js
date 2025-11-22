import {Truth} from '../core/Truth.js';

/* NAL Truth Functions */

const or = (...args) => 1 - args.reduce((acc, val) => acc * (1 - val), 1);
const and = (...args) => args.reduce((acc, val) => acc * val, 1);
const not = (a) => 1 - a;

export const TruthFunctions = {
    // Revision: Aggregating evidence from same source? No, distinct sources.
    // F_rev = (f1*c1*(1-c2) + f2*c2*(1-c1)) / (c1*(1-c2) + c2*(1-c1))
    // C_rev = ...
    // Simplified (OpenNARS style):
    revision: (t1, t2) => {
        const f1 = t1.frequency, c1 = t1.confidence;
        const f2 = t2.frequency, c2 = t2.confidence;

        const w1 = c1 / (1 - c1);
        const w2 = c2 / (1 - c2);
        const w = w1 + w2;

        const f = (w1 * f1 + w2 * f2) / w;
        const c = w / (w + 1);

        return new Truth(f, Math.min(0.99, Math.max(0.01, c))); // Clamp confidence slightly
    },

    // Deduction: (A->B), (B->C) |- (A->C)
    deduction: (t1, t2) => {
        const f1 = t1.frequency, c1 = t1.confidence;
        const f2 = t2.frequency, c2 = t2.confidence;

        const f = and(f1, f2);
        const c = and(c1, c2) * f;

        return new Truth(f, c);
    },

    // Induction: (A->B), (A->C) |- (B->C)
    induction: (t1, t2) => {
        const f1 = t1.frequency, c1 = t1.confidence;
        const f2 = t2.frequency, c2 = t2.confidence;

        const w = and(f2, c1, c2);
        const c = w / (w + 1);
        const f = f1;

        return new Truth(f, c);
    },

    // Abduction: (A->C), (B->C) |- (A->B)
    abduction: (t1, t2) => {
        const f1 = t1.frequency, c1 = t1.confidence;
        const f2 = t2.frequency, c2 = t2.confidence;

        const w = and(f2, c1, c2);
        const c = w / (w + 1);
        const f = f1;

        return new Truth(f, c);
    },

    // Comparison: (A->C), (B->C) |- (A<->B)
    comparison: (t1, t2) => {
        const f1 = t1.frequency, c1 = t1.confidence;
        const f2 = t2.frequency, c2 = t2.confidence;

        const f0 = or(f1, f2);
        const f = (f0 === 0) ? 0 : and(f1, f2) / f0;
        const w = and(f0, c1, c2);
        const c = w / (w + 1);

        return new Truth(f, c);
    },

    // Analogy: (A->B), (A<->C) |- (C->B)
    analogy: (t1, t2) => {
        const f1 = t1.frequency, c1 = t1.confidence;
        const f2 = t2.frequency, c2 = t2.confidence;

        const f = and(f1, f2);
        const c = and(c1, c2, f2);

        return new Truth(f, c);
    }
};
