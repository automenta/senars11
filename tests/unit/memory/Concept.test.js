import {Concept} from '../../../src/memory/Concept.js';
import {createTask, createTerm} from '../../support/factories.js';

describe('Concept', () => {
    let concept, term;
    beforeEach(() => {
        term = createTerm('A');
        concept = new Concept(term, {priorityDecayRate: 0.9});
    });

    describe('Initialization', () => {
        test('defaults', () => {
            expect(concept).toMatchObject({term, totalTasks: 0, activation: 0, quality: 0, useCount: 0});
            expect(concept.getAllTasks()).toEqual([]);
        });
    });

    describe('Task Management', () => {
        test('add/duplicate/remove', () => {
            const task = createTask({term});

            expect(concept.addTask(task)).toBe(true);
            expect(concept.totalTasks).toBe(1);
            expect(concept.getAllTasks()).toContain(task);

            expect(concept.addTask(task)).toBe(false);
            expect(concept.totalTasks).toBe(1);

            expect(concept.removeTask(task)).toBe(true);
            expect(concept.totalTasks).toBe(0);
        });

        test('getTasksByType', () => {
            const [belief, goal] = [
                createTask({term, punctuation: '.'}),
                createTask({term, punctuation: '!'})
            ];
            [belief, goal].forEach(t => concept.addTask(t));
            expect(concept.getTasksByType('BELIEF')).toEqual([belief]);
            expect(concept.getTasksByType('GOAL')).toEqual([goal]);
        });
    });

    describe('Properties', () => {
        test.each([
            ['boostActivation clamped', c => { c.boostActivation(0.5); c.boostActivation(0.6); }, c => c.activation, 1],
            ['applyDecay', c => { c.boostActivation(1); c.applyDecay(0.2); }, c => c.activation, 0.8],
            ['updateQuality', c => { c.updateQuality(0.5); c.updateQuality(-0.2); }, c => c.quality, 0.3],
            ['incrementUseCount', c => c.incrementUseCount(), c => c.useCount, 1],
        ])('%s', (_, action, selector, expected) => {
            action(concept);
            expect(selector(concept)).toBeCloseTo(expected);
        });

        test('averagePriority', () => {
            [createTask({term, budget: {priority: 0.8}}), createTask({term, budget: {priority: 0.6}})]
                .forEach(t => concept.addTask(t));
            expect(concept.averagePriority).toBeCloseTo(0.8); // Second task suppressed
        });
    });
});
