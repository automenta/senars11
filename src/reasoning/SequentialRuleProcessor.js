import {RuleProcessor} from './RuleProcessor.js';

/**
 * SequentialRuleProcessor: Applies rules sequentially to tasks
 * This preserves the original behavior while allowing for different processing strategies
 */
export class SequentialRuleProcessor extends RuleProcessor {
    constructor(config = {}) {
        super(config);
        this.maxBatchSize = config.maxBatchSize || 100;
    }

    /**
     * Process rules against tasks sequentially
     */
    async process(rules, tasks, context) {
        if (!context || typeof context !== 'object') {
            throw new Error('SequentialRuleProcessor requires a valid ReasoningContext');
        }

        const results = [];

        // Apply each rule to each task
        for (const rule of rules) {
            for (const task of tasks) {
                results.push(...await this._applyRuleToTask(rule, task, context));
            }
        }

        return results;
    }
}