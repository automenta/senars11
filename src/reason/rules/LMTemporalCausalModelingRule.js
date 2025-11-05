/**
 * @file src/reason/rules/LMTemporalCausalModelingRule.js
 * @description Temporal and causal modeling rule that uses an LM to infer time order and causal relationships.
 * Enhanced for stream-based architecture with better error handling and metrics.
 */

import { LMRule } from '../LMRule.js';
import { Task, TruthValue, Punctuation, TaskDerivation } from '../TaskUtils.js';
import { extractPrimaryTask, isJudgment, hasPattern, KeywordPatterns } from '../RuleHelpers.js';

/**
 * Creates a temporal/causal modeling rule using the enhanced LMRule.create method.
 * This rule identifies statements with temporal or causal language and uses an LM to model them formally.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for temporal/causal modeling.
 */
export const createTemporalCausalModelingRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'temporal-causal-modeling',
    lm,
    name: 'Temporal/Causal Modeling Rule',
    description: 'Infers time order and causal relationships from text.',
    priority: 0.75,

    condition: (primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise) return false;

      const isBelief = isJudgment(primaryPremise);
      const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');

      return isBelief && priority > 0.7 && hasPattern(primaryPremise, KeywordPatterns.temporalCausal);
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `Analyze the temporal and causal relationships in the following statement:
"${termStr}"

Identify the cause and the effect. Express their relationship as a formal implication (e.g., "cause --> effect").
If there is a time sequence, describe it.`;
    },

    process: (lmResponse) => {
      // Extract the formal implication from the response
      const match = lmResponse?.match(/(\w+\s*-->\s*\w+)/);
      return match ? match[1] : (lmResponse?.trim() || '');
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput) return [];
      
      const newTask = new Task(
        processedOutput,
        Punctuation.JUDGMENT, // Judgment, as it's modeling a relationship
        { frequency: 0.9, confidence: 0.8 }
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.4, // Lower temperature for more consistent formal outputs
      max_tokens: 300,
    },
  });
};