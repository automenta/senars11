import {SyllogisticRule} from '../logic/rules/SyllogisticRule.js';
import {AnalogyRule} from '../logic/rules/AnalogyRule.js';
import {TermFactory} from '../core/TermFactory.js';
import {Task, TaskType} from '../core/Task.js';
import {Truth} from '../core/Truth.js';

describe('Expanded Logic Rules', () => {
    let termFactory;
    let context;
    let syllogistic;
    let analogy;

    beforeEach(() => {
        termFactory = new TermFactory();
        context = {termFactory};
        syllogistic = new SyllogisticRule();
        analogy = new AnalogyRule();
    });

    test('Induction: A->B, A->C |- B->C', () => {
        const A = termFactory.create('A');
        const B = termFactory.create('B');
        const C = termFactory.create('C');

        const t1 = termFactory.create({operator: '-->', components: [A, B]});
        const t2 = termFactory.create({operator: '-->', components: [A, C]});

        const task = new Task(t1, TaskType.BELIEF, Truth.TRUE);
        const belief = new Task(t2, TaskType.BELIEF, Truth.TRUE);

        const results = syllogistic.apply(task, belief, context);
        expect(results.length).toBe(1);
        expect(results[0].term.name).toBe('(B --> C)');
    });

    test('Abduction: A->C, B->C |- A->B', () => {
        const A = termFactory.create('A');
        const B = termFactory.create('B');
        const C = termFactory.create('C');

        const t1 = termFactory.create({operator: '-->', components: [A, C]});
        const t2 = termFactory.create({operator: '-->', components: [B, C]});

        const task = new Task(t1, TaskType.BELIEF, Truth.TRUE);
        const belief = new Task(t2, TaskType.BELIEF, Truth.TRUE);

        const results = syllogistic.apply(task, belief, context);
        expect(results.length).toBe(2); // Abduction + Comparison

        const abd = results.find(r => r.term.operator === '-->');
        expect(abd.term.name).toBe('(A --> B)');
    });

    test('Analogy: A->B, A<->C |- C->B', () => {
        const A = termFactory.create('A');
        const B = termFactory.create('B');
        const C = termFactory.create('C');

        const t1 = termFactory.create({operator: '-->', components: [A, B]});
        const t2 = termFactory.create({operator: '<->', components: [A, C]});

        const task = new Task(t1, TaskType.BELIEF, Truth.TRUE);
        const belief = new Task(t2, TaskType.BELIEF, Truth.TRUE);

        const results = analogy.apply(task, belief, context);
        expect(results.length).toBe(1);
        expect(results[0].term.name).toBe('(C --> B)');
    });
});
