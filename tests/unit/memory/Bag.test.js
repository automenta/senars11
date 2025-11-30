import {Bag} from '../../../src/memory/Bag.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

const tf = new TermFactory();
const createAtom = name => tf.atomic(name);
const createTask = (term, priority = 0.5) => new Task({
    term,
    budget: {priority},
    truth: {frequency: 0.9, confidence: 0.8}
});

describe('Bag', () => {
    let bag;
    beforeEach(() => { bag = new Bag(10); });

    describe('Basic Operations', () => {
        test('defaults', () => {
            expect(bag).toMatchObject({size: 0, maxSize: 10});
        });

        test('add/duplicate/remove', () => {
            const task = createTask(createAtom('A'));
            expect(bag.add(task)).toBe(true);
            expect(bag.size).toBe(1);

            expect(bag.add(task)).toBe(false);
            expect(bag.size).toBe(1);

            expect(bag.remove(task)).toBe(true);
            expect(bag.size).toBe(0);
        });
    });

    describe('Priority Management', () => {
        let t1, t2;
        beforeEach(() => {
            [t1, t2] = [createTask(createAtom('A'), 0.5), createTask(createAtom('B'), 0.8)];
            [t1, t2].forEach(t => bag.add(t));
        });

        test('ordering', () => {
            expect(bag.peek()).toBe(t2);
            expect(bag.getItemsInPriorityOrder()).toEqual([t2, t1]);
        });

        test('decay', () => {
            bag.applyDecay(0.5);
            const items = bag.getItemsInPriorityOrder();
            // 0.8 * 0.5 = 0.4
            // 0.5 * 0.5 = 0.25
            expect(bag.getPriority(items[0])).toBe(0.4);
            expect(bag.getPriority(items[1])).toBe(0.25);
        });
    });
});
