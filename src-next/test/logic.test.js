import {SyllogisticRule} from '../logic/rules/SyllogisticRule.js';
import {TermFactory} from '../core/TermFactory.js';
import {Task, TaskType} from '../core/Task.js';
import {Truth} from '../core/Truth.js';
import {Stamp} from '../core/Stamp.js';

describe('Syllogistic Rule', () => {
    let termFactory;
    let context;
    let rule;

    beforeEach(() => {
        termFactory = new TermFactory();
        context = {termFactory};
        rule = new SyllogisticRule();
    });

    test('Deduction: A->B, B->C |- A->C', () => {
        const A = termFactory.create('A');
        const B = termFactory.create('B');
        const C = termFactory.create('C');

        const t1 = termFactory.create({operator: '-->', components: [A, B]});
        const t2 = termFactory.create({operator: '-->', components: [B, C]});

        const task = new Task(t1, TaskType.BELIEF, new Truth(1.0, 0.9));
        const belief = new Task(t2, TaskType.BELIEF, new Truth(1.0, 0.9));

        const results = rule.apply(task, belief, context);

        expect(results.length).toBe(1);
        expect(results[0].term.name).toBe('(A --> C)');
        expect(results[0].truth.frequency).toBeCloseTo(1.0);
        expect(results[0].truth.confidence).toBeCloseTo(0.81);
    });
});
