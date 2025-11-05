/**
 * @file src/reason/rules/LMGoalDecompositionRule.js
 * @description Goal decomposition rule that uses an LM to break down high-level goals into concrete sub-goals.
 * Enhanced for stream-based architecture with better error handling and metrics.
 */

import { LMRule } from '../LMRule.js';
import { Task, TruthValue, Punctuation, TaskDerivation } from '../TaskUtils.js';
import { 
  parseSubGoals, 
  cleanSubGoal, 
  isValidSubGoal,
  extractPrimaryTask,
  isGoal 
} from '../RuleHelpers.js';

/**
 * Creates a goal decomposition rule using the enhanced LMRule.create method.
 * This rule identifies high-priority goals and uses an LM to decompose them into smaller, actionable sub-goals.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @param {object} config - Configuration options for the rule
 * @returns {LMRule} A new LMRule instance for goal decomposition.
 */
export const createGoalDecompositionRule = (dependencies, config = {}) => {
  const { lm } = dependencies;
  const finalConfig = {
    id: 'goal-decomposition',
    name: 'Goal Decomposition Rule',
    description: 'Breaks down high-level goals into concrete, actionable sub-goals using an LM.',
    priority: 0.9,
    minSubGoals: 2,
    maxSubGoals: 5,
    minGoalLength: 5,
    maxGoalLength: 150,
    ...config,
    lm
  };

  return LMRule.create({
    ...finalConfig,
    
    condition: (primaryPremise, secondaryPremise, context) => {
      if (!lm) return false;
      if (!primaryPremise) return false;
      const isGoalTask = isGoal(primaryPremise);
      const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
      return isGoalTask && priority > 0.7;
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `Decompose the following goal into ${finalConfig.minSubGoals} to ${finalConfig.maxSubGoals} smaller, actionable sub-goals.

Goal: "${termStr}"

Output: List of subgoals, one per line`;
    },

    process: (lmResponse) => {
      if (!lmResponse) return [];
      const subGoals = parseSubGoals(lmResponse);
      return subGoals
        .map(cleanSubGoal)
        .filter(goal => isValidSubGoal(goal, finalConfig.minGoalLength, finalConfig.maxGoalLength))
        .slice(0, finalConfig.maxSubGoals);
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise || !processedOutput || processedOutput.length === 0) {
        return [];
      }

      // Create sub-goal tasks with proper Task objects
      const newTasks = processedOutput.map(subGoal => {
        // Create a new term for the sub-goal
        const newTerm = new Task(subGoal, Punctuation.GOAL, {
          frequency: primaryPremise.truth.f,
          confidence: primaryPremise.truth.c * 0.9 // Slightly reduce confidence
        });
        
        // Adjust priority slightly lower than original
        newTerm.priority = Math.max(0.1, (primaryPremise.priority || 0.8) * 0.9);
        
        // Add derivation metadata
        newTerm.derivedFrom = primaryPremise.term?.toString?.() || 'original-task';
        
        return newTerm;
      });

      return newTasks;
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 500,
      stop: ['\n\n'],
      ...finalConfig.lm_options
    },
  });
};