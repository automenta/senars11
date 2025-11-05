import {PatternNALRule} from './PatternNALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

export class ComparisonRule extends PatternNALRule {
    constructor() {
        super('comparison', {
            name: 'Comparison Rule',
            description: 'Performs comparison inference: If (a --> c) and (b --> c) then (a <-> b)',
            priority: 0.6,
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
        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = RuleUtils.filterByInheritance(allTasks);
        const results = [];

        for (const compTask of inheritanceTasks) {
            if (!compTask.term?.isCompound || compTask.term.operator !== '-->' || compTask.term.components?.length !== 2) {
                continue;
            }

            const [compSubject, compPredicate] = compTask.term.components;

            if (this._unify(predicate, compPredicate) && !this._unify(subject, compSubject)) {
                const derivedTerm = new Term('compound', 'SIMILARITY', [subject, compSubject], '<->');
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