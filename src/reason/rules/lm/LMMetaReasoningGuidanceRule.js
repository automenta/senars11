/**
 * @file src/reason/rules/LMMetaReasoningGuidanceRule.js
 * @description Meta-reasoning guidance rule that uses an LM to recommend reasoning strategies for complex problems.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import { LMRule } from '../../LMRule.js';
import { Task, TruthValue, Punctuation, TaskDerivation } from '../../TaskUtils.js';
import { isGoal, isQuestion, hasPattern, KeywordPatterns } from '../../RuleHelpers.js';

/**
 * Creates a meta-reasoning guidance rule using the enhanced LMRule.create method.
 * This rule identifies complex problems and uses an LM to recommend a reasoning strategy.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for meta-reasoning guidance.
 */
export const createMetaReasoningGuidanceRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'meta-reasoning-guidance',
    lm,
    name: 'Meta-Reasoning Guidance Rule',
    description: 'Provides reasoning strategy recommendations for complex problems.',
    priority: 0.85,

    condition: (primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise) return false;

      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');
      const isGoalOrQuestion = isGoal(primaryPremise) || isQuestion(primaryPremise);
      const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;

      return isGoalOrQuestion && priority > 0.8 && hasPattern(primaryPremise, KeywordPatterns.complexity);
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `For the complex goal/question: "${termStr}", what is the most effective reasoning strategy?

Consider these options:
- **Decomposition**: Breaking it down into smaller sub-problems.
- **Analogical Reasoning**: Finding a similar, solved problem.
- **Causal Reasoning**: Analyzing cause-and-effect relationships.
- **Hypothesis Testing**: Formulating and testing hypotheses.

Recommend the best primary strategy and briefly explain why.`;
    },

    process: (lmResponse) => {
      return lmResponse?.trim() || '';
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput) return [];
      
      const newTerm = `strategy_for_(${primaryPremise.term?.toString?.() || 'unknown'})`;
      const newTask = new Task(
        newTerm,
        Punctuation.JUDGMENT,
        { frequency: 1.0, confidence: 0.9 },
        null,
        null,
        0.8,
        0.7,
        null,
        { 
          originalTerm: primaryPremise.term?.toString?.(),
          strategy: processedOutput // Attach the strategy as metadata
        }
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 400,
    },
  });
};