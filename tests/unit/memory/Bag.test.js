import {Bag} from '../../../src/memory/Bag.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Bag', () => {
    let bag, factory, createAtom;

    beforeEach(() => {
        bag = new Bag(10);
        factory = new TermFactory();
        createAtom = (name) => factory.atomic(name);
    });

    describe('Basic', () => {
        test('defaults', () => {
            expect(bag.size).toBe(0);
            expect(bag.maxSize).toBe(10);
        });

        test('add', () => {
            const task = new Task({term: createAtom('A'), truth: {frequency: 0.9, confidence: 0.8}});
            expect(bag.add(task)).toBe(true);
            expect(bag.size).toBe(1);
        });

        test('duplicate add -> fail', () => {
            const task = new Task({term: createAtom('A'), truth: {frequency: 0.9, confidence: 0.8}});
            bag.add(task);
            expect(bag.add(task)).toBe(false);
            expect(bag.size).toBe(1);
        });

        test('remove', () => {
            const task = new Task({term: createAtom('A'), truth: {frequency: 0.9, confidence: 0.8}});
            bag.add(task);
            expect(bag.remove(task)).toBe(true);
            expect(bag.size).toBe(0);
        });
    });

    describe('Priority', () => {
        let t1, t2;

        beforeEach(() => {
            t1 = new Task({term: createAtom('A'), budget: {priority: 0.5}, truth: {frequency: 0.9, confidence: 0.8}});
            t2 = new Task({term: createAtom('B'), budget: {priority: 0.8}, truth: {frequency: 0.9, confidence: 0.8}});
            bag.add(t1);
            bag.add(t2);
        });

        test('peek', () => {
            expect(bag.peek()).toBe(t2);
        });

        test('getItemsInPriorityOrder', () => {
            expect(bag.getItemsInPriorityOrder()).toEqual([t2, t1]);
        });

        test('applyDecay', () => {
            bag.applyDecay(0.5);
            const items = bag.getItemsInPriorityOrder();
            expect(bag.getPriority(items[0])).toBe(0.4);
            expect(bag.getPriority(items[1])).toBe(0.25);
        });
    });
});
