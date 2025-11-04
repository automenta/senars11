import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

export class TemporalDeductionRule extends NALRule {
    constructor() {
        super('temporal-deduction', {
            name: 'Temporal Deduction Rule',
            description: 'Performs temporal deduction: If (a ==> b) and (b ==> c) then (a ==> c) (transitivity)',
            priority: 0.5,
            category: 'temporal'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && ['==>', '<=>'].includes(term.operator) && term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const [firstEvent, secondEvent] = task.term.components;
        const allTasks = RuleUtils.collectTasks(context);
        const temporalTasks = allTasks.filter(t => t.term?.isCompound &&
            ['==>', '<=>'].includes(t.term.operator) &&
            t.term.components?.length === 2);

        const results = [];

        for (const compTask of temporalTasks) {
            const [compFirst, compSecond] = compTask.term.components;

            if (this._unify(secondEvent, compFirst)) {
                const derivedTerm = new Term('compound', 'SEQUENTIAL', [firstEvent, compSecond], task.term.operator);
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type,
                    priority: task.priority * compTask.priority * this.priority
                }));
            }
            else if (this._unify(firstEvent, compSecond)) {
                const derivedTerm = new Term('compound', 'SEQUENTIAL', [compFirst, secondEvent], task.term.operator);
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type,
                    priority: task.priority * compTask.priority * this.priority
                }));
            }
        }

        return results;
    }
}