import {Rule} from '../../engine/Rule.js';
import {TruthFunctions} from '../TruthFunctions.js';
import {Task, TaskType} from '../../core/Task.js';
import {Stamp} from '../../core/Stamp.js';

export class AnalogyRule extends Rule {
    constructor() { super('Analogy'); }

    apply(task, belief, {termFactory}) {
        if (task.type !== TaskType.BELIEF || belief.type !== TaskType.BELIEF) return [];
        const t1 = task.term, t2 = belief.term;

        let inh = null, equ = null;
        let inhTruth = null, equTruth = null;

        if (t1.operator === '-->' && t2.operator === '<->') {
            inh = t1; equ = t2;
            inhTruth = task.truth; equTruth = belief.truth;
        } else if (t2.operator === '-->' && t1.operator === '<->') {
            inh = t2; equ = t1;
            inhTruth = belief.truth; equTruth = task.truth;
        } else {
            return [];
        }

        // Match: A in A->B and A<->C
        const A = inh.components[0];
        const B = inh.components[1];

        let C = null;
        if (equ.components[0].equals(A)) C = equ.components[1];
        else if (equ.components[1].equals(A)) C = equ.components[0];

        if (C) {
            const term = termFactory.create({operator: '-->', components: [C, B]});
            const truth = TruthFunctions.analogy(inhTruth, equTruth);
            const stamp = Stamp.merge([task.stamp, belief.stamp]);
            return [new Task(term, TaskType.BELIEF, truth, stamp)];
        }
        return [];
    }
}
