/**
 * Abstract Syllogistic Rule for the stream-based reasoner
 * Implements the syllogistic deduction rule base for both inheritance and implication.
 * Derives (S --> P) or (S ==> P) from (S --> M) and (M --> P) or (S ==> M) and (M ==> P)
 */

import {NALRule} from './NALRule.js';
import {Truth} from '../../../Truth.js';

export class SyllogisticRule extends NALRule {
    /**
     * Constructor for abstract class - should be called by subclasses
     * @param {string} id - Rule identifier
     * @param {string} operator - The operator this rule handles (e.g. '==>' or '-->')
     * @param {number} priority - Rule priority
     * @param {Object} config - Configuration options
     */
    constructor(id, operator, priority, config = {}) {
        super(id, 'nal', priority, config);
        this.operator = operator;
    }

    /**
     * Determine if this rule can be applied to the given premises
     * @param {Task} primaryPremise - The primary premise
     * @param {Task} secondaryPremise - The secondary premise
     * @returns {boolean} - Whether the rule can be applied
     */
    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || !secondaryPremise) return false;

        // Both premises need to be compound statements with the appropriate operator
        const term1 = primaryPremise.term;
        const term2 = secondaryPremise.term;

        if (!term1?.isCompound || !term2?.isCompound) return false;

        // Check that at least one premise has the correct operator for this rule
        const hasCorrectOperator = (term) => term.operator === this.operator;
        if (!hasCorrectOperator(term1) && !hasCorrectOperator(term2)) return false;

        // Check for syllogistic pattern: (S --> M) + (M --> P) => (S --> P)
        const comp1 = term1.components;
        const comp2 = term2.components;

        if (comp1.length !== 2 || comp2.length !== 2) return false;

        // Find potential matching middle terms using the proper Term.equals method
        // Pattern 1: (S --> M) + (M --> P) where term1.predicate === term2.subject
        // Pattern 2: (M --> P) + (S --> M) where term2.predicate === term1.subject
        const matchesPattern1 = term1.predicateEquals(term2.subject);
        const matchesPattern2 = term2.predicateEquals(term1.subject);

        return matchesPattern1 || matchesPattern2;
    }

    /**
     * Apply the syllogistic rule to derive new tasks
     * @param {Task} primaryPremise - The primary premise
     * @param {Task} secondaryPremise - The secondary premise
     * @returns {Array<Task>} - Array of derived tasks
     */
    apply(primaryPremise, secondaryPremise, context) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) {
            return [];
        }

        const term1 = primaryPremise.term;
        const term2 = secondaryPremise.term;

        // Identify the syllogistic pattern
        const comp1 = term1.components;
        const comp2 = term2.components;

        // Extract termFactory from context
        const termFactory = context?.termFactory;

        // Pattern 1: (S --> M) + (M --> P) => (S --> P)
        if (term1.predicateEquals(term2.subject)) {
            // subject = term1.subject, middle = term1.predicate, predicate = term2.predicate
            return this._createDerivedTask(primaryPremise, secondaryPremise, term1.subject, term2.predicate, this.operator, termFactory);
        }
        // Pattern 2: (M --> P) + (S --> M) => (S --> P)
        else if (term2.predicateEquals(term1.subject)) {
            // subject = term2.subject, middle = term2.predicate, predicate = term1.predicate
            return this._createDerivedTask(primaryPremise, secondaryPremise, term2.subject, term1.predicate, this.operator, termFactory);
        }

        return []; // No valid pattern found
    }

    /**
     * Helper method to create derived task from syllogistic conclusion
     * @private
     */
    _createDerivedTask(primaryPremise, secondaryPremise, subject, predicate, operator, termFactory = null) {
        // Calculate truth value using NAL deduction
        const truth1 = primaryPremise.truth;
        const truth2 = secondaryPremise.truth;

        if (!truth1 || !truth2) return [];

        const derivedTruth = Truth.deduction(truth1, truth2);
        if (!derivedTruth) return [];

        if (!termFactory) {
            // TermFactory is required for proper term creation and caching
            return [];
        }

        // Create the conclusion term using the Term class with proper structure
        const conclusionTerm = termFactory.create(operator, [subject, predicate]);

        // Use base class to create the task with proper stamp and budget
        const task = super.createDerivedTask(
            conclusionTerm,
            derivedTruth,
            [primaryPremise, secondaryPremise],
            null, // context not used for stamp/budget currently
            '.'   // Punctuation is Belief
        );

        return task ? [task] : [];
    }
}

// Export concrete implementations
export class InheritanceSyllogisticRule extends SyllogisticRule {
    constructor(config = {}) {
        super('nal-inheritance-syllogistic', '-->', 1.0, config);
    }
}

export class ImplicationSyllogisticRule extends SyllogisticRule {
    constructor(config = {}) {
        super('nal-implication-syllogistic', '==>', 1.0, config);
    }
}

export default SyllogisticRule;
