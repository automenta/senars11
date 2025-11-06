/**
 * New Syllogistic Rule for the stream-based reasoner
 * Implements the inheritance syllogistic deduction rule.
 * Derives (S --> P) from (S --> M) and (M --> P)
 */

import {Rule} from '../../Rule.js';
import {Truth} from '../../../Truth.js';
import {Task} from '../../../task/Task.js';
import {Stamp} from '../../../Stamp.js';
import {Term, TermType} from '../../../term/Term.js';

export class SyllogisticRule extends Rule {
    constructor(config = {}) {
        super('nal-syllogistic-deduction', 'nal', 1.0, config);
    }

    /**
     * Determine if this rule can be applied to the given premises
     * @param {Task} primaryPremise - The primary premise
     * @param {Task} secondaryPremise - The secondary premise
     * @returns {boolean} - Whether the rule can be applied
     */
    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || !secondaryPremise) return false;

        // Both premises need to be compound statements with appropriate operators
        const term1 = primaryPremise.term;
        const term2 = secondaryPremise.term;

        if (!term1?.isCompound || !term2?.isCompound) return false;

        // Look for relations like inheritance (-->), but not implication (==>) which is handled by ImplicationSyllogisticRule
        // This avoids duplicate processing of implication syllogisms
        const isValidOperator = (op) => op === '-->';
        if (!isValidOperator(term1.operator) || !isValidOperator(term2.operator)) return false;

        // Check for syllogistic pattern: (S --> M) + (M --> P) => (S --> P)
        const comp1 = term1.components;
        const comp2 = term2.components;

        if (comp1.length !== 2 || comp2.length !== 2) return false;

        // Find potential matching middle terms using the proper Term.equals method
        // Pattern 1: (S --> M) + (M --> P) where comp1[1] === comp2[0]
        // Pattern 2: (M --> P) + (S --> M) where comp2[1] === comp1[0]
        const matchesPattern1 = comp1[1]?.equals && comp1[1].equals(comp2[0]); // term1.object === term2.subject
        const matchesPattern2 = comp2[1]?.equals && comp2[1].equals(comp1[0]); // term2.object === term1.subject

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

        // Pattern 1: (S --> M) + (M --> P) => (S --> P)
        if (comp1[1].equals && comp1[1].equals(comp2[0])) {
            // subject = comp1[0], middle = comp1[1], predicate = comp2[1]
            return this._createDerivedTask(primaryPremise, secondaryPremise, comp1[0], comp2[1], term1.operator);
        }
        // Pattern 2: (M --> P) + (S --> M) => (S --> P)
        else if (comp2[1].equals && comp2[1].equals(comp1[0])) {
            // subject = comp2[0], middle = comp2[1], predicate = comp1[1]
            return this._createDerivedTask(primaryPremise, secondaryPremise, comp2[0], comp1[1], term1.operator);
        }

        return []; // No valid pattern found
    }

    /**
     * Helper method to create derived task from syllogistic conclusion
     * @private
     */
    _createDerivedTask(primaryPremise, secondaryPremise, subject, predicate, operator) {
        // Calculate truth value using NAL deduction
        const truth1 = primaryPremise.truth;
        const truth2 = secondaryPremise.truth;

        if (!truth1 || !truth2) return [];

        const derivedTruth = Truth.deduction(truth1, truth2);
        if (!derivedTruth) return [];

        // Create the conclusion term using the Term class with proper structure
        const conclusionName = `(${operator}, ${subject.name || 'subject'}, ${predicate.name || 'predicate'})`;
        const conclusionTerm = new Term(TermType.COMPOUND, conclusionName, [subject, predicate], operator);

        // Create new stamp combining both premise stamps
        const newStamp = Stamp.derive([primaryPremise.stamp, secondaryPremise.stamp]);

        // Calculate priority (simplified)
        const priority = (primaryPremise.budget?.priority || 0.5) *
            (secondaryPremise.budget?.priority || 0.5) *
            this.priority;

        // Create derived task
        const derivedTask = new Task({
            term: conclusionTerm,
            punctuation: '.',  // Belief
            truth: derivedTruth,
            stamp: newStamp,
            budget: {
                priority: priority,
                durability: Math.min(
                    primaryPremise.budget?.durability ?? 0.5,
                    secondaryPremise.budget?.durability ?? 0.5
                ),
                quality: Math.min(
                    primaryPremise.budget?.quality ?? 0.5,
                    secondaryPremise.budget?.quality ?? 0.5
                )
            }
        });

        return [derivedTask];
    }
}

export default SyllogisticRule;