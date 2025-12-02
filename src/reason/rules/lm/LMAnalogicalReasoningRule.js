/**
 * @file src/reason/rules/lm/LMAnalogicalReasoningRule.js
 * @description Analogical reasoning rule that uses an LM and embeddings to solve new problems by drawing analogies.
 */

import {LMRule} from '../../LMRule.js';
import {Punctuation, Task} from '../../utils/TaskUtils.js';
import {hasPattern, isGoal, isQuestion, KeywordPatterns} from '../../RuleHelpers.js';

/**
 * Creates an analogical reasoning rule using the enhanced LMRule.create method.
 *
 * @param {object} dependencies - Object containing lm, embeddingLayer and other dependencies
 * @returns {LMRule} A new LMRule instance for analogical reasoning.
 */
export const createAnalogicalReasoningRule = (dependencies) => {
    const {lm, embeddingLayer} = dependencies;

    return LMRule.create({
        id: 'analogical-reasoning',
        lm,
        name: 'Analogical Reasoning Rule',
        description: 'Solves new problems by drawing analogies to known situations using embeddings.',
        priority: 0.7,
        singlePremise: true,

        condition: (primaryPremise) => {
            if (!primaryPremise) return false;

            const isGoalOrQuestion = isGoal(primaryPremise) || isQuestion(primaryPremise);
            const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;

            // Trigger on high-priority goals/questions with problem-solving keywords
            // Checking availability of embeddingLayer in condition as well to fail fast if not present
            return !!embeddingLayer && isGoalOrQuestion && priority > 0.6 && hasPattern(primaryPremise, KeywordPatterns.problemSolving);
        },

        prompt: async (primaryPremise) => {
            const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
            let contextStr = '';

            try {
                // Leverage EmbeddingLayer to find semantically similar concepts in memory
                const results = await embeddingLayer.findSimilar(termStr, {limit: 3});
                const analogies = results
                    .map(r => r.term?.toString?.() || String(r.term))
                    .filter(t => t !== termStr);

                if (analogies.length > 0) {
                     contextStr = `\nI recall these similar situations/concepts: ${analogies.join(', ')}.`;
                }
            } catch (e) {
                // If embedding lookup fails, proceed without analogies
                console.warn('AnalogicalReasoningRule: Embedding lookup failed', e);
            }

            return `Here is a problem: "${termStr}".${contextStr}

Think of a similar, well-understood problem (an analogy).
Based on that analogy, describe a step-by-step solution for the original problem.`;
        },

        process: (lmResponse) => {
            return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise) => {
            if (!processedOutput) return [];

            const newTerm = `solution_proposal_for_(${primaryPremise.term?.toString?.() || 'unknown'})`;
            const newTask = new Task(
                newTerm,
                Punctuation.BELIEF,
                {frequency: 0.8, confidence: 0.7},
                null,
                null,
                0.7,
                0.6,
                null,
                {
                    originalTask: primaryPremise.term?.toString?.(),
                    solutionProposal: processedOutput
                }
            );

            return [newTask];
        },

        lm_options: {
            temperature: 0.7,
            max_tokens: 600,
        },
    });
};
