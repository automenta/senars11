import {ReasoningContext} from './ReasoningContext.js';

export class RuleProcessor {
    constructor(config = {}) {
        this.config = config;
    }

    async process(rules, tasks, context) {
        throw new Error('RuleProcessor.process must be implemented by subclasses');
    }

    async createContext(tasks, config = {}) {
        if (config instanceof ReasoningContext) {
            return config;
        }

        return new ReasoningContext(config);
    }

    canProcess(ruleType, taskType) {
        return true;
    }

    async _applyRulesToTasks(rules, tasks, context) {
        const results = [];
        for (const rule of rules) {
            for (const task of tasks) {
                results.push(...await this._applyRuleToTask(rule, task, context));
            }
        }
        return results;
    }

    async _applyRuleToTask(rule, task, context) {
        if (!rule.canApply?.(task)) return [];

        try {
            const {results: ruleResults} = await rule.apply(task, context);
            context.incrementMetric('rulesApplied');
            context.incrementMetric('inferencesMade', ruleResults.length);
            return ruleResults;
        } catch (error) {
            // Log with specific error context for better debugging
            this.logger?.warn?.(`Rule ${rule.id} failed for task ${task?.id || 'unknown'}:`, error);
            // Return empty array in case of error to maintain processing flow
            return [];
        }
    }
}