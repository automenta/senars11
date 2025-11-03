import {OptimizedCycle} from '../../../src/nar/OptimizedCycle.js';
import {Memory} from '../../../src/memory/Memory.js';
import {Focus} from '../../../src/memory/Focus.js';
import {TaskManager} from '../../../src/task/TaskManager.js';
import {Task} from '../../../src/task/Task.js';
import {RuleEngine} from '../../../src/reasoning/RuleEngine.js';
import {TermFactory} from '../../../src/term/TermFactory.js';
import {NaiveExhaustiveStrategy} from '../../../src/reasoning/NaiveExhaustiveStrategy.js';

describe('OptimizedCycle - Direct Integration Tests', () => {
    let cycle, memory, focus, ruleEngine, taskManager, termFactory, reasoningStrategy;

    beforeEach(() => {
        memory = new Memory({capacity: 1000});
        focus = new Focus({size: 10});
        ruleEngine = new RuleEngine();
        taskManager = new TaskManager(memory, focus, {});
        termFactory = new TermFactory();
        reasoningStrategy = new NaiveExhaustiveStrategy({});

        cycle = new OptimizedCycle({
            memory,
            focus,
            ruleEngine,
            taskManager,
            config: {
                focusTaskLimit: 10,
                priorityThreshold: 0.5,
                maxTaskCacheSize: 1000,
                maxInferenceCacheSize: 500,
                batchProcessingEnabled: true,
                maxBatchSize: 50
            },
            reasoningStrategy,
            termFactory,
            nar: null
        });
    });

    afterEach(async () => {
        if (cycle && cycle.dispose) {
            await cycle.dispose();
        }
    });

    test('should initialize with correct configuration', () => {
        expect(cycle).toBeDefined();
        expect(cycle.cycleCount).toBe(0);
        expect(cycle.isRunning).toBe(false);
        expect(cycle._maxTaskCacheSize).toBe(1000);
        expect(cycle._maxInferenceCacheSize).toBe(500);
        expect(cycle._batchProcessingEnabled).toBe(true);
    });

    test('should execute a cycle without errors', async () => {
        // Create a simple task to process
        const term = termFactory.create('cat');
        const task = new Task({
            term,
            punctuation: '.',
            truth: {frequency: 0.9, confidence: 0.8},
            priority: 0.8,
            budget: {priority: 0.8, durability: 0.5},
            stamp: {id: Date.now()}
        });

        taskManager.addTask(task);

        // Execute the cycle
        const result = await cycle.execute();

        expect(result).toBeDefined();
        expect(result.cycleNumber).toBe(1);
        expect(result.cycleTime).toBeGreaterThanOrEqual(0);
        expect(result.memoryStats).toBeDefined();
    });

    test('should process tasks and update statistics', async () => {
        // Create and add multiple tasks
        for (let i = 0; i < 5; i++) {
            const term = termFactory.create(`object${i}`);
            const task = new Task({
                term,
                punctuation: '.',
                truth: {frequency: 0.8, confidence: 0.7},
                priority: 0.7,
                budget: {priority: 0.7, durability: 0.4},
                stamp: {id: Date.now() + i}
            });
            taskManager.addTask(task);
        }

        // Execute multiple cycles
        const results = [];
        for (let i = 0; i < 3; i++) {
            results.push(await cycle.execute());
        }

        // Verify statistics are updated
        expect(cycle.cycleCount).toBe(3);
        expect(cycle.stats.totalCycles).toBe(3);
        expect(cycle.stats.totalTasksProcessed).toBeGreaterThanOrEqual(0);
        expect(cycle.stats.averageCycleTime).toBeGreaterThanOrEqual(0);
    });

    test('should cache tasks for performance', async () => {
        const term = termFactory.create('cached-test');
        const task = new Task({
            term,
            punctuation: '.',
            truth: {frequency: 0.9, confidence: 0.8},
            priority: 0.8,
            budget: {priority: 0.8, durability: 0.5},
            stamp: {id: 'cache-test'}
        });
        taskManager.addTask(task);

        // Execute once to populate cache
        await cycle.execute();

        // Check if tasks were cached
        expect(cycle._taskCache.get('cacheKey')).toBeDefined();

        const cachedData = cycle._taskCache.get('cacheKey');
        expect(cachedData).toBeDefined();
        expect(cachedData.tasks).toBeDefined();
        expect(Array.isArray(cachedData.tasks)).toBe(true);
    });

    test('should filter tasks by budget constraints', () => {
        // Create tasks with different budget constraints
        const taskWithCycles = new Task({
            term: termFactory.create('test1'),
            punctuation: '.',
            truth: {frequency: 0.8, confidence: 0.7},
            budget: {cycles: 1, depth: 2}
        });

        const taskWithoutBudget = new Task({
            term: termFactory.create('test2'),
            punctuation: '.',
            truth: {frequency: 0.9, confidence: 0.8}
        });

        const taskExhaustedCycles = new Task({
            term: termFactory.create('test3'),
            punctuation: '.',
            truth: {frequency: 0.7, confidence: 0.6},
            budget: {cycles: 0, depth: 1}
        });

        const tasks = [taskWithCycles, taskWithoutBudget, taskExhaustedCycles];
        const filtered = cycle._filterTasksByBudget(tasks);

        // Should include tasks with cycles > 0 and those without budget
        expect(filtered.length).toBe(2);
        expect(filtered).toContain(taskWithCycles);
        expect(filtered).toContain(taskWithoutBudget);
        expect(filtered).not.toContain(taskExhaustedCycles);
    });

    test('should apply budget constraints correctly', () => {
        const inferenceWithBudget = new Task({
            term: termFactory.create('inference'),
            punctuation: '.',
            truth: {frequency: 0.8, confidence: 0.7},
            budget: {
                priority: 0.8,
                durability: 0.5,
                cycles: 5,
                depth: 3
            }
        });

        const inferences = [inferenceWithBudget];
        const result = cycle._applyBudgetConstraints(inferences);

        expect(result[0].budget.cycles).toBe(4); // Should be decremented by 1
        expect(result[0].budget.depth).toBe(2);  // Should be decremented by 1
    });

    test('should maintain performance metrics', async () => {
        const term = termFactory.create('metrics-test');
        const task = new Task({
            term,
            punctuation: '.',
            truth: {frequency: 0.9, confidence: 0.8},
            priority: 0.8,
            budget: {priority: 0.8, durability: 0.5},
            stamp: {id: 'metrics-test'}
        });
        taskManager.addTask(task);

        await cycle.execute();

        const metrics = cycle.getPerformanceMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.cycleCount).toBe(1);
        expect(metrics.totalTasksProcessed).toBeGreaterThanOrEqual(0);
        expect(metrics.cacheSize.taskCache).toBeGreaterThanOrEqual(0);
        expect(metrics.cacheSize.inferenceCache).toBeGreaterThanOrEqual(0);
    });

    test('should get performance insights', async () => {
        for (let i = 0; i < 5; i++) {
            const term = termFactory.create(`insight-test-${i}`);
            const task = new Task({
                term,
                punctuation: '.',
                truth: {frequency: 0.9, confidence: 0.8},
                priority: 0.8,
                budget: {priority: 0.8, durability: 0.5},
                stamp: {id: `insight-test-${i}`}
            });
            taskManager.addTask(task);
            await cycle.execute();
        }

        const insights = cycle.getPerformanceInsights();
        expect(insights).toBeDefined();
        expect(insights.averageProcessingTime).toBeDefined();
    });

    test('should reset properly', async () => {
        const term = termFactory.create('reset-test');
        const task = new Task({
            term,
            punctuation: '.',
            truth: {frequency: 0.9, confidence: 0.8},
            priority: 0.8,
            budget: {priority: 0.8, durability: 0.5},
            stamp: {id: 'reset-test'}
        });
        taskManager.addTask(task);

        await cycle.execute();
        expect(cycle.cycleCount).toBe(1);

        cycle.reset();
        expect(cycle.cycleCount).toBe(0);
        expect(cycle.isRunning).toBe(false);
        expect(cycle._taskCache.size).toBe(0);
        expect(cycle._inferenceCache.size).toBe(0);
    });

    test('should serialize and deserialize', async () => {
        const config = {test: true};
        cycle._config = config;
        cycle._cycleCount = 5;

        const serialized = cycle.serialize();
        expect(serialized).toBeDefined();
        expect(serialized.cycleCount).toBe(5);
        expect(serialized.config).toEqual(config);
        expect(serialized.version).toBe('2.0.0');

        const result = await cycle.deserialize(serialized);
        expect(result).toBe(true);
    });

    test('should handle execution errors gracefully', async () => {
        // Create a faulty strategy to trigger an error
        const faultyStrategy = {
            execute: () => {
                throw new Error('Test error in strategy');
            }
        };

        const faultyCycle = new OptimizedCycle({
            memory,
            focus,
            ruleEngine,
            taskManager,
            config: {focusTaskLimit: 10},
            reasoningStrategy: faultyStrategy,
            termFactory,
            nar: null
        });

        await expect(faultyCycle.execute()).rejects.toThrow('Test error in strategy');
    });
});