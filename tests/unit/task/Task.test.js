import {Task} from '../../../src/task/Task.js';
import {Stamp} from '../../../src/Stamp.js';
import {createTask, createTerm, createTruth, TEST_CONSTANTS} from '../../support/factories.js';
import {taskAssertions, testImmutability} from '../../support/testOrganizer.js';
import {TestSuiteFactory} from '../../support/testSuiteFactory.js';

// Use the TestSuiteFactory to create a comprehensive Task test suite
TestSuiteFactory.createTaskRelatedSuite({
    className: 'Task',
    Constructor: Task,
    validInput: {term: createTerm('A'), truth: createTruth()},
    testAssertions: true,
    assertionUtils: taskAssertions
});

describe('Task - Additional Specific Tests', () => {
    let term;

    beforeEach(() => {
        term = createTerm('A');
    });

    describe('Initialization', () => {
        test('creates with defaults', () => {
            const task = new Task({term, truth: {frequency: 0.9, confidence: 0.8}});

            expect(task.term).toBe(term);
            expect(task.type).toBe('BELIEF');
            expect(task.truth).toBeDefined();
            expect(task.budget).toEqual(TEST_CONSTANTS.BUDGET.DEFAULT);
            expect(task.stamp).toBeInstanceOf(Stamp);
        });

        test('creates with custom properties', () => {
            const truth = createTruth();
            const budget = TEST_CONSTANTS.BUDGET.HIGH;
            const task = new Task({term, punctuation: '!', truth, budget});

            expect(task.type).toBe('GOAL');
            expect(task.truth).toEqual(truth);
            expect(task.budget).toEqual(budget);
        });

        test('throws for invalid term', () => {
            expect(() => new Task({term: 'not-a-term'})).toThrow('Task must be initialized with a valid Term object.');
        });
    });

    test('enforces immutability', () => {
        const task = createTask({term});
        testImmutability(task, {type: 'GOAL'});
    });

    test('clones with modifications', () => {
        const task1 = createTask({term});
        const newTruth = createTruth(0.9, 0.9);
        // Clone to question - need to reset truth to null as questions can't have truth values
        const task2 = task1.clone({punctuation: '?', truth: null});

        expect(task1.type).toBe('BELIEF');
        expect(task1.truth).toEqual(createTruth());
        expect(task2.type).toBe('QUESTION');
        expect(task2.truth).toBeNull();
        expect(task2.term).toBe(task1.term);
    });

    test.each([
        {punctuation: '.', method: 'isBelief', expected: true},
        {punctuation: '.', method: 'isGoal', expected: false},
        {punctuation: '!', method: 'isGoal', expected: true},
        {punctuation: '?', method: 'isQuestion', expected: true},
    ])('identifies types correctly for punctuation "$punctuation"', ({punctuation, method, expected}) => {
        const task = createTask({term, punctuation});
        expect(task[method]()).toBe(expected);
    });

    test.each([
        {
            name: 'equal tasks',
            getOther: (t) => createTask({term: t, punctuation: '.', truth: createTruth(0.9, 0.9)}),
            expected: true
        },
        {
            name: 'different truth',
            getOther: (t) => createTask({term: t, punctuation: '.', truth: createTruth(0.8, 0.8)}),
            expected: false
        },
        {
            name: 'different term',
            getOther: (t) => createTask({term: createTerm('B'), punctuation: '.', truth: createTruth(0.9, 0.9)}),
            expected: false
        },
        {
            name: 'different punctuation',
            getOther: (t) => createTask({term: t, punctuation: '!', truth: createTruth(0.9, 0.9)}),
            expected: false
        },
        {name: 'null', getOther: (t) => null, expected: false},
    ])('compares equality correctly when other is $name', ({getOther, expected}) => {
        const task = createTask({term, punctuation: '.', truth: createTruth(0.9, 0.9)});
        const other = getOther(term);
        expect(task.equals(other)).toBe(expected);
    });

    test('stringifies correctly', () => {
        const truth = createTruth();
        const task = createTask({term, punctuation: '.', truth});
        expect(task.toString()).toBe('A. %0.90;0.80%');
    });

    describe('Task Assertions', () => {
        test('task type assertions work correctly', () => {
            const belief = createTask({term, punctuation: '.'});
            const goal = createTask({term, punctuation: '!'});
            const question = createTask({term, punctuation: '?'});

            taskAssertions.expectTaskType(belief, 'BELIEF');
            taskAssertions.expectTaskType(goal, 'GOAL');
            taskAssertions.expectTaskType(question, 'QUESTION');
        });

        test('task punctuation assertions work correctly', () => {
            const belief = createTask({term, punctuation: '.'});
            const goal = createTask({term, punctuation: '!'});
            const question = createTask({term, punctuation: '?'});

            taskAssertions.expectTaskPunctuation(belief, '.');
            taskAssertions.expectTaskPunctuation(goal, '!');
            taskAssertions.expectTaskPunctuation(question, '?');
        });

        test('findTaskByTerm utility works correctly', () => {
            const tasks = [
                createTask({term: createTerm('apple')}),
                createTask({term: createTerm('banana')}),
                createTask({term: createTerm('cherry')})
            ];

            const foundTask = taskAssertions.findTaskByTerm(tasks, 'apple');
            expect(foundTask).toBeDefined();
            expect(foundTask.term.name).toBe('apple');
        });
    });
});
