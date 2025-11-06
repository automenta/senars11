/**
 * @file src/reason/rules/LMGoalDecompositionRule.js
 * @description Goal decomposition rule that uses an LM to break down high-level goals into concrete sub-goals.
 */

import {LMRule} from '../../LMRule.js';
import {Punctuation, Task} from '../../utils/TaskUtils.js';
import {cleanSubGoal, isGoal, isValidSubGoal, parseSubGoals} from '../../RuleHelpers.js';

export const createGoalDecompositionRule = (dependencies, config = {}) => {
    const {lm} = dependencies;
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

        condition: (primaryPremise) => {
            if (!lm || !primaryPremise) return false;
            const priority = primaryPremise.getPriority?.() ?? primaryPremise.priority ?? 0;
            return isGoal(primaryPremise) && priority > 0.7;
        },

        prompt: (primaryPremise) => {
            const termStr = primaryPremise.term?.toString?.() ?? String(primaryPremise.term ?? 'unknown');
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

        generate: (processedOutput, primaryPremise) => {
            if (!primaryPremise || !processedOutput?.length) {
                return [];
            }

            return processedOutput.map(subGoal => {
                const newTask = new Task(
                    subGoal,
                    Punctuation.GOAL,
                    {
                        frequency: primaryPremise.truth.f,
                        confidence: primaryPremise.truth.c * 0.9
                    }
                );
                newTask.priority = Math.max(0.1, (primaryPremise.priority ?? 0.8) * 0.9);
                newTask.derivedFrom = primaryPremise.term?.toString?.() ?? 'original-task';
                return newTask;
            });
        },

        lm_options: {
            temperature: 0.6,
            max_tokens: 500,
            stop: ['\n\n'],
            ...finalConfig.lm_options
        },
    });
};