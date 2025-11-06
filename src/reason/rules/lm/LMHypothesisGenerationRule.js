/**
 * @file src/reason/rules/LMHypothesisGenerationRule.js
 * @description Hypothesis generation rule that uses an LM to create new hypotheses based on existing beliefs.
 */

import {LMRule} from '../../LMRule.js';
import {Punctuation, Task} from '../../TaskUtils.js';
import {isBelief} from '../../RuleHelpers.js';

export const createHypothesisGenerationRule = (dependencies) => {
    const {lm} = dependencies;
    return LMRule.create({
        id: 'hypothesis-generation',
        lm,
        name: 'Hypothesis Generation Rule',
        description: 'Generates new, related hypotheses based on existing beliefs.',
        priority: 0.6,

        condition: (primaryPremise) => {
            if (!primaryPremise) return false;

            const priority = primaryPremise.getPriority?.() ?? primaryPremise.priority ?? 0;
            const confidence = primaryPremise.truth?.c ?? primaryPremise.truth?.confidence ?? 0;

            return isBelief(primaryPremise) && priority > 0.7 && confidence > 0.8;
        },

        prompt: (primaryPremise) => {
            const termStr = primaryPremise.term?.toString?.() ?? String(primaryPremise.term ?? 'unknown');
            return `Based on the following belief, what is a plausible and testable hypothesis?

Belief: "${termStr}"

The hypothesis should explore a potential cause, effect, or related phenomenon.
State the hypothesis as a clear, single statement.`;
        },

        process: (lmResponse) => {
            return lmResponse?.trim?.().replace(/^Hypothesis:\s*/i, '') ?? '';
        },

        generate: (processedOutput) => {
            if (!processedOutput) return [];

            return [new Task(
                processedOutput,
                Punctuation.QUESTION,
                {frequency: 0.5, confidence: 0.5},
                null,
                null,
                0.7
            )];
        },

        lm_options: {
            temperature: 0.8,
            max_tokens: 200,
        },
    });
};