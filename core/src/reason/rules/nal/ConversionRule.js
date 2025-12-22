/**
 * @file ConversionRule.js
 * @description Conversion and Contraposition inference rules.
 *
 * Conversion: (P --> S) |- (S --> P) [with reduced confidence]
 * Contraposition: (S --> P) |- (--P --> --S) [with reduced confidence]
 */

import {NALRule} from './NALRule.js';
import {Truth} from '../../../Truth.js';

/**
 * Conversion Rule: Reverse subject and predicate
 * (P --> S) |- (S --> P)
 * Single premise rule with reduced confidence
 */
export class ConversionRule extends NALRule {
    constructor(config = {}) {
        super('nal-conversion', 'nal', 0.7, config);
    }

    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || secondaryPremise) return false; // Unary rule

        const {term} = primaryPremise;
        return term?.isCompound && term.operator === '-->' && term.subject && term.predicate;
    }

    apply(primaryPremise, secondaryPremise, context) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) return [];

        const {term, truth} = primaryPremise;
        const termFactory = context?.termFactory;

        if (!termFactory || !truth) return [];

        const derivedTruth = Truth.conversion(truth);
        if (!derivedTruth) return [];

        const conclusionTerm = termFactory.create('-->', [term.predicate, term.subject]);
        const task = this.createDerivedTask(conclusionTerm, derivedTruth, [primaryPremise], context, '.');

        return task ? [task] : [];
    }
}

/**
 * Contraposition Rule: Negate and reverse
 * (S --> P) |- (--P --> --S)
 * Single premise rule with reduced confidence
 */
export class ContrapositionRule extends NALRule {
    constructor(config = {}) {
        super('nal-contraposition', 'nal', 0.6, config);
    }

    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || secondaryPremise) return false; // Unary rule

        const {term} = primaryPremise;
        return term?.isCompound && term.operator === '==>' && term.subject && term.predicate;
    }

    apply(primaryPremise, secondaryPremise, context) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) return [];

        const {term, truth} = primaryPremise;
        const termFactory = context?.termFactory;

        if (!termFactory || !truth) return [];

        // Contraposition uses weak reduction
        const derivedTruth = Truth.structuralReduction(truth);
        if (!derivedTruth) return [];

        const negSubject = termFactory.create('--', [term.predicate]);
        const negPredicate = termFactory.create('--', [term.subject]);
        const conclusionTerm = termFactory.create('==>', [negSubject, negPredicate]);

        const task = this.createDerivedTask(conclusionTerm, derivedTruth, [primaryPremise], context, '.');

        return task ? [task] : [];
    }
}
