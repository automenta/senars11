import {NALRule} from './NALRule.js';
import {Truth} from '../../../Truth.js';
import {logError} from '../../utils/error.js';

/**
 * Implements the Modus Ponens inference rule for the stream reasoner.
 *
 * Premise 1: (P ==> Q) {f1, c1}
 * Premise 2: P {f2, c2}
 * Conclusion: Q {F_ded}
 */
export class ModusPonensRule extends NALRule {
    constructor(config = {}) {
        super('nal-modusponens', 'nal', 1.0, config);
    }

    /**
     * Check if this rule can be applied to the given premise pair
     * @param {Task} primaryPremise - The first premise
     * @param {Task} secondaryPremise - The second premise
     * @param {Object} context - Context object that may contain termFactory
     * @returns {boolean} Whether the rule can be applied
     */
    canApply(primaryPremise, secondaryPremise, context) {
        if (!primaryPremise || !secondaryPremise) return false;

        // Check if one is an implication and the other matches the antecedent
        const isImplication = (term) => term.operator === '==>';

        const isAntecedentMatch = (implicationTerm, otherTerm) => {
            if (!isImplication(implicationTerm) || !implicationTerm.components) return false;
            return implicationTerm.components[0]?.equals &&
                implicationTerm.components[0].equals(otherTerm);
        };

        const primaryTerm = primaryPremise.term;
        const secondaryTerm = secondaryPremise.term;

        // Case 1: primary is implication, secondary matches antecedent
        if (isImplication(primaryTerm) && isAntecedentMatch(primaryTerm, secondaryTerm)) {
            return true;
        }

        // Case 2: secondary is implication, primary matches antecedent
        if (isImplication(secondaryTerm) && isAntecedentMatch(secondaryTerm, primaryTerm)) {
            return true;
        }

        return false;
    }

    /**
     * Apply the rule to generate conclusions
     * @param {Task} primaryPremise - The first premise
     * @param {Task} secondaryPremise - The second premise
     * @param {Object} context - Context object that may contain termFactory
     * @returns {Array<Task>} Array of derived tasks
     */
    apply(primaryPremise, secondaryPremise, context = {}) {
        if (!this.canApply(primaryPremise, secondaryPremise, context)) {
            return [];
        }

        try {
            // Determine which premise is the implication and which is the antecedent
            let implicationPremise, antecedentPremise;

            if (primaryPremise.term.operator === '==>' &&
                primaryPremise.term.components[0]?.equals &&
                primaryPremise.term.components[0].equals(secondaryPremise.term)) {
                implicationPremise = primaryPremise;
                antecedentPremise = secondaryPremise;
            } else if (secondaryPremise.term.operator === '==>' &&
                secondaryPremise.term.components[0]?.equals &&
                secondaryPremise.term.components[0].equals(primaryPremise.term)) {
                implicationPremise = secondaryPremise;
                antecedentPremise = primaryPremise;
            } else {
                return [];
            }

            // Extract components: implication is (P ==> Q), antecedent is P
            // const P = implicationPremise.term.components[0];  // Antecedent
            const Q = implicationPremise.term.components[1];  // Consequent
            const implicationTruth = implicationPremise.truth;
            const antecedentTruth = antecedentPremise.truth;

            // Calculate truth value for conclusion Q using Modus Ponens formula
            // Frequency: f_imp * f_ant
            // Confidence: c_imp * c_ant * f_imp
            const newTruth = new Truth(
                implicationTruth.f * antecedentTruth.f,  // f_imp * f_ant
                implicationTruth.c * antecedentTruth.c * implicationTruth.f  // c_imp * c_ant * f_imp
            );

            // Use base class to create the task with proper stamp and budget
            const derivedTask = super.createDerivedTask(
                Q,
                newTruth,
                [primaryPremise, secondaryPremise]
            );

            return derivedTask ? [derivedTask] : [];
        } catch (error) {
            logError(error, {
                ruleId: this.id,
                context: 'modus_ponens_rule_application'
            }, 'error');
            return [];
        }
    }
}
