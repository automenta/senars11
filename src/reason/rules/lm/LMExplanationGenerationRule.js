/**
 * @file src/reason/rules/LMExplanationGenerationRule.js
 * @description Explanation generation rule that uses an LM to create natural language explanations for formal conclusions.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import {LMRule} from '../../LMRule.js';
import {Punctuation, Task} from '../../utils/TaskUtils.js';
import {isBelief, KeywordPatterns} from '../../RuleHelpers.js';

/**
 * Creates an explanation generation rule using the enhanced LMRule.create method.
 * This rule identifies complex logical statements and uses an LM to generate natural language explanations.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for explanation generation.
 */
export const createExplanationGenerationRule = (dependencies) => {
    const {lm} = dependencies;
    return LMRule.create({
        id: 'explanation-generation',
        lm,
        name: 'Explanation Generation Rule',
        description: 'Generates natural language explanations for formal conclusions.',
        priority: 0.5,

        condition: (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise) return false;

            const belief = isBelief(primaryPremise);
            const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');

            return belief && priority > 0.6 && KeywordPatterns.complexRelation(termStr);
        },

        prompt: (primaryPremise, secondaryPremise, context) => {
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
            return `Translate the following formal logic statement into a clear, simple, natural language explanation.

Statement: "${termStr}"

Focus on conveying the core meaning and implication of the statement.`;
        },

        process: (lmResponse) => {
            return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput) return [];

            const explanationTerm = `explanation_for_(${primaryPremise.term?.toString?.() || 'unknown'})`;

            const newTask = new Task(
                explanationTerm,
                Punctuation.BELIEF,
                {frequency: 1.0, confidence: 0.9},
                null,
                null,
                0.8,
                0.5,
                null,
                {
                    originalTerm: primaryPremise.term?.toString?.(),
                    explanation: processedOutput // Attach the explanation as metadata
                }
            );

            return [newTask];
        },

        lm_options: {
            temperature: 0.5,
            max_tokens: 300,
        },
    });
};