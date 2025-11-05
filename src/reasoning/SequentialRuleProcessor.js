import {RuleProcessor} from './RuleProcessor.js';

export class SequentialRuleProcessor extends RuleProcessor {
    constructor(config = {}) {
        super(config);
        this.maxBatchSize = config.maxBatchSize || 100;
    }

    async process(rules, tasks, context) {
        if (!context || typeof context !== 'object') {
            throw new Error('SequentialRuleProcessor requires a valid ReasoningContext');
        }

        return await this._applyRulesToTasks(rules, tasks, context);
    }
}