/**
 * @file LMNarsGPTBeliefRule.js
 * @description NARS-GPT style belief formation from natural language.
 */

import { LMRule } from '../../LMRule.js';
import { Punctuation, Task } from '../../../task/Task.js';
import { Truth } from '../../../Truth.js';
import { isBelief, tryParseNarsese } from '../../RuleHelpers.js';
import { NarsGPTPrompts } from './NarsGPTPrompts.js';

/**
 * Creates a NARS-GPT style belief encoding rule.
 * Converts natural language statements to Narsese with consistent term usage.
 */
export const createNarsGPTBeliefRule = (dependencies) => {
    const { lm, narsGPTStrategy, parser, eventBus, memory } = dependencies;

    return LMRule.create({
        id: 'narsgpt-belief',
        lm,
        eventBus,
        name: 'NARS-GPT Belief Formation',
        description: 'Encodes natural language beliefs into Narsese with memory-consistent terms.',
        priority: 0.85,
        singlePremise: true,

        condition: (primaryPremise) => {
            if (!primaryPremise?.term) return false;
            if (!isBelief(primaryPremise)) return false;

            // Target: atomic terms that look like natural language (contain spaces or quotes)
            const term = primaryPremise.term;
            const name = term.name ?? term.toString?.() ?? '';
            return term.isAtomic && (/\s/.test(name) || name.startsWith('"'));
        },

        prompt: async (primaryPremise, secondaryPremise, context) => {
            const sentence = primaryPremise.term?.toString?.() ?? String(primaryPremise.term);
            const cleanSentence = sentence.replace(/^"|"$/g, '');
            const mem = context?.memory ?? memory;
            const currentTime = context?.currentTime ?? Date.now();

            // Build context for consistent term usage
            let contextStr = '';
            if (narsGPTStrategy && mem) {
                const buffer = await narsGPTStrategy.buildAttentionBuffer(cleanSentence, mem, currentTime);
                contextStr = NarsGPTPrompts.formatBuffer(buffer.slice(0, 10)); // Limit context
            }

            return NarsGPTPrompts.belief(contextStr, cleanSentence);
        },

        process: (response) => {
            if (!response) return null;

            // Extract Narsese-like content from response
            const lines = response.split('\n').filter(l => l.trim());

            // Find lines that look like Narsese
            for (const line of lines) {
                const trimmed = line.trim();
                if ((trimmed.startsWith('(') || trimmed.startsWith('<')) &&
                    (trimmed.includes('-->') || trimmed.includes('<->') || trimmed.includes('==>'))) {
                    return trimmed;
                }
            }

            return response.trim();
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput) return [];

            const parsed = tryParseNarsese(processedOutput, parser);
            if (parsed?.term) {
                // Extract truth values if present
                let truth = new Truth(0.9, 0.9);
                if (parsed.truthValue) {
                    truth = new Truth(parsed.truthValue.frequency, parsed.truthValue.confidence);
                } else {
                    // Parse inline truth values like {0.9 0.8}
                    const truthMatch = processedOutput.match(/\{(\d+\.?\d*)\s+(\d+\.?\d*)\}/);
                    if (truthMatch) {
                        truth = new Truth(parseFloat(truthMatch[1]), parseFloat(truthMatch[2]));
                    }
                }

                return [new Task({
                    term: parsed.term,
                    punctuation: Punctuation.BELIEF,
                    truth,
                    budget: { priority: 0.8, durability: 0.8, quality: 0.6 },
                    metadata: { source: 'narsgpt-belief' }
                })];
            }

            return [];
        },

        lm_options: {
            temperature: 0.2,
            max_tokens: 200,
        }
    });
};
