import {NALRule} from './NALRule.js';
import {RuleUtils} from './RuleUtils.js';

export class EvaluationRule extends NALRule {
    constructor() {
        super('evaluation', {
            name: 'Evaluation Rule',
            description: 'Evaluates statements: If <a> and <a --> b> then <b>',
            priority: 0.8,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        return task.term?.isAtomic;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = allTasks.filter(t =>
            t.term?.isCompound &&
            t.term.operator === '-->' &&
            t.term.components?.length === 2
        );

        const results = [];

        for (const inheritanceTask of inheritanceTasks) {
            const [subject, predicate] = inheritanceTask.term.components;
            const bindings = this._unify(subject, task.term);

            if (bindings) {
                const resultTerm = this._substitute(predicate, bindings);
                const derivedTruth = this._calculateEvaluationTruth(task.truth, inheritanceTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: resultTerm,
                    truth: derivedTruth,
                    type: inheritanceTask.type,
                    priority: task.priority * inheritanceTask.priority * this.priority
                }));
            }
        }

        return results;
    }

    _calculateEvaluationTruth(t1, t2) {
        if (!t1 || !t2) return t1 || t2;
        return {
            frequency: t1.frequency * t2.frequency,
            confidence: t1.confidence * t2.confidence
        };
    }
}