/**
 * Testing utilities for the reasoner components
 */

/**
 * Create a test task for testing
 * @param {object} overrides - Properties to override in the test task
 * @returns {object} Test task object
 */
export function createTestTask(overrides = {}) {
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
      internalTasks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
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
    peek: () => internalTasks[0] ?? null
  };
}

/**
 * Create a test memory object for testing
 * @param {object} options - Configuration options
 * @returns {object} Test memory object
 */
export function createTestMemory(options = {}) {
  const taskBag = options.taskBag ?? createTestTaskBag(options.tasks ?? []);
  
  return {
    taskBag,
    addTask: (task) => taskBag.add(task),
    getTask: () => taskBag.take(),
    getAllTasks: () => taskBag.getAll(),
    ...options.additionalMethods
  };
}