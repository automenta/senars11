import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

export class ExemplificationRule extends NALRule {
    constructor() {
        super('exemplification', {
            name: 'Exemplification Rule',
            description: 'Exemplification: If <a --> b> and <b --> c> then <c --> a>',
            priority: 0.3,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '-->' && term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const [a, b] = task.term.components;
        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = allTasks.filter(t =>
            t.term?.isCompound &&
            t.term.operator === '-->' &&
            t.term.components?.length === 2
        );

        const results = [];

        for (const otherTask of inheritanceTasks) {
            const [b2, c] = otherTask.components || otherTask.term.components;

            if (this._unify(b, b2)) {
                const exemplificationTerm = new Term(
                    'compound',
                    `(${c.name} --> ${a.name})`,
                    [c, a],
                    '-->'
                );

                const derivedTruth = this._calculateExemplificationTruth(task.truth, otherTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: exemplificationTerm,
                    truth: derivedTruth,
                    type: 'BELIEF',
                    priority: task.priority * otherTask.priority * this.priority
                }));
            }
        }

        return results;
    }

    _calculateExemplificationTruth(t1, t2) {
        if (!t1 || !t2) return t1 || t2;

        const frequency = Math.max(t1.frequency, t2.frequency) * 0.8;
        const confidence = t1.confidence * t2.confidence * 0.3;

        return {frequency, confidence};
    }
}