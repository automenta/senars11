import {PatternNALRule} from './PatternNALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

export class InductionRule extends PatternNALRule {
    constructor() {
        super('induction', {
            name: 'Induction Rule',
            description: 'Performs inductive inference: If (a --> b) and (b --> a) then (a <-> b)',
            priority: 0.7,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '-->' && term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const [subject, predicate] = task.term.components;
        const inheritanceTasks = RuleUtils.filterByInheritance(RuleUtils.collectTasks(context));

        return inheritanceTasks
            .filter(compTask => {
                const [compSubject, compPredicate] = compTask.term.components;
                return this._unify(compSubject, predicate) && this._unify(compPredicate, subject);
            })
            .map(compTask => {
                const derivedTerm = new Term('compound', 'SIMILARITY', [subject, predicate], '<->');
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);
                
                return this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: 'BELIEF',
                    priority: task.priority * compTask.priority * this.priority
                });
            });
    }
}