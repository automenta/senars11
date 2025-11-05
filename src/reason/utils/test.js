/**
 * Testing utilities for the reasoner components
 */

/**
 * Create a mock task for testing
 * @param {object} overrides - Properties to override in the mock task
 * @returns {object} Mock task object
 */
export function createMockTask(overrides = {}) {
  const defaultTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    term: {
      toString: () => 'defaultTerm',
      ...overrides.term
    },
    type: 'belief',
    sentence: {
      punctuation: '.',
      ...overrides.sentence
    },
    stamp: {
      creationTime: Date.now(),
      depth: 0,
      id: `stamp_${Date.now()}`,
      ...overrides.stamp
    },
    priority: 0.5,
    ...overrides
  };
  
  return defaultTask;
}

/**
 * Create a mock strategy for testing
 * @param {Array} premisePairs - Array of premise pairs to yield
 * @returns {object} Mock strategy object
 */
export function createMockStrategy(premisePairs = []) {
  return {
    generatePremisePairs: async function* (premiseStream) {
      for await (const primary of premiseStream) {
        if (premisePairs.length > 0) {
          for (const pair of premisePairs) {
            yield pair;
          }
        } else {
          // Default: pair each premise with itself
          yield [primary, primary];
        }
      }
    },
    // Add other methods as needed
    ...arguments[1] || {}
  };
}

/**
 * Create a mock rule executor for testing
 * @param {Array} candidateRules - Rules to return as candidates
 * @param {Array} executionResults - Results to return from rule execution
 * @returns {object} Mock rule executor object
 */
export function createMockRuleExecutor(candidateRules = [], executionResults = []) {
  return {
    getCandidateRules: () => candidateRules,
    executeRule: () => executionResults,
    register: () => {},
    registerMany: () => {},
    buildOptimizationStructure: () => {},
    getRuleCount: () => candidateRules.length,
    ...arguments[2] || {}
  };
}

/**
 * Create a mock rule processor for testing
 * @param {Array} processingResults - Results to return from processing
 * @returns {object} Mock rule processor object
 */
export function createMockRuleProcessor(processingResults = []) {
  return {
    process: async function* (premisePairStream) {
      for await (const pair of premisePairStream) {
        for (const result of processingResults) {
          yield result;
        }
      }
    },
    getStats: () => ({ syncRuleExecutions: 0, asyncRuleExecutions: 0 }),
    getStatus: () => ({}),
    resetStats: () => {}
  };
}

/**
 * Create a mock premise source for testing
 * @param {Array} tasks - Tasks to yield from the source
 * @returns {object} Mock premise source object
 */
export function createMockPremiseSource(tasks = []) {
  return {
    stream: async function* () {
      for (const task of tasks) {
        yield task;
      }
      // To avoid infinite loop in tests, you can either:
      // 1. Stop after yielding all tasks, or
      // 2. Keep yielding the same tasks
      // For now, let's just yield once and stop
    },
    tryGetTask: async () => tasks[0] || null,
    ...arguments[1] || {}
  };
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>} Whether condition was met
 */
export async function waitForCondition(condition, timeout = 2000, interval = 10) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await Promise.resolve(condition())) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Assert that an async generator yields expected values
 * @param {AsyncGenerator} asyncGen - Generator to test
 * @param {Array} expectedValues - Expected values
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>} Whether assertion passed
 */
export async function assertAsyncGenerator(asyncGen, expectedValues, timeout = 1000) {
  const actualValues = [];
  const startTime = Date.now();
  
  try {
    for await (const value of asyncGen) {
      actualValues.push(value);
      if (actualValues.length >= expectedValues.length) {
        break;
      }
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for async generator values`);
      }
    }
  } catch (error) {
    // Ignore errors during iteration, just return what we got
  }
  
  // Simple comparison - might need to be more sophisticated depending on test needs
  return JSON.stringify(actualValues) === JSON.stringify(expectedValues);
}

/**
 * Create a test task bag for testing memory components
 * @param {Array} tasks - Initial tasks for the bag
 * @returns {object} Test task bag
 */
export function createTestTaskBag(tasks = []) {
  let internalTasks = [...tasks];
  
  return {
    get size() {
      return internalTasks.length;
    },
    take: () => {
      if (internalTasks.length > 0) {
        return internalTasks.shift();
      }
      return null;
    },
    add: (task) => {
      internalTasks.push(task);
      // Sort by priority in descending order (higher priority first)
      internalTasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    },
    remove: (task) => {
      const index = internalTasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        internalTasks.splice(index, 1);
      }
    },
    getAll: () => [...internalTasks],
    count: () => internalTasks.length,
    clear: () => { internalTasks = []; },
    peek: () => internalTasks[0] || null
  };
}

/**
 * Create a test memory object for testing
 * @param {object} options - Configuration options
 * @returns {object} Test memory object
 */
export function createTestMemory(options = {}) {
  const taskBag = options.taskBag || createTestTaskBag(options.tasks || []);
  
  return {
    taskBag,
    addTask: (task) => taskBag.add(task),
    getTask: () => taskBag.take(),
    getAllTasks: () => taskBag.getAll(),
    ...options.additionalMethods
  };
}