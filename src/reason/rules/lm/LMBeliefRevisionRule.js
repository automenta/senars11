/**
 * @file src/reason/rules/LMBeliefRevisionRule.js
 * @description Belief revision rule that uses an LM to resolve contradictions and inconsistencies.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import {LMRule} from '../../LMRule.js';
import {Punctuation, Task} from '../../utils/TaskUtils.js';
import {hasPattern, isBelief, KeywordPatterns} from '../../RuleHelpers.js';

/**
 * Creates a belief revision rule using the enhanced LMRule.create method.
 * This rule identifies beliefs containing contradictions and uses an LM to suggest revisions.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for belief revision.
 */
export const createBeliefRevisionRule = (dependencies) => {
    const {lm} = dependencies;
    return LMRule.create({
        id: 'belief-revision',
        lm,
        name: 'Belief Revision Rule',
        description: 'Helps resolve contradictions by suggesting belief revisions.',
        priority: 0.95,

        condition: (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise) return false;

            const belief = isBelief(primaryPremise);
            const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');

            return belief && priority > 0.8 && hasPattern(primaryPremise, KeywordPatterns.conflict);
        },

        prompt: (primaryPremise, secondaryPremise, context) => {
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
            return `The following belief appears to contain a contradiction or conflict:
"${termStr}"

Analyze this belief and the potential conflict. Propose a revised, more nuanced belief that resolves the inconsistency.
The revised belief should be a single, clear statement.`;
        },

        process: (lmResponse) => {
            return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput) return [];

            const newTask = new Task(
                processedOutput,
                Punctuation.BELIEF,
                {
                    frequency: primaryPremise.truth.f,
                    confidence: primaryPremise.truth.c * 0.8, // Revised belief is slightly less confident
                },
            );

            return [newTask];
        },

        lm_options: {
            temperature: 0.5,
            max_tokens: 400,
        },
    });
};