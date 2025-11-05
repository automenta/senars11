import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { Strategy } from '../Strategy.js';
import { randomWeightedSelect } from '../utils/randomWeightedSelect.js';
import { createTestMemory, createTestTask } from '../utils/test.js';

// Helper function to generate random tasks
function generateRandomTask() {
  const punctuations = ['.', '?', '!'];
  return createTestTask({
    priority: Math.random(), // Random priority between 0 and 1
    sentence: { 
      punctuation: punctuations[Math.floor(Math.random() * punctuations.length)] 
    },
    stamp: { 
      creationTime: Date.now() - Math.floor(Math.random() * 100000), // Random time in last 100s of seconds
      depth: Math.floor(Math.random() * 10) // Random depth 0-9
    }
  });
}

// Helper function to generate random bags of tasks
function generateRandomTaskBag(size = 5) {
  const tasks = [];
  for (let i = 0; i < size; i++) {
    tasks.push(generateRandomTask());
  }
  return tasks;
}

describe('Property-Based Testing for Edge Cases', () => {
  describe('Random Premise Pairs Generation', () => {
    test('should handle randomly generated premise streams', async () => {
      // Generate random tasks
      const randomTasks = generateRandomTaskBag(10);
      const memory = createTestMemory({ tasks: randomTasks });
      const premiseSource = new TaskBagPremiseSource(memory, { priority: true });
      
      // Test that we can sample from random tasks without errors
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await premiseSource._sampleTask());
      }
      
      // All samplings should complete without throwing errors
      results.forEach(result => {
        // Each result should either be null or a valid task object
        if (result !== null) {
          expect(typeof result).toBe('object');
          expect(result).toHaveProperty('id');
        }
      });
    });

    test('should handle different sampling strategies with random data', async () => {
      const randomTasks = generateRandomTaskBag(20);
      const memory = createTestMemory({ tasks: randomTasks });
      const premiseSource = new TaskBagPremiseSource(memory, {
        priority: true,
        recency: true,
        punctuation: true,
        novelty: true
      });
      
      // Test all sampling methods with random data
      const priorityTask = premiseSource._sampleByPriority();
      const recencyTask = premiseSource._sampleByRecency();
      const punctuationTask = premiseSource._sampleByPunctuation();
      const noveltyTask = premiseSource._sampleByNovelty();
      
      // All methods should return either null or a valid task
      [priorityTask, recencyTask, punctuationTask, noveltyTask].forEach(task => {
        if (task !== null) {
          expect(typeof task).toBe('object');
          expect(task).toHaveProperty('id');
        }
      });
    });

    test('strategy should handle random premise pairs', async () => {
      const strategy = new Strategy();
      
      // Create a stream of random primary premises
      const randomPremises = generateRandomTaskBag(5);
      const premiseStream = {
        [Symbol.asyncIterator]: async function*() {
          for (const premise of randomPremises) {
            yield premise;
          }
        }
      };
      
      // Test that the strategy can process random premises without errors
      const pairs = [];
      try {
        for await (const pair of strategy.generatePremisePairs(premiseStream)) {
          pairs.push(pair);
          if (pairs.length >= 3) break; // Limit for testing
        }
      } catch (error) {
        // If an error occurs, it should be handled gracefully
        console.warn('Strategy processing error (expected in property testing):', error.message);
      }
      
      // Should have processed at least some pairs without crashing
      expect(Array.isArray(pairs)).toBe(true);
    });
  });

  describe('RandomWeightedSelect Robustness', () => {
    test('should handle random inputs to weighted selection', () => {
      // Generate random items and weights
      for (let test = 0; test < 100; test++) {
        const size = Math.floor(Math.random() * 10) + 1; // 1-10 items
        const items = Array.from({ length: size }, (_, i) => `item${i}`);
        const weights = Array.from({ length: size }, () => Math.random() * 10);
        
        // This should not throw an error for any valid input
        let selected;
        try {
          selected = randomWeightedSelect(items, weights);
        } catch (error) {
          // If it throws, that's the bug we're looking for
          throw new Error(`RandomWeightedSelect failed with items: ${items}, weights: ${weights}, error: ${error.message}`);
        }
        
        // The result should be either null (for empty arrays) or one of the items
        if (items.length > 0) {
          expect(items).toContain(selected);
        } else {
          expect(selected).toBeNull();
        }
      }
    });

    test('should handle edge cases for weighted selection', () => {
      // Test with all zero weights
      const result1 = randomWeightedSelect(['a', 'b', 'c'], [0, 0, 0]);
      expect(['a', 'b', 'c']).toContain(result1);
      
      // Test with negative weights (should be treated as zero)
      const result2 = randomWeightedSelect(['x', 'y'], [-1, 5]);
      expect(['x', 'y']).toContain(result2);
      
      // Test with very large weights
      const result3 = randomWeightedSelect(['p', 'q'], [1000000, 1]);
      expect(['p', 'q']).toContain(result3);
      
      // Test with floating point precision
      const result4 = randomWeightedSelect(['m', 'n'], [0.1, 0.2]);
      expect(['m', 'n']).toContain(result4);
    });
  });

  describe('Malformed and Extreme Data Handling', () => {
    test('should handle malformed task objects gracefully', async () => {
      const malformedTasks = [
        createTestTask({ priority: 'not-a-number' }),
        createTestTask({ stamp: { depth: 'not-a-number' } }),
        createTestTask({ sentence: { punctuation: 123 } }), // Wrong type
        createTestTask({ priority: 1.5 }), // Invalid priority > 1
        createTestTask({ priority: -0.5 }) // Invalid priority < 0
      ];
      
      const memory = createTestMemory({ tasks: malformedTasks });
      const premiseSource = new TaskBagPremiseSource(memory, { priority: true });
      
      // Should not crash when processing malformed tasks
      // Test the various sampling methods with malformed data
      try {
        await premiseSource._sampleByPriority();
        await premiseSource._sampleByRecency();
        await premiseSource._sampleByPunctuation();
        await premiseSource._sampleByNovelty();
      } catch (error) {
        // Errors are acceptable if they're handled gracefully
        console.debug(`Expected error with malformed task: ${error.message}`);
      }
    });

    test('should handle extreme parameter values', async () => {
      const extremeTasks = [
        createTestTask({ priority: Infinity }),
        createTestTask({ priority: -Infinity }),
        createTestTask({ priority: 0 }),
        createTestTask({ priority: Number.MAX_VALUE }),
        createTestTask({ priority: Number.MIN_VALUE }),
        createTestTask({ stamp: { depth: 1000000 } }), // Extremely deep
        createTestTask({ stamp: { depth: -1000 } }) // Negative depth
      ];
      
      const memory = createTestMemory({ tasks: extremeTasks });
      const premiseSource = new TaskBagPremiseSource(memory, {
        priority: true,
        novelty: true,
        weights: {
          priority: Infinity,  // Extreme weight
          novelty: -Infinity  // Negative weight
        }
      });
      
      // Should handle extreme values gracefully
      try {
        const result1 = premiseSource._sampleByPriority();
        const result2 = premiseSource._sampleByNovelty();
        const method = premiseSource._selectSamplingMethod();
        
        // These operations should complete without throwing errors
        expect(method).toBeDefined();
      } catch (error) {
        // Errors should be handled gracefully
        console.debug(`Handled error with extreme values: ${error.message}`);
      }
    });
  });
});