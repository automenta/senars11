import {PatternNALRule} from './PatternNALRule.js';
import {RuleUtils} from './RuleUtils.js';

export class DeductionRule extends PatternNALRule {
    constructor() {
        super('deduction', {
            name: 'Deduction Rule',
            description: 'Performs deductive inference: If (a ==> b) and a then b',
            priority: 0.9,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        const {term} = task ?? {};
        return term?.isCompound && term.operator === '==>' && term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const [subject, predicate] = task.term.components;
        const complementaryTasks = RuleUtils.findTasksByTerm(subject, context, this._unify.bind(this));

        return complementaryTasks
            .map(compTask => {
                const bindings = this._unify(subject, compTask.term);
                return bindings 
                    ? this._createDerivedTask(task, {
                        term: predicate,
                        truth: this._calculateTruth(task.truth, compTask.truth),
                        type: compTask.type,
                        priority: task.priority * compTask.priority * this.priority
                    })
                    : null;
            })
            .filter(Boolean);
    }
}