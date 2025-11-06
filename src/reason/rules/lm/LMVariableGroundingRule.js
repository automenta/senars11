/**
 * @file src/reason/rules/LMVariableGroundingRule.js
 * @description Variable grounding rule that uses an LM to suggest possible values for variables in statements.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import {LMRule} from '../../LMRule.js';
import {Task} from '../../TaskUtils.js';
import {parseSubGoals} from '../../RuleHelpers.js';

const hasVariable = (text) => {
    return /[\$\?]\w+/.test(text);
};

/**
 * Creates a variable grounding rule using the enhanced LMRule.create method.
 * This rule identifies statements with variables and uses an LM to propose concrete values.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for variable grounding.
 */
export const createVariableGroundingRule = (dependencies) => {
    const {lm} = dependencies;
    return LMRule.create({
        id: 'variable-grounding',
        lm,
        name: 'Variable Grounding Rule',
        description: 'Suggests possible concrete values for variables in tasks.',
        priority: 0.7,

        condition: (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise) return false;

            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');
            const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;

            return priority > 0.7 && hasVariable(termStr);
        },

        prompt: (primaryPremise, secondaryPremise, context) => {
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
            return `The following statement contains a variable.
Statement: "${termStr}"

Based on the context, what are 1-3 plausible, concrete values for the variable?
Provide only the values, one per line.`;
        },

        process: (lmResponse) => {
            if (!lmResponse) return [];
            return parseSubGoals(lmResponse);
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput || processedOutput.length === 0) return [];

            const originalTermStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');

            return processedOutput.map(value => {
                // Replace the first variable found with the proposed value
                const newTermStr = originalTermStr.replace(/[\$\?]\w+/, value);
                const newTask = new Task(
                    newTermStr,
                    primaryPremise.punctuation,
                    {frequency: 0.6, confidence: 0.5}, // Grounded statements have moderate uncertainty
                    null,
                    null,
                    0.6,
                    0.4
                );
                return newTask;
            });
        },

        lm_options: {
            temperature: 0.7,
            max_tokens: 100,
        },
    });
};