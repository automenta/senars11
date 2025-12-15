/**
 * @file VariableIntroduction.js
 * @description NAL rule for introducing variables to generalize knowledge.
 *
 * This rule implements the NARS generalization pattern:
 * Given: (cat --> animal), (dog --> animal)
 * Derive: ($x --> animal) with reduced confidence
 *
 * Variable introduction enables:
 * 1. Generalization from specific instances
 * 2. Pattern recognition across similar statements
 * 3. Hypothesis formation for category membership
 */

import {NALRule} from './NALRule.js';
import {Truth} from '../../../Truth.js';


/**
 * Introduces independent variables ($) to generalize patterns.
 *
 * Patterns detected:
 * - Shared predicate: (A --> P), (B --> P) => ($x --> P)
 * - Shared subject: (S --> A), (S --> B) => (S --> $x)
 * - Matching structure: (A --> B), (C --> D) where structure matches
 */
export class VariableIntroductionRule extends NALRule {
    constructor(config = {}) {
        super({
            id: 'variable-introduction',
            category: 'generalization',
            priority: config.priority ?? 0.6,
            ...config
        });

        // Minimum confidence for variable introduction
        this.minConfidence = config.minConfidence ?? 0.3;

        // Variable counter for unique naming
        this._varCounter = 0;
    }

    /**
     * Check if this rule can apply to the given premises.
     * Requires two statements with matching structure.
     */
    canApply(primaryPremise, secondaryPremise, context = {}) {
        if (!primaryPremise?.term || !secondaryPremise?.term) return false;

        const p = primaryPremise.term;
        const s = secondaryPremise.term;

        // Both must be compound statements
        if (!p.isCompound || !s.isCompound) return false;

        // Both must have same operator (inheritance or similarity)
        if (p.operator !== s.operator) return false;
        if (!['-->', '<->'].includes(p.operator)) return false;

        // Must have subject and predicate
        if (!p.subject || !p.predicate || !s.subject || !s.predicate) return false;

        // Must not be identical
        if (this._termsEqual(p, s)) return false;

        // Check for generalizable patterns
        return this._hasGeneralizablePattern(p, s);
    }

    /**
     * Apply variable introduction to create generalized statement.
     */
    apply(primaryPremise, secondaryPremise, context = {}) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) {
            return [];
        }

        const results = [];
        const p = primaryPremise.term;
        const s = secondaryPremise.term;
        const termFactory = context.termFactory;

        if (!termFactory) return [];

        // Pattern 1: Shared predicate - (A --> P), (B --> P) => (?x --> P)
        if (this._termsEqual(p.predicate, s.predicate) &&
            !this._termsEqual(p.subject, s.subject)) {
            const variableTerm = termFactory.variable(`?x${this._varCounter++}`);
            const generalizedTerm = this._createStatement(
                termFactory, p.operator, variableTerm, p.predicate
            );

            if (generalizedTerm) {
                const truth = this._calculateGeneralizationTruth(
                    primaryPremise.truth, secondaryPremise.truth
                );
                results.push(this.createDerivedTask(generalizedTerm, truth, [primaryPremise, secondaryPremise], context));
            }
        }

        // Pattern 2: Shared subject - (S --> A), (S --> B) => (S --> ?y)
        if (this._termsEqual(p.subject, s.subject) &&
            !this._termsEqual(p.predicate, s.predicate)) {
            const variableTerm = termFactory.variable(`?y${this._varCounter++}`);
            const generalizedTerm = this._createStatement(
                termFactory, p.operator, p.subject, variableTerm
            );

            if (generalizedTerm) {
                const truth = this._calculateGeneralizationTruth(
                    primaryPremise.truth, secondaryPremise.truth
                );
                results.push(this.createDerivedTask(generalizedTerm, truth, [primaryPremise, secondaryPremise], context));
            }
        }

        return results.filter(Boolean);
    }

    /**
     * Check if terms have a generalizable pattern.
     * @private
     */
    _hasGeneralizablePattern(p, s) {
        // Shared predicate: (A --> P), (B --> P)
        if (this._termsEqual(p.predicate, s.predicate) &&
            !this._termsEqual(p.subject, s.subject)) {
            return true;
        }

        // Shared subject: (S --> A), (S --> B)
        if (this._termsEqual(p.subject, s.subject) &&
            !this._termsEqual(p.predicate, s.predicate)) {
            return true;
        }

        return false;
    }

    /**
     * Create a statement term.
     * @private
     */
    _createStatement(termFactory, operator, subject, predicate) {
        switch (operator) {
            case '-->':
                return termFactory.inheritance(subject, predicate);
            case '<->':
                return termFactory.similarity(subject, predicate);
            default:
                return null;
        }
    }

    /**
     * Calculate truth value for generalization.
     * Generalization reduces confidence as it's inductive.
     * @private
     */
    _calculateGeneralizationTruth(truth1, truth2) {
        if (!truth1 || !truth2) {
            return new Truth(1.0, this.minConfidence);
        }

        // Average frequency, weakened confidence
        const avgFrequency = (truth1.frequency + truth2.frequency) / 2;
        const minConfidence = Math.min(truth1.confidence, truth2.confidence);

        // Weaken confidence for inductive generalization
        const weakenedConfidence = Truth.weak(minConfidence);

        return new Truth(avgFrequency, Math.max(this.minConfidence, weakenedConfidence));
    }

    /**
     * Check if two terms are equal.
     * @private
     */
    _termsEqual(t1, t2) {
        if (!t1 || !t2) return false;
        if (typeof t1.equals === 'function') {
            return t1.equals(t2);
        }
        return (t1.name || t1._name) === (t2.name || t2._name);
    }
}

/**
 * Introduces dependent variables (#) for existential generalization.
 *
 * Pattern: (A --> B), derived from context
 * Result: (#x --> B) - "something has property B"
 */
export class DependentVariableIntroductionRule extends NALRule {
    constructor(config = {}) {
        super({
            id: 'dependent-variable-introduction',
            category: 'generalization',
            priority: config.priority ?? 0.4,
            ...config
        });

        this._varCounter = 0;
    }

    canApply(primaryPremise, secondaryPremise, context = {}) {
        // This is a unary rule - only needs primary premise
        if (!primaryPremise?.term) return false;

        const term = primaryPremise.term;
        if (!term.isCompound) return false;
        if (!['-->', '<->'].includes(term.operator)) return false;

        // Subject must be atomic (not already a variable)
        const subject = term.subject;
        if (!subject || subject.isVariable) return false;

        return true;
    }

    apply(primaryPremise, secondaryPremise, context = {}) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) {
            return [];
        }

        const termFactory = context.termFactory;
        if (!termFactory) return [];

        const term = primaryPremise.term;
        const variableTerm = termFactory.variable(`?z${this._varCounter++}`);

        let generalizedTerm;
        switch (term.operator) {
            case '-->':
                generalizedTerm = termFactory.inheritance(variableTerm, term.predicate);
                break;
            case '<->':
                generalizedTerm = termFactory.similarity(variableTerm, term.predicate);
                break;
            default:
                return [];
        }

        if (!generalizedTerm) return [];

        // Very weak confidence for existential generalization
        const truth = new Truth(
            primaryPremise.truth?.frequency ?? 1.0,
            Truth.weak(Truth.weak(primaryPremise.truth?.confidence ?? 0.9))
        );

        const derived = this.createDerivedTask(generalizedTerm, truth, [primaryPremise], context);
        return derived ? [derived] : [];
    }
}

// Export both rules
export const VariableIntroductionRules = [
    VariableIntroductionRule,
    DependentVariableIntroductionRule
];
