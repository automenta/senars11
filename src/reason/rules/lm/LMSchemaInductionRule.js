/**
 * @file src/reason/rules/LMSchemaInductionRule.js
 * @description Schema induction rule that uses an LM to extract action schemas from narrative or procedural text.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import {LMRule} from '../../LMRule.js';
import {Punctuation, Task} from '../../TaskUtils.js';
import {hasPattern, isBelief, KeywordPatterns} from '../../RuleHelpers.js';

/**
 * Creates a schema induction rule using the enhanced LMRule.create method.
 * This rule identifies procedural or narrative text and uses an LM to induce a formal schema.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for schema induction.
 */
export const createSchemaInductionRule = (dependencies) => {
    const {lm} = dependencies;
    return LMRule.create({
        id: 'schema-induction',
        lm,
        name: 'Schema Induction Rule',
        description: 'Extracts action schemas from narrative or instruction sequences.',
        priority: 0.65,

        condition: (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise) return false;

            const belief = isBelief(primaryPremise);
            const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');

            return belief && priority > 0.6 && hasPattern(primaryPremise, KeywordPatterns.narrative);
        },

        prompt: (primaryPremise, secondaryPremise, context) => {
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
            return `From the following text, extract a generalizable procedure or schema.

Text: "${termStr}"

Describe the schema as a sequence of conditional steps (e.g., "IF condition THEN action").
The schema should be abstract enough to apply to similar situations.`;
        },

        process: (lmResponse) => {
            return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput) return [];

            const newTask = new Task(
                processedOutput,
                Punctuation.BELIEF,
                {frequency: 0.9, confidence: 0.8}
            );

            return [newTask];
        },

        lm_options: {
            temperature: 0.5,
            max_tokens: 500,
        },
    });
};