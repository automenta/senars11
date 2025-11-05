import {LMRule} from '../reason/LMRule.js';

export class LMRuleFactory {
    static create(id, lm, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
        if (!id || !lm || !promptTemplate || !responseProcessor) {
            throw new Error('LMRuleFactory.create: `id`, `lm`, `promptTemplate`, and `responseProcessor` are required.');
        }

        return new LMRule(id, lm, promptTemplate, responseProcessor, priority, config);
    }

    static createSimple(id, lm, promptTemplate, priority = 1.0, config = {}) {
        const responseProcessor = this._createDefaultResponseProcessor();
        return this.create(id, lm, promptTemplate, responseProcessor, priority, config);
    }

    static createInferenceRule(id, lm, priority = 1.0, config = {}) {
        return this._createRuleWithTemplate(
            id,
            lm,
            `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a logical inference or conclusion based on this information. Respond with a valid Narsese statement.`,
            priority,
            config
        );
    }

    static createHypothesisRule(id, lm, priority = 1.0, config = {}) {
        return this._createRuleWithTemplate(
            id,
            lm,
            `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a plausible hypothesis that could explain or relate to this information. Respond with a valid Narsese statement.`,
            priority,
            config
        );
    }

    static _createRuleWithTemplate(id, lm, promptTemplate, priority, config) {
        const responseProcessor = this._createDefaultResponseProcessor();
        return this.create(id, lm, promptTemplate, responseProcessor, priority, config);
    }

    static _createDefaultResponseProcessor() {
        return async (lmResponse, task) => lmResponse ? [] : [];
    }
}