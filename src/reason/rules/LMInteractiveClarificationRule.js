/**
 * @file src/reason/rules/LMInteractiveClarificationRule.js
 * @description Interactive clarification rule that uses an LM to generate clarifying questions for ambiguous input.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import { LMRule } from '../LMRule.js';
import { Task, TruthValue, Punctuation, TaskDerivation } from '../TaskUtils.js';
import { isGoal, isQuestion, hasPattern, KeywordPatterns, parseSubGoals } from '../RuleHelpers.js';

/**
 * Creates an interactive clarification rule using the enhanced LMRule.create method.
 * This rule identifies ambiguous goals or questions and uses an LM to ask for clarification.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for interactive clarification.
 */
export const createInteractiveClarificationRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'interactive-clarification',
    lm,
    name: 'Interactive Clarification Rule',
    description: 'Generates clarifying questions when input is ambiguous.',
    priority: 0.8,

    condition: (primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise) return false;

      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');
      const isGoalOrQuestion = isGoal(primaryPremise) || isQuestion(primaryPremise);
      const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;

      return isGoalOrQuestion && priority > 0.7 && 
             (hasPattern(primaryPremise, KeywordPatterns.ambiguous) || termStr.length < 15);
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `The following statement is ambiguous or lacks detail:
"${termStr}"

To clarify, ask 1-2 specific questions that would help resolve the ambiguity.
Frame the questions to elicit concrete information. Provide only the questions.`;
    },

    process: (lmResponse) => {
      if (!lmResponse) return [];
      const questions = parseSubGoals(lmResponse);
      return questions.filter(q => q.endsWith('?'));
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput || processedOutput.length === 0) return [];

      return processedOutput.map(question => {
        const newTask = new Task(
          question,
          Punctuation.QUESTION,
          { frequency: 1.0, confidence: 0.9 }
        );
        return newTask;
      });
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 150,
    },
  });
};