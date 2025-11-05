/**
 * @file src/reason/rules/LMTemporalCausalModelingRule.js
 * @description Temporal and causal modeling rule that uses an LM to infer time order and causal relationships.
 * Enhanced for stream-based architecture with better error handling and metrics.
 */

import { LMRule } from '../LMRule.js';
import { extractPrimaryTask, hasPattern } from '../RuleHelpers.js';

// Keywords that suggest temporal/causal relationships
const temporalCausalKeywords = [
  'before', 'after', 'when', 'then', 'while', 'during', 'causes', 'leads to', 'results in',
  'because', 'since', 'due to', 'therefore', 'consequently', 'if', 'precedes', 'follows', 
  'caused by', 'results from', 'triggered by'
];

/**
 * Creates a temporal/causal modeling rule using the enhanced LMRule.create method.
 * This rule identifies statements with temporal or causal language and uses an LM to model them formally.
 *
 * @param {object} config - Configuration object containing lm and other options
 * @returns {LMRule} A new LMRule instance for temporal/causal modeling.
 */
export const createTemporalCausalModelingRule = (config) => {
  const { id = 'temporal-causal-modeling', lm, ...rest } = config;
  
  return LMRule.create({
    id,
    lm,
    name: 'Temporal/Causal Modeling Rule',
    description: 'Infers time order and causal relationships from text.',
    priority: 0.75,
    
    condition: (primaryPremise, secondaryPremise, context) => {
      if (!lm || !primaryPremise) return false;

      // In real implementation, punctuation constants would be used
      const isBelief = primaryPremise.punctuation === '.' || 
                      (primaryPremise.punctuation && primaryPremise.punctuation.toLowerCase().includes('judgment'));
      
      const priority = primaryPremise.priority || 0;
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');
      
      // Check if it's a belief with temporal/causal terms and high priority
      return isBelief && priority > 0.7 && hasPattern(primaryPremise, temporalCausalKeywords);
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `Analyze the temporal and causal relationships in the following statement:

"${termStr}"

Identify the cause and the effect. Express their relationship as a formal implication (e.g., "cause --> effect").
If there is a time sequence, describe it using temporal operators if possible.`;
    },

    process: (lmResponse) => {
      // Extract the formal implication from the response
      if (!lmResponse) return '';
      
      // Try to find patterns like "X --> Y" or "X causes Y" 
      const match = lmResponse.match(/(\w[\w\s-]*\s*-->\s*\w[\w\s-]*)|(\w[\w\s-]*\s+causes?\s+\w[\w\s-]*)/i);
      return match ? match[0].trim() : lmResponse.trim();
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput) return [];
      
      // Create a new task representing the temporal/causal relationship
      // In real implementation, would import Task and Punctuation
      const newTask = {
        term: processedOutput,
        punctuation: '.', // Judgment, as it's modeling a relationship
        truth: {
          frequency: 0.9, // High confidence for extracted relationships
          confidence: 0.8
        },
        priority: 0.8,
        derivedFrom: primaryPremise.id || primaryPremise.term?.toString?.() || 'original-belief'
      };

      return [newTask];
    },

    lm_options: {
      temperature: 0.4, // Lower temperature for more consistent formal outputs
      max_tokens: 300,
      ...config.lm_options
    },
    
    ...rest
  });
};