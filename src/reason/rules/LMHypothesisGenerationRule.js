/**
 * @file src/reason/rules/LMHypothesisGenerationRule.js
 * @description Hypothesis generation rule that uses an LM to create new hypotheses based on existing beliefs.
 * Enhanced for stream-based architecture with better error handling and metrics.
 */

import { LMRule } from '../LMRule.js';
import { Task, TruthValue, Punctuation, TaskDerivation } from '../TaskUtils.js';
import { extractPrimaryTask, isJudgment } from '../RuleHelpers.js';

/**
 * Creates a hypothesis generation rule using the enhanced LMRule.create method.
 * This rule identifies interesting beliefs and uses an LM to generate related hypotheses.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for hypothesis generation.
 */
export const createHypothesisGenerationRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'hypothesis-generation',
    lm,
    name: 'Hypothesis Generation Rule',
    description: 'Generates new, related hypotheses based on existing beliefs.',
    priority: 0.6,

    condition: (primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise) return false;

      const isBelief = isJudgment(primaryPremise);
      const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
      const confidence = primaryPremise.truth?.c || primaryPremise.truth?.confidence || 0;

      // Trigger on high-priority, confident beliefs
      return isBelief && priority > 0.7 && confidence > 0.8;
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `Based on the following belief, what is a plausible and testable hypothesis?

Belief: "${termStr}"

The hypothesis should explore a potential cause, effect, or related phenomenon.
State the hypothesis as a clear, single statement.`;
    },

    process: (lmResponse) => {
      // Clean and validate the response
      const hypothesis = lmResponse?.trim?.().replace(/^Hypothesis:\s*/i, '') || '';
      return hypothesis;
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput) return [];

      // Generate a new question to investigate the hypothesis
      const newTask = new Task(
        processedOutput,
        Punctuation.QUESTION, // Frame hypothesis as a question to be investigated
        { frequency: 0.5, confidence: 0.5 }, // Hypotheses start with medium uncertainty
        null,
        null,
        0.7 // Give reasonable priority to be tested
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.8,
      max_tokens: 200,
    },
  });
};