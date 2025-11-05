/**
 * @file src/reason/rules/LMHypothesisGenerationRule.js
 * @description Hypothesis generation rule that uses an LM to create new hypotheses based on existing beliefs.
 * Enhanced for stream-based architecture with better error handling and metrics.
 */

import { LMRule } from '../LMRule.js';
import { extractPrimaryTask, createContext } from '../RuleHelpers.js';

/**
 * Creates a hypothesis generation rule using the enhanced LMRule.create method.
 * This rule identifies interesting beliefs and uses an LM to generate related hypotheses.
 *
 * @param {object} config - Configuration object containing lm and other options
 * @returns {LMRule} A new LMRule instance for hypothesis generation.
 */
export const createHypothesisGenerationRule = (config) => {
  const { id = 'hypothesis-generation', lm, ...rest } = config;
  
  return LMRule.create({
    id,
    lm,
    name: 'Hypothesis Generation Rule',
    description: 'Generates new, related hypotheses based on existing beliefs.',
    priority: 0.6,
    
    condition: (primaryPremise, secondaryPremise, context) => {
      if (!lm || !primaryPremise) return false;

      // For this rule, we want high-priority, confident beliefs
      // In real implementation, punctuation constants would be used
      const isBelief = primaryPremise.punctuation === '.' || 
                      (primaryPremise.punctuation && primaryPremise.punctuation.toLowerCase().includes('judgment'));
      
      const priority = primaryPremise.priority || 0;
      const confidence = primaryPremise.truth?.confidence || 0;
      
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
      if (!lmResponse) return '';
      return lmResponse.trim().replace(/^Hypothesis:\s*/i, '');
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput) return [];

      // Create a new task representing the hypothesis
      // In real implementation, would import Task and Punctuation
      const newTask = {
        term: processedOutput,
        // Frame hypothesis as a question to be investigated
        punctuation: '?',
        truth: {
          frequency: 0.5, // Hypotheses start with medium uncertainty
          confidence: 0.5
        },
        priority: 0.7, // Give hypothesis reasonable priority to be tested
        derivedFrom: primaryPremise.id || primaryPremise.term?.toString?.() || 'original-belief'
      };

      return [newTask];
    },

    lm_options: {
      temperature: 0.8,
      max_tokens: 200,
      ...config.lm_options
    },
    
    ...rest
  });
};