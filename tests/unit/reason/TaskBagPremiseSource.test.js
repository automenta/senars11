import {TaskBagPremiseSource} from '../../../src/reason/TaskBagPremiseSource.js';
import {Focus} from '../../../src/memory/Focus.js';
import {createTestTask} from '../../support/baseTestUtils.js';

describe('TaskBagPremiseSource', () => {
    let focus, premiseSource;

    beforeEach(() => {
        focus = new Focus();
    });

    describe('constructor', () => {
        test('should initialize with default sampling objectives', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            expect(premiseSource.samplingObjectives).toMatchObject({
                priority: true,
                recency: false,
                punctuation: false,
                novelty: false
            });
            expect(premiseSource.weights).toMatchObject({priority: 1.0, recency: 0.0});
        });

        test('should initialize with custom sampling objectives', () => {
            premiseSource = new TaskBagPremiseSource(focus, {
                priority: false,
                recency: true,
                punctuation: true,
                novelty: true,
                weights: {
                    priority: 0.5,
                    recency: 1.5,
                    punctuation: 1.0,
                    novelty: 0.8
                }
            });

            expect(premiseSource.samplingObjectives).toMatchObject({priority: false, recency: true});
            expect(premiseSource.weights).toMatchObject({priority: 0.5, recency: 1.5});
        });

        test('should not throw error when provided with Focus component', () => {
            expect(() => new TaskBagPremiseSource(focus)).not.toThrow();
        });
    });

    describe('_selectSamplingMethod', () => {
        test('should select sampling method based on weights', () => {
            premiseSource = new TaskBagPremiseSource(focus, {
                weights: {priority: 0.0, recency: 1.0, punctuation: 0.0, novelty: 0.0}
            });
            expect(['priority', 'recency', 'punctuation', 'novelty']).toContain(premiseSource._selectSamplingMethod());
        });
    });

    describe('_sampleByPriority', () => {
        test('should sample by priority using the underlying bag', () => {
            premiseSource = new TaskBagPremiseSource(focus);
            [
                createTestTask('task1', 'BELIEF', 0.9, 0.9, 0.8),
                createTestTask('task2', 'BELIEF', 0.8, 0.8, 0.6)
            ].forEach(t => focus.addTaskToFocus(t));

            expect(premiseSource._sampleByPriority()).toHaveProperty('term');
        });
    });

    describe('_sampleByRecency', () => {
        test('should sample by closeness to target time', () => {
            premiseSource = new TaskBagPremiseSource(focus, {targetTime: Date.now()});
            [
                createTestTask('task1', 'BELIEF', 0.9, 0.9, 0.8),
                createTestTask('task2', 'BELIEF', 0.8, 0.8, 0.6)
            ].forEach(t => focus.addTaskToFocus(t));

            expect(premiseSource._sampleByRecency()).toBeDefined();
        });
    });

    describe('_sampleByPunctuation', () => {
        test('should sample goals and questions', () => {
            premiseSource = new TaskBagPremiseSource(focus);
            [
                createTestTask('goalTerm', 'GOAL', 0.9, 0.9, 0.8),
                createTestTask('questionTerm', 'QUESTION', 0.9, 0.9, 0.7),
                createTestTask('beliefTerm', 'BELIEF', 0.8, 0.8, 0.6)
            ].forEach(t => focus.addTaskToFocus(t));

            expect(premiseSource._sampleByPunctuation()).toBeDefined();
        });
    });

    describe('_sampleByNovelty', () => {
        test('should sample by novelty (lowest derivation depth)', () => {
            premiseSource = new TaskBagPremiseSource(focus);
            [
                createTestTask('novelTerm', 'BELIEF', 0.9, 0.9, 0.8),
                createTestTask('lessNovelTerm', 'BELIEF', 0.8, 0.8, 0.6)
            ].forEach(t => focus.addTaskToFocus(t));

            expect(premiseSource._sampleByNovelty()).toBeDefined();
        });
    });

    describe('recordMethodEffectiveness', () => {
        test('should record effectiveness for a sampling method', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            premiseSource.recordMethodEffectiveness('priority', 0.8);
            premiseSource.recordMethodEffectiveness('priority', 0.6);

            const stats = premiseSource.performanceStats.priority;
            expect(stats.count).toBe(2);
            expect(stats.effectiveness).toBe(1.4);
        });
    });

    describe('_getBagSize', () => {
        test('should get size from Focus component', () => {
            [
                createTestTask('task1', 'BELIEF'),
                createTestTask('task2', 'BELIEF')
            ].forEach(t => focus.addTaskToFocus(t));

            expect(new TaskBagPremiseSource(focus)._getBagSize()).toBeGreaterThan(0);
        });
    });
});
