/**
 * @file src/reason/rules/LMUncertaintyCalibrationRule.js
 * @description Uncertainty calibration rule that uses an LM to map qualitative uncertainty to quantitative truth values.
 * Based on the v9 implementation with enhancements for stream-based architecture.
 */

import { LMRule } from '../../LMRule.js';
import { Task, TruthValue, Punctuation, TaskDerivation } from '../../TaskUtils.js';
import { isJudgment, hasPattern, KeywordPatterns } from '../../RuleHelpers.js';

/**
 * Creates an uncertainty calibration rule using the enhanced LMRule.create method.
 * This rule identifies beliefs with uncertain language and uses an LM to assign a quantitative confidence value.
 *
 * @param {object} dependencies - Object containing lm and other dependencies
 * @returns {LMRule} A new LMRule instance for uncertainty calibration.
 */
export const createUncertaintyCalibrationRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'uncertainty-calibration',
    lm,
    name: 'Uncertainty Calibration Rule',
    description: 'Maps qualitative uncertainty expressions to NARS truth values.',
    priority: 0.7,

    condition: (primaryPremise, secondaryPremise, context) => {
      if (!primaryPremise) return false;

      const isBelief = isJudgment(primaryPremise);
      const priority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');
      const confidence = primaryPremise.truth?.c || primaryPremise.truth?.confidence || 0.9;

      // Apply if the belief has uncertainty terms and default confidence
      return isBelief && priority > 0.6 && confidence >= 0.9 && hasPattern(primaryPremise, KeywordPatterns.uncertainty);
    },

    prompt: (primaryPremise, secondaryPremise, context) => {
      const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown');
      return `On a scale from 0.0 (completely uncertain) to 1.0 (completely certain), how confident should one be in the following statement?
Provide only a single number as your answer.

Statement: "${termStr}"`;
    },

    process: (lmResponse) => {
      const match = lmResponse?.match(/(\d\.\d+)/);
      if (match) {
        const confidence = parseFloat(match[1]);
        if (!isNaN(confidence) && confidence >= 0 && confidence <= 1) {
          return confidence;
        }
      }
      return null; // Return null if parsing fails
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (processedOutput === null) return [];
      
      const newTruth = {
        ...primaryPremise.truth,
        c: processedOutput, // Update confidence with the LM's calibration
        confidence: processedOutput
      };

      const newTask = new Task(
        primaryPremise.term,
        primaryPremise.punctuation,
        newTruth
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.2,
      max_tokens: 10,
    },
  });
};