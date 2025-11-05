import {RuleProcessor} from './RuleProcessor.js';
import {createBatches, chunkArray, flattenResults} from './ReasoningUtils.js';

export class ParallelRuleProcessor extends RuleProcessor {
    constructor(config = {}) {
        super(config);
        this.maxConcurrency = config.maxConcurrency || 5;
        this.batchSize = config.batchSize || 10;
    }

    async process(rules, tasks, context) {
        const results = [];

        const taskBatches = createBatches(tasks, this.batchSize);

        for (const taskBatch of taskBatches) {
            const batchResults = await this._processBatch(rules, taskBatch, context);
            results.push(...batchResults);
        }

        return results;
    }

    async _processBatch(rules, tasks, context) {
        const allPromises = [];

        for (const rule of rules) {
            for (const task of tasks) {
                allPromises.push(this._applyRuleToTask(rule, task, context));
            }
        }

        const chunkedPromises = chunkArray(allPromises, this.maxConcurrency);
        const allResults = [];

        for (const chunk of chunkedPromises) {
            const chunkResults = await Promise.all(chunk);
            allResults.push(...flattenResults(chunkResults));
        }

        return allResults;
    }
}