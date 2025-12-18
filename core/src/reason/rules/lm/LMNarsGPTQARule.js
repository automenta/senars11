/**
 * @file LMNarsGPTQARule.js
 * @description NARS-GPT style question answering with memory-grounded context.
 */

import { LMRule } from '../../LMRule.js';
import { Punctuation, Task } from '../../../task/Task.js';
import { Truth } from '../../../Truth.js';
import { isQuestion } from '../../RuleHelpers.js';
import { NarsGPTPrompts } from './NarsGPTPrompts.js';

/**
 * Creates a NARS-GPT style question answering rule.
 * Answers questions using memory context for grounding.
 */
export const createNarsGPTQARule = (dependencies) => {
  const { lm, narsGPTStrategy, parser, eventBus, memory } = dependencies;

  return LMRule.create({
    id: 'narsgpt-qa',
    lm,
    eventBus,
    name: 'NARS-GPT Question Answering',
    description: 'Answers questions using memory-grounded context.',
    priority: 0.95,
    singlePremise: true,

    condition: (primaryPremise) => {
      if (!primaryPremise?.term) return false;
      return isQuestion(primaryPremise);
    },

    prompt: async (primaryPremise, secondaryPremise, context) => {
      const question = primaryPremise.term?.toString?.() ?? String(primaryPremise.term);
      const mem = context?.memory ?? memory;
      const currentTime = context?.currentTime ?? Date.now();

      let contextStr = '';
      if (narsGPTStrategy && mem) {
        const buffer = await narsGPTStrategy.buildAttentionBuffer(question, mem, currentTime);
        contextStr = NarsGPTPrompts.formatBuffer(buffer);
      }

      return NarsGPTPrompts.question(contextStr, question);
    },

    process: (response) => {
      if (!response) return null;

      // Clean up the response - extract the main answer
      const lines = response.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      // Return the first substantive line or the whole response
      return lines.length > 0 ? lines[0] : response.trim();
    },

    generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
      if (!processedOutput) return [];

      const termFactory = context?.termFactory;
      if (!termFactory) return [];

      // Create a belief representing the answer
      const cleanAnswer = processedOutput.replace(/^["']|["']$/g, '').trim();
      const answerTerm = termFactory.atomic(`"${cleanAnswer}"`);

      return [new Task({
        term: answerTerm,
        punctuation: Punctuation.BELIEF,
        truth: new Truth(0.9, 0.7),
        budget: { priority: 0.8, durability: 0.7, quality: 0.6 },
        metadata: {
          source: 'narsgpt-qa',
          question: primaryPremise.term?.toString?.()
        }
      })];
    },

    lm_options: {
      temperature: 0.3,
      max_tokens: 300,
    }
  });
};
