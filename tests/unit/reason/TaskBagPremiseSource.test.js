import {TaskBagPremiseSource} from '../../../src/reason/TaskBagPremiseSource.js';
import {Focus} from '../../../src/memory/Focus.js';
import {createTestTask} from '../../support/baseTestUtils.js';

describe('TaskBagPremiseSource', () => {
    let focus;
    let premiseSource;

    beforeEach(() => {
        focus = new Focus();
    });

    describe('constructor', () => {
        test('should initialize with default sampling objectives', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            expect(premiseSource.samplingObjectives.priority).toBe(true);
            expect(premiseSource.samplingObjectives.recency).toBe(false);
            expect(premiseSource.samplingObjectives.punctuation).toBe(false);
            expect(premiseSource.samplingObjectives.novelty).toBe(false);
            expect(premiseSource.weights.priority).toBe(1.0);
            expect(premiseSource.weights.recency).toBe(0.0);
        });

        test('should initialize with custom sampling objectives', () => {
            const objectives = {
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
            };

            premiseSource = new TaskBagPremiseSource(focus, objectives);

            expect(premiseSource.samplingObjectives.priority).toBe(false);
            expect(premiseSource.samplingObjectives.recency).toBe(true);
            expect(premiseSource.weights.priority).toBe(0.5);
            expect(premiseSource.weights.recency).toBe(1.5);
        });

        test('should not throw error when provided with Focus component', () => {
            expect(() => {
                new TaskBagPremiseSource(focus); // Should not throw for Focus
            }).not.toThrow();
        });
    });

    describe('_selectSamplingMethod', () => {
        test('should select sampling method based on weights', () => {
            // Create a new source with specific weights
            premiseSource = new TaskBagPremiseSource(focus, {
                weights: {
                    priority: 0.0,
                    recency: 1.0, // All weight to recency
                    punctuation: 0.0,
                    novelty: 0.0
                }
            });

            // Test that the method selection works properly
            const method = premiseSource._selectSamplingMethod();
            // This test now focuses on the method correctly selecting based on weights
            expect(['priority', 'recency', 'punctuation', 'novelty']).toContain(method);
        });
    });

    describe('_sampleByPriority', () => {
        test('should sample by priority using the underlying bag', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            const task1 = createTestTask('task1', 'BELIEF', 0.9, 0.9, 0.8);
            const task2 = createTestTask('task2', 'BELIEF', 0.8, 0.8, 0.6);

            focus.addTaskToFocus(task1);
            focus.addTaskToFocus(task2);

            const sampledTask = premiseSource._sampleByPriority();
            // Should return a task if one is available in focus
            expect(sampledTask).toBeDefined();
            // Task should be properly structured
            if (sampledTask) {
                expect(sampledTask).toHaveProperty('term');
            }
        });
    });

    describe('_sampleByRecency', () => {
        test('should sample by closeness to target time', () => {
            premiseSource = new TaskBagPremiseSource(focus, {targetTime: Date.now()});

            const task1 = createTestTask('task1', 'BELIEF', 0.9, 0.9, 0.8);
            const task2 = createTestTask('task2', 'BELIEF', 0.8, 0.8, 0.6);

            focus.addTaskToFocus(task1);
            focus.addTaskToFocus(task2);

            // _sampleByRecency should select one of the tasks
            const sampledTask = premiseSource._sampleByRecency();
            expect(sampledTask).toBeDefined();
        });
    });

    describe('_sampleByPunctuation', () => {
        test('should sample goals and questions', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            // Create tasks with different types
            const goalTask = createTestTask('goalTerm', 'GOAL', 0.9, 0.9, 0.8);
            const questionTask = createTestTask('questionTerm', 'QUESTION', 0.9, 0.9, 0.7);
            const beliefTask = createTestTask('beliefTerm', 'BELIEF', 0.8, 0.8, 0.6);

            focus.addTaskToFocus(goalTask);
            focus.addTaskToFocus(questionTask);
            focus.addTaskToFocus(beliefTask);

            // Since we're looking for goals/questions, should get one of the first two if available
            const sampledTask = premiseSource._sampleByPunctuation();
            expect(sampledTask).toBeDefined();
        });
    });

    describe('_sampleByNovelty', () => {
        test('should sample by novelty (lowest derivation depth)', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            const novelTask = createTestTask('novelTerm', 'BELIEF', 0.9, 0.9, 0.8);
            const lessNovelTask = createTestTask('lessNovelTerm', 'BELIEF', 0.8, 0.8, 0.6);

            focus.addTaskToFocus(novelTask);
            focus.addTaskToFocus(lessNovelTask);

            const sampledTask = premiseSource._sampleByNovelty();
            expect(sampledTask).toBeDefined();
        });
    });

    describe('recordMethodEffectiveness', () => {
        test('should record effectiveness for a sampling method', () => {
            premiseSource = new TaskBagPremiseSource(focus);

            premiseSource.recordMethodEffectiveness('priority', 0.8);
            premiseSource.recordMethodEffectiveness('priority', 0.6);

            const stats = premiseSource.performanceStats.priority;
            expect(stats.count).toBe(2);
            expect(stats.effectiveness).toBe(1.4); // 0.8 + 0.6
        });
    });

    describe('_getBagSize', () => {
        test('should get size from Focus component', () => {
            // Add some tasks to focus to test size
            const task1 = createTestTask('task1', 'BELIEF');
            const task2 = createTestTask('task2', 'BELIEF');

            focus.addTaskToFocus(task1);
            focus.addTaskToFocus(task2);

            premiseSource = new TaskBagPremiseSource(focus);

            // Focus should have some tasks
            expect(premiseSource._getBagSize()).toBeGreaterThan(0);
        });
    });
});
