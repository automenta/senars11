/**
 * @file src/reason/RuleHelpers.js
 * @description Shared helper functions for reasoning rules, enhanced for stream-based architecture.
 */

import { Task, TruthValue, Punctuation } from './TaskUtils.js';

/**
 * Extracts the primary task from the reasoning context.
 * @param {Task} primaryPremise - The primary premise
 * @param {Task} secondaryPremise - The secondary premise
 * @param {object} context - The context object passed to the rule
 * @returns {Task|null} The primary task, or null if not found
 */
export function extractPrimaryTask(primaryPremise, secondaryPremise, context) {
  return primaryPremise || null;
}

/**
 * Extracts the secondary task from the reasoning context.
 * @param {Task} primaryPremise - The primary premise
 * @param {Task} secondaryPremise - The secondary premise
 * @param {object} context - The context object passed to the rule
 * @returns {Task|null} The secondary task, or null if not found
 */
export function extractSecondaryTask(primaryPremise, secondaryPremise, context) {
  return secondaryPremise || null;
}

/**
 * Extracts task from a premise context (wrapper for backward compatibility).
 */
export function extractTaskFromContext(primaryPremise, secondaryPremise, context) {
  return extractPrimaryTask(primaryPremise, secondaryPremise, context);
}

/**
 * Parses a list of items from LM response (e.g., sub-goals, hypotheses)
 * @param {string} lmResponse - The response from the language model
 * @returns {Array<string>} Array of parsed items
 */
export function parseListFromResponse(lmResponse) {
  if (!lmResponse) return [];
  
  return lmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove common list prefixes (numbered, bulleted, etc.)
      return line.replace(/^\s*\d+[\.)]\s*|^[-*]\s*/, '').trim();
    })
    .filter(item => item.length > 0); // Remove any empty strings
}

/**
 * Parses sub-goals from LM response (v9 pattern)
 * @param {string} lmResponse - The response from the language model
 * @returns {Array<string>} Array of parsed sub-goals
 */
export function parseSubGoals(lmResponse) {
  return lmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^\s*\d+[\.)]\s*|^[-*]\s*/, '').trim());
}

/**
 * Cleans a sub-goal string by removing quotes and punctuation (v9 pattern)
 * @param {string} goal - The sub-goal string to clean
 * @returns {string} The cleaned sub-goal
 */
