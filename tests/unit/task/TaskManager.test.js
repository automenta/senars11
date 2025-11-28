// Third-party imports
// (none in this file)

// Local imports
import {TaskManager} from '../../../src/task/TaskManager.js';
import {createTask, createTerm, createTruth, createMemory, createFocus, TEST_CONSTANTS} from '../../support/factories.js';

describe('TaskManager', () => {
    let taskManager;
    let memory;
    let focus;
    let term;
    let config;

    beforeEach(() => {
        term = createTerm('A');
        config = {
            priorityThreshold: 0.6,
            defaultBudget: TEST_CONSTANTS.BUDGET.DEFAULT,
        };
        memory = createMemory(config);
        focus = createFocus();
        taskManager = new TaskManager(memory, focus, config);
    });

    test('should initialize correctly', () => {
        expect(taskManager.pendingTasksCount).toBe(0);
        expect(taskManager.stats.totalTasksCreated).toBe(0);
    });

    test('should add a task to pending queue', () => {
        const task = createTask({term, truth: createTruth(0.9, 0.8)});
        taskManager.addTask(task);
        expect(taskManager.pendingTasksCount).toBe(1);
        expect(taskManager.getPendingTasks()).toContain(task);
    });

    test('should process pending tasks', () => {
        const [highPriorityTask, lowPriorityTask] = [
            createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH}),
            createTask({
                term: createTerm('B'),
                budget: TEST_CONSTANTS.BUDGET.LOW
            })
        ];

        taskManager.addTask(highPriorityTask);
        taskManager.addTask(lowPriorityTask);

        const processedTasks = taskManager.processPendingTasks();
        expect(taskManager.pendingTasksCount).toBe(0);
        expect(processedTasks).toHaveLength(2);
        expect(memory.getConcept(term).totalTasks).toBe(1);
    });

    test('should create belief, goal, and question tasks', () => {
        const [belief, goal, question] = [
            taskManager.createBelief(term, createTruth(0.9, 0.8)),
            taskManager.createGoal(term),
            taskManager.createQuestion(term)
        ];

        expect(belief.type).toBe('BELIEF');
        expect(goal.type).toBe('GOAL');
        expect(question.type).toBe('QUESTION');
    });

    test('should find tasks by term', () => {
        const task = createTask({term, truth: createTruth(0.9, 0.8)});
        taskManager.addTask(task);
        taskManager.processPendingTasks();
        const foundTasks = taskManager.findTasksByTerm(term);
        expect(foundTasks).toHaveLength(1);
        expect(foundTasks[0].term).toEqual(term);
    });

    test('should get highest priority tasks correctly', () => {
        const [task1, task2] = [
            createTask({term, budget: TEST_CONSTANTS.BUDGET.MEDIUM}),
            createTask({
                term: createTerm('B'),
                budget: TEST_CONSTANTS.BUDGET.HIGH
            })
        ];

        taskManager.addTask(task1);
        taskManager.addTask(task2);
        taskManager.processPendingTasks();

        const highestPriorityTasks = taskManager.getHighestPriorityTasks(2);
        expect(highestPriorityTasks).toHaveLength(2);
        expect(highestPriorityTasks[0].budget.priority).toBe(TEST_CONSTANTS.BUDGET.HIGH.priority);
        expect(highestPriorityTasks[1].budget.priority).toBe(TEST_CONSTANTS.BUDGET.MEDIUM.priority);
    });

    test('should update task priority correctly', () => {
        const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.DEFAULT});
        taskManager.addTask(task);
        taskManager.processPendingTasks();

        const updated = taskManager.updateTaskPriority(task, 0.9);
        expect(updated).toBe(true);
        const concept = memory.getConcept(term);
        expect(concept.getTask(task.stamp.id).budget.priority).toBe(0.9);
    });
});