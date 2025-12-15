/**
 * @file InductionAbductionRule.js
 * @description Induction and Abduction inference rules.
 *
 * Induction: (M --> P), (M --> S) |- (S --> P)  [shared subject]
 * Abduction: (P --> M), (S --> M) |- (S --> P)  [shared predicate]
 */

import {NALRule} from './NALRule.js';
import {Truth} from '../../../Truth.js';

/**
 * Induction Rule: Shared subject pattern
 * (M --> P), (M --> S) |- (S --> P)
 */
export class InductionRule extends NALRule {
    constructor(config = {}) {
        super('nal-induction', 'nal', 0.9, config);
    }

    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || !secondaryPremise) return false;

        const {term: t1} = primaryPremise;
        const {term: t2} = secondaryPremise;

        if (!t1?.isCompound || !t2?.isCompound) return false;
        if (t1.operator !== '-->' || t2.operator !== '-->') return false;

        // Shared subject: (M --> P), (M --> S)
        return t1.subject?.equals?.(t2.subject) && !t1.predicate?.equals?.(t2.predicate);
    }

    apply(primaryPremise, secondaryPremise, context) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) return [];

        const {term: t1, truth: truth1} = primaryPremise;
        const {term: t2, truth: truth2} = secondaryPremise;
        const termFactory = context?.termFactory;

        if (!termFactory || !truth1 || !truth2) return [];

        // (M --> P), (M --> S) |- (S --> P)
        const derivedTruth = Truth.induction(truth1, truth2);
        if (!derivedTruth) return [];

        const conclusionTerm = termFactory.create('-->', [t2.predicate, t1.predicate]);
        const task = this.createDerivedTask(conclusionTerm, derivedTruth, [primaryPremise, secondaryPremise], context, '.');

        return task ? [task] : [];
    }
}

/**
 * Abduction Rule: Shared predicate pattern
 * (P --> M), (S --> M) |- (S --> P)
 */
export class AbductionRule extends NALRule {
    constructor(config = {}) {
        super('nal-abduction', 'nal', 0.9, config);
    }

    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || !secondaryPremise) return false;

        const {term: t1} = primaryPremise;
        const {term: t2} = secondaryPremise;

        if (!t1?.isCompound || !t2?.isCompound) return false;
        if (t1.operator !== '-->' || t2.operator !== '-->') return false;

        // Shared predicate: (P --> M), (S --> M)
        return t1.predicate?.equals?.(t2.predicate) && !t1.subject?.equals?.(t2.subject);
    }

    apply(primaryPremise, secondaryPremise, context) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) return [];

        const {term: t1, truth: truth1} = primaryPremise;
        const {term: t2, truth: truth2} = secondaryPremise;
        const termFactory = context?.termFactory;

        if (!termFactory || !truth1 || !truth2) return [];

        // (P --> M), (S --> M) |- (S --> P)
        const derivedTruth = Truth.abduction(truth1, truth2);
        if (!derivedTruth) return [];

        const conclusionTerm = termFactory.create('-->', [t2.subject, t1.subject]);
        const task = this.createDerivedTask(conclusionTerm, derivedTruth, [primaryPremise, secondaryPremise], context, '.');

        return task ? [task] : [];
    }
}