export function cleanSubGoal(goal) {
  if (!goal) return '';
  goal = goal.replace(/^["']|["']$/g, '');
  goal = goal.replace(/[.,;!?]+$/, '');
  return goal.trim();
}

/**
 * Validates if a sub-goal meets length and content criteria (v9 pattern)
 * @param {string} goal - The sub-goal to validate
 * @param {number} minLength - Minimum length requirement
 * @param {number} maxLength - Maximum length requirement
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidSubGoal(goal, minLength, maxLength) {
  if (!goal || goal.length < minLength || goal.length > maxLength) {
    return false;
  }
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes('sorry') || lowerGoal.includes('cannot') || lowerGoal.includes('unable')) {
    return false;
  }
  return true;
}

/**
 * Cleans a text response by removing quotes and trailing punctuation
 * @param {string} text - The text to clean
 * @returns {string} The cleaned text
 */
export function cleanText(text) {
  if (!text) return '';
  
  // Remove surrounding quotes
  text = text.replace(/^["']|["']$/g, '');
  // Remove trailing punctuation
  text = text.replace(/[.,;!?]+$/, '');
  // Trim whitespace
  return text.trim();
}

/**
 * Validates if a text meets basic criteria
 * @param {string} text - The text to validate
 * @param {number} minLength - Minimum length requirement
 * @param {number} maxLength - Maximum length requirement
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidText(text, minLength = 1, maxLength = 1000) {
  if (!text || text.length < minLength || text.length > maxLength) {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  // Check for common rejection patterns
  if (lowerText.includes('sorry') || 
      lowerText.includes('cannot') || 
      lowerText.includes('unable') ||
      lowerText.includes('no information')) {
    return false;
  }
  
  return true;
}

/**
 * Creates a new task based on an original task with modified properties
 * @param {Task} originalTask - The original task to base the new one on
 * @param {Object} newProps - Properties to override in the new task
 * @returns {Task} New task with adjusted properties
 */
export function createDerivedTask(originalTask, newProps) {
  // This is a simplified version - in reality, you'd need to import Task and TruthValue
  // This function is meant to be a template that would be completed with actual implementations
  return {
    ...originalTask,
    ...newProps,
    // Add derivation tracking info
    derivedFrom: originalTask.id || originalTask.term?.toString?.() || 'unknown'
  };
}

/**
 * Calculates derived truth values based on original truth and a modifier
 * @param {Object} originalTruth - The original truth value object
 * @param {number} confidenceMultiplier - Multiplier for confidence (default 0.9)
 * @returns {Object} New truth value with adjusted confidence
 */
export function deriveTruthValue(originalTruth, confidenceMultiplier = 0.9) {
  if (!originalTruth) {
    return { frequency: 0.5, confidence: 0.9 };
  }
  
  return {
    frequency: originalTruth.frequency || 0.5,
    confidence: (originalTruth.confidence || 0.9) * confidenceMultiplier
  };
}

/**
 * Checks if a term contains certain patterns that indicate specific processing needs
 * @param {any} term - The term to check
 * @param {Array<string>} patterns - Patterns to look for
 * @returns {boolean} True if any pattern is found
 */
export function hasPattern(term, patterns) {
  const termStr = term?.toString?.() || String(term || '');
  const lowerTerm = termStr.toLowerCase();
  
  return patterns.some(pattern => lowerTerm.includes(pattern.toLowerCase()));
}

/**
 * Creates a context object that combines premises and additional system information
 * @param {Task} primaryPremise - Primary premise
 * @param {Task} secondaryPremise - Secondary premise (optional)
 * @param {Object} systemContext - Additional system context
 * @returns {Object} Combined context object
 */
export function createContext(primaryPremise, secondaryPremise, systemContext = {}) {
  return {
    primary: primaryPremise,
    secondary: secondaryPremise,
    ...systemContext,
    timestamp: Date.now(),
    // Add metadata for stream processing tracking
    metadata: {
      source: 'lm-rule',
      processingStage: 'apply',
      ...systemContext.metadata
    }
  };
}

/**
 * Helper to check if a task is a goal
 */
export function isGoal(task) {
  return task && task.punctuation === Punctuation.GOAL;
}

/**
 * Helper to check if a task is a question
 */
export function isQuestion(task) {
  return task && task.punctuation === Punctuation.QUESTION;
}

/**
 * Helper to check if a task is a judgment (belief)
 */
export function isJudgment(task) {
  return task && task.punctuation === Punctuation.JUDGMENT;
}

/**
 * Common keywords and patterns for different rule types
 */
export const KeywordPatterns = {
  problemSolving: [
    'solve', 'fix', 'repair', 'improve', 'handle', 'address', 'resolve', 'overcome', 'manage', 'operate',
    'apply', 'adapt', 'implement', 'execute', 'create', 'build', 'design', 'plan', 'organize', 'find a way to'
  ],
  
  conflict: ['contradict', 'conflict', 'inconsistent', 'opposite', 'versus', 'vs'],
  
  complexRelation: (termStr) => {
    return termStr.includes('-->') || termStr.includes('<->') || termStr.includes('==>');
  },
  
  narrative: [
    'when', 'then', 'if', 'first', 'after', 'before', 'sequence', 'procedure', 'instruction', 'process', 'step', 'guide', 'how to'
  ],
  
  temporalCausal: [
    'before', 'after', 'when', 'then', 'while', 'during', 'causes', 'leads to', 'results in',
    'because', 'since', 'due to', 'therefore', 'consequently', 'if', 'precedes', 'follows'
  ],
  
  uncertainty: [
    'maybe', 'perhaps', 'likely', 'unlikely', 'uncertain', 'probably', 'possibly', 'might',
    'tend to', 'often', 'sometimes', 'generally', 'usually', 'could be', 'seems'
  ],
  
  ambiguous: [
    'it', 'this', 'that', 'they', 'them', 'which', 'what', 'how', 'some', 'few', 'many', 'most', 'thing', 'stuff', 'deal with'
  ],
  
  complexity: [
    'solve', 'achieve', 'optimize', 'balance', 'maximize', 'minimize', 'understand', 'analyze',
    'investigate', 'discover', 'resolve', 'plan', 'design', 'create', 'develop', 'implement'
  ]
};