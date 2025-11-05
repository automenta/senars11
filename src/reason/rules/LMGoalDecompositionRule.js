/**
 * @file src/reason/rules/LMGoalDecompositionRule.js
 * @description Goal decomposition rule that uses an LM to break down high-level goals into concrete sub-goals.
 * Enhanced for stream-based architecture with better error handling and metrics.
 */

import { LMRule } from '../LMRule.js';
import { extractPrimaryTask, parseListFromResponse, cleanText, isValidText } from '../RuleHelpers.js';

// Helper function to create sub-goal tasks (simplified - in reality would import Task, Punctuation, TruthValue)
function createSubGoalTask(subGoal, originalTask) {
  // This is a template - actual implementation would use proper Task creation
  return {
    term: `Sub-goal: ${subGoal}`,
    punctuation: originalTask.punctuation, // Keep same punctuation type
    truth: {
      frequency: originalTask.truth?.frequency || 0.5,
      confidence: (originalTask.truth?.confidence || 0.9) * 0.9 // Slightly reduce confidence for derived tasks
    },
    priority: Math.min(0.9, (originalTask.priority || 0.8) * 0.9), // Slightly reduce priority
    derivedFrom: originalTask.id || originalTask.term?.toString?.() || 'original-task'
  };
}

/**
 * Creates a goal decomposition rule using the enhanced LMRule.create method.
 * This rule identifies high-priority goals and uses an LM to decompose them into smaller, actionable sub-goals.
 *
 * @param {object} config - Configuration object containing lm and other options
 * @returns {LMRule} A new LMRule instance for goal decomposition.
 */
export const createGoalDecompositionRule = (config) => {
  const { id = 'goal-decomposition', lm, ...rest } = config;
  
  return LMRule.create({
    id,
    lm,
    name: 'Goal Decomposition Rule',
    description: 'Breaks down high-level goals into concrete, actionable sub-goals using an LM.',
    priority: 0.9,
    minSubGoals: 2,
    maxSubGoals: 5,
    minGoalLength: 5,
    maxGoalLength: 150,
    
    condition: (primaryPremise, secondaryPremise, context) => {
      // Check if we have an LM and a valid primary premise
      if (!lm || !primaryPremise) return false;
      
      // Check if this is a goal (punctuation === '?')
      // In real implementation, would check for actual punctuation constant
      const isGoal = primaryPremise.punctuation === '?' || 
                    (primaryPremise.punctuation && primaryPremise.punctuation.toLowerCase().includes('goal'));
      
      // Check if the goal has high enough priority
      const priority = primaryPremise.priority || 0;
      
      return isGoal && priority > 0.7;
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      const minSubGoals = config.minSubGoals || 2;
      const maxSubGoals = config.maxSubGoals || 5;
      
      return `Decompose the following goal into ${minSubGoals} to ${maxSubGoals} smaller, actionable sub-goals.

Goal: "${termStr}"

Output the subgoals as a clear, numbered list, one per line. Each sub-goal should be concrete and specific.`;
    },

    process: (lmResponse) => {
      if (!lmResponse) return [];
      
      const subGoals = parseListFromResponse(lmResponse);
      const minGoalLength = config.minGoalLength || 5;
      const maxGoalLength = config.maxGoalLength || 150;
      const maxSubGoals = config.maxSubGoals || 5;
      
      return subGoals
        .map(cleanText)
        .filter(goal => isValidText(goal, minGoalLength, maxGoalLength))
        .slice(0, maxSubGoals);
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise || !processedOutput || processedOutput.length === 0) {
        return [];
      }

      // Create sub-goal tasks from the processed output
      const newTasks = processedOutput.map(subGoal => 
        createSubGoalTask(subGoal, primaryPremise)
      );

      return newTasks;
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 500,
      stop: ['\n\n', 'Question:', 'Goal:'],
      ...config.lm_options
    },
    
    ...rest
  });
};