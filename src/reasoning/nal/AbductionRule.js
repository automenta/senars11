import {PatternNALRule} from './PatternNALRule.js';
import {RuleUtils} from './RuleUtils.js';

export class AbductionRule extends PatternNALRule {
    constructor() {
        super('abduction', {
            name: 'Abduction Rule',
            description: 'Performs abductive inference: If (a ==> b) and b then a',
            priority: 0.6,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        return (task.term?.isCompound && task.term.operator === '==>' && task.term.components?.length === 2) ||
            (task.term?.isAtomic);
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        if (task.term?.isCompound && task.term.operator === '==>' && task.term.components?.length === 2) {
            return this._deriveFromInheritance(task, context);
        }
        
        if (task.term?.isAtomic) {
            return this._deriveFromSimpleTerm(task, context);
        }

        return [];
    }

    async _deriveFromInheritance(task, context) {
        const [subject, predicate] = task.term.components;
        const complementaryTasks = RuleUtils.findTasksByTerm(predicate, context, this._unify.bind(this));
        const results = [];

        for (const compTask of complementaryTasks) {
            const bindings = this._unify(predicate, compTask.term);
            if (bindings) {
                const derivedTerm = this._substitute(subject, bindings);
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

    async _deriveFromSimpleTerm(task, context) {
        const allTasks = RuleUtils.collectTasks(context);
        const implTask = RuleUtils.filterByInheritance(allTasks);
        const results = [];

        for (const inheritanceTask of implTask) {
            const [, predicate] = inheritanceTask.term.components;
            const bindings = this._unify(predicate, task.term);

            if (bindings) {
                const derivedTerm = this._substitute(inheritanceTask.term.components[0], bindings);
                const derivedTruth = this._calculateTruth(inheritanceTask.truth, task.truth);

                results.push(this._createDerivedTask(inheritanceTask, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: task.type,
                    priority: inheritanceTask.priority * task.priority * this.priority
                }));
            }
        }

        return results;
    }
}