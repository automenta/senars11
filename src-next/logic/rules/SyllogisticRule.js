import {Rule} from '../../engine/Rule.js';
import {TruthFunctions} from '../TruthFunctions.js';
import {Task, TaskType} from '../../core/Task.js';
import {Stamp} from '../../core/Stamp.js';

export class SyllogisticRule extends Rule {
    constructor() { super('Syllogistic'); }

    apply(task, belief, {termFactory}) {
        if (!belief) return [];
        if (task.type !== TaskType.BELIEF || belief.type !== TaskType.BELIEF) return [];
        const t1 = task.term, t2 = belief.term;
        if (t1.operator !== '-->' || t2.operator !== '-->') return [];

        const stamp = Stamp.merge([task.stamp, belief.stamp]);
        const results = [];

        // Deduction (A->B, B->C)
        if (t1.components[1].equals(t2.components[0])) {
             results.push(this._deduction(t1, t2, task, belief, termFactory, stamp));
        }
        if (t1.components[0].equals(t2.components[1])) {
             results.push(this._deduction(t2, t1, belief, task, termFactory, stamp));
        }

        // Induction (A->B, A->C)
        if (t1.components[0].equals(t2.components[0])) {
             const r = this._induction(t1, t2, task, belief, termFactory, stamp);
             if(r) results.push(r);
        }

        // Abduction & Comparison (A->C, B->C)
        if (t1.components[1].equals(t2.components[1])) {
             results.push(...this._abductionAndComp(t1, t2, task, belief, termFactory, stamp));
        }

        return results;
    }

    _deduction(t1, t2, task, belief, factory, stamp) {
        const A = t1.components[0], C = t2.components[1];
        const term = factory.create({operator: '-->', components: [A, C]});
        const truth = TruthFunctions.deduction(task.truth, belief.truth);
        return new Task(term, TaskType.BELIEF, truth, stamp);
    }

    _induction(t1, t2, task, belief, factory, stamp) {
        const B = t1.components[1], C = t2.components[1];
        if (B.equals(C)) return null;
        const term = factory.create({operator: '-->', components: [B, C]});
        const truth = TruthFunctions.induction(task.truth, belief.truth);
        return new Task(term, TaskType.BELIEF, truth, stamp);
    }

    _abductionAndComp(t1, t2, task, belief, factory, stamp) {
        const A = t1.components[0], B = t2.components[0];
        if (A.equals(B)) return [];

        const abdTerm = factory.create({operator: '-->', components: [A, B]});
        const abdTruth = TruthFunctions.abduction(task.truth, belief.truth);

        const compTerm = factory.create({operator: '<->', components: [A, B]});
        const compTruth = TruthFunctions.comparison(task.truth, belief.truth);

        return [
            new Task(abdTerm, TaskType.BELIEF, abdTruth, stamp),
            new Task(compTerm, TaskType.BELIEF, compTruth, stamp)
        ];
    }
}
