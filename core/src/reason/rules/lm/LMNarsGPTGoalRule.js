/**
 * @file LMNarsGPTGoalRule.js
 * @description NARS-GPT style goal processing with grounding requirement.
 */

import { LMRule } from '../../LMRule.js';
import { Punctuation, Task } from '../../../task/Task.js';
import { Truth } from '../../../Truth.js';
import { isGoal, tryParseNarsese } from '../../RuleHelpers.js';
import { NarsGPTPrompts } from './NarsGPTPrompts.js';

/**
 * Creates a NARS-GPT style goal processing rule.
 * Only processes goals with grounded terms (known to the system).
 */
export const createNarsGPTGoalRule = (dependencies) => {
    const { lm, narsGPTStrategy, parser, eventBus, memory } = dependencies;

    return LMRule.create({
        id: 'narsgpt-goal',
        lm,
        eventBus,
        name: 'NARS-GPT Goal Processing',
        description: 'Processes goals and generates sub-goals, requiring grounded terms.',
        priority: 0.9,
        singlePremise: true,

        condition: async (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise?.term) return false;
            if (!isGoal(primaryPremise)) return false;

            // Check grounding if strategy available
            if (narsGPTStrategy?.checkGrounding) {
                const goalText = primaryPremise.term?.toString?.() ?? '';
                const groundingResult = await narsGPTStrategy.checkGrounding(goalText);

                // Reject ungrounded goals (NARS-GPT behavior)
                if (!groundingResult.grounded) {
                    return false;
                }
            }

            return true;
        },

        prompt: async (primaryPremise, secondaryPremise, context) => {
            const goal = primaryPremise.term?.toString?.() ?? String(primaryPremise.term);
            const mem = context?.memory ?? memory;
            const currentTime = context?.currentTime ?? Date.now();

            let contextStr = '';
            if (narsGPTStrategy && mem) {
                const buffer = await narsGPTStrategy.buildAttentionBuffer(goal, mem, currentTime);
                contextStr = NarsGPTPrompts.formatBuffer(buffer);
            }

            return NarsGPTPrompts.goal(contextStr, goal);
        },

        process: (response) => {
            if (!response) return null;

            // Extract goal-like statements (ending with !)
            const lines = response.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);

            const goals = lines.filter(l =>
                l.endsWith('!') ||
                l.includes('-->') ||
                l.includes('==>') ||
                l.match(/^\d+\./)  // numbered items
            );

            return goals.length > 0 ? goals : [response.trim()];
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput || processedOutput.length === 0) return [];

            const tasks = [];
            const termFactory = context?.termFactory;

            const outputs = Array.isArray(processedOutput) ? processedOutput : [processedOutput];

            for (const output of outputs.slice(0, 5)) { // Max 5 sub-goals
                // Clean numbered prefixes
                const cleaned = output.replace(/^\d+\.\s*/, '').trim();

                const parsed = tryParseNarsese(cleaned, parser);
                if (parsed?.term) {
                    tasks.push(new Task({
                        term: parsed.term,
                        punctuation: Punctuation.GOAL,
                        truth: new Truth(
                            primaryPremise.truth?.f ?? 0.9,
                            (primaryPremise.truth?.c ?? 0.9) * 0.85
                        ),
                        budget: {
                            priority: (primaryPremise.budget?.priority ?? 0.8) * 0.9,
                            durability: 0.7,
                            quality: 0.5
                        },
                        metadata: { source: 'narsgpt-goal', parentGoal: primaryPremise.term?.toString?.() }
                    }));
                } else if (termFactory) {
                    // Create atomic sub-goal
                    const subGoalTerm = termFactory.atomic(cleaned.replace(/!$/, ''));
                    tasks.push(new Task({
                        term: subGoalTerm,
                        punctuation: Punctuation.GOAL,
                        truth: new Truth(0.8, 0.7),
                        budget: { priority: 0.7, durability: 0.6, quality: 0.5 },
                        metadata: { source: 'narsgpt-goal', parentGoal: primaryPremise.term?.toString?.() }
                    }));
                }
            }

            return tasks;
        },

        lm_options: {
            temperature: 0.5,
            max_tokens: 400,
        }
    });
};
