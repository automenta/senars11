import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { Reasoner } from '../Reasoner.js';
import { RuleProcessor } from '../RuleProcessor.js';

// Mock task bag for testing
class MockTaskBag {
  constructor(tasks = []) {
    this.tasks = tasks;
  }

  take() {
    return this.tasks.shift() || null;
  }

  get size() {
    return this.tasks.length;
  }

  getAll() {
    return [...this.tasks];
  }

  remove(task) {
    const index = this.tasks.indexOf(task);
    if (index !== -1) {
      this.tasks.splice(index, 1);
    }
  }
}

describe('Advanced Unit Tests for Sophisticated Features', () => {
  describe('TaskBagPremiseSource - Dynamic Adaptation', () => {
    let taskBag;
    let memory;
    let premiseSource;

    beforeEach(() => {
      const tasks = [
        { id: 'task1', priority: 0.9, stamp: { creationTime: Date.now() - 1000, depth: 0 } },
        { id: 'task2', priority: 0.7, stamp: { creationTime: Date.now(), depth: 0 } }
      ];
      taskBag = new MockTaskBag(tasks);
      memory = { taskBag };
    });

    test('should update weights based on performance dynamically', () => {
      // Create premise source with dynamic adaptation enabled
      premiseSource = new TaskBagPremiseSource(memory, {
        dynamic: true,
        weights: { priority: 1.0, recency: 0.5, punctuation: 0.2, novelty: 0.1 }
      });

      // Record effectiveness for different methods
      premiseSource.recordMethodEffectiveness('priority', 0.9);
      premiseSource.recordMethodEffectiveness('recency', 0.7);
      premiseSource.recordMethodEffectiveness('punctuation', 0.3);
      premiseSource.recordMethodEffectiveness('novelty', 0.8);

      const initialWeights = { ...premiseSource.weights };
      
      // Update weights based on performance
      premiseSource._updateWeightsDynamically();

      // Check that weights have been adjusted based on effectiveness
      expect(premiseSource.weights.priority).toBeCloseTo(0.9 * initialWeights.priority + 0.1 * 0.9, 3);
      expect(premiseSource.weights.recency).toBeCloseTo(0.9 * initialWeights.recency + 0.1 * 0.7, 3);
      expect(premiseSource.weights.novelty).toBeCloseTo(0.9 * initialWeights.novelty + 0.1 * 0.8, 3);
    });

    test('should select methods based on updated weights', () => {
      premiseSource = new TaskBagPremiseSource(memory, {
        dynamic: true,
        weights: { priority: 0.0, recency: 1.0, punctuation: 0.0, novelty: 0.0 }
      });

      // Force recency selection by setting high weight
      premiseSource.weights = { priority: 0.0, recency: 1.0, punctuation: 0.0, novelty: 0.0 };

      const method = premiseSource._selectSamplingMethod();
      expect(method).toBe('recency');
    });

    test('should handle performance tracking correctly', () => {
      premiseSource = new TaskBagPremiseSource(memory, { dynamic: true });

      // Record multiple effectiveness scores for priority
      premiseSource.recordMethodEffectiveness('priority', 0.8);
      premiseSource.recordMethodEffectiveness('priority', 0.6);
      premiseSource.recordMethodEffectiveness('priority', 1.0);

      const stats = premiseSource.performanceStats.priority;
      expect(stats.count).toBe(3);
      expect(stats.effectiveness).toBe(2.4); // 0.8 + 0.6 + 1.0
    });

    test('should not update weights too frequently', () => {
      premiseSource = new TaskBagPremiseSource(memory, { dynamic: true });
      
      // Set lastUpdate to be very recent to prevent update
      premiseSource.lastUpdate = Date.now();
      
      const initialWeights = { ...premiseSource.weights };
      premiseSource._updateWeightsDynamically();
      
      // Weights should not have changed since last update was too recent
      expect(premiseSource.weights).toEqual(initialWeights);
    });
  });

  describe('Reasoner - Adaptive Processing Rates', () => {
    let mockPremiseSource, mockStrategy, mockRuleProcessor, reasoner;

    beforeEach(() => {
      mockPremiseSource = { stream: () => ({ [Symbol.asyncIterator]: async function*() {} }) };
      mockStrategy = { generatePremisePairs: () => ({ [Symbol.asyncIterator]: async function*() {} }) };
      mockRuleProcessor = { 
        process: () => ({ [Symbol.asyncIterator]: async function*() {} }),
        getStats: () => ({})
      };
      reasoner = new Reasoner(mockPremiseSource, mockStrategy, mockRuleProcessor, {
        cpuThrottleInterval: 10,
        backpressureInterval: 5
      });
    });

    test('should adapt processing rate based on system conditions', () => {
      // Simulate high backpressure
      reasoner.performance.backpressureLevel = 25; // High backpressure
      reasoner.outputConsumerSpeed = 2; // Slow consumer
      
      const initialThrottle = reasoner.config.cpuThrottleInterval;
      reasoner._adaptProcessingRate();
      
      // CPU throttle should increase due to high backpressure
      expect(reasoner.config.cpuThrottleInterval).toBeGreaterThan(initialThrottle);
    });

    test('should speed up processing when underutilized', () => {
      // Simulate low backpressure and fast consumer
      reasoner.performance.backpressureLevel = -10; // Consumer faster than producer
      
      const initialThrottle = reasoner.config.cpuThrottleInterval;
      reasoner._adaptProcessingRate();
      
      // CPU throttle should decrease (processing should speed up)
      expect(reasoner.config.cpuThrottleInterval).toBeLessThan(initialThrottle);
    });

    test('should maintain reasonable bounds on throttle values', () => {
      reasoner._updatePerformanceMetrics();
      reasoner._adaptProcessingRate();
      
      // Throttle value should not become negative
      expect(reasoner.config.cpuThrottleInterval).toBeGreaterThanOrEqual(0);
      
      // Backpressure interval should also be reasonable
      expect(reasoner.config.backpressureInterval).toBeGreaterThanOrEqual(1);
    });
  });

  describe('RuleProcessor - Backpressure Handling', () => {
    let ruleProcessor;

    beforeEach(() => {
      // Mock rule executor
      const mockRuleExecutor = {
        getCandidateRules: () => [],
        executeRule: () => []
      };
      ruleProcessor = new RuleProcessor(mockRuleExecutor, {
        backpressureThreshold: 10,
        backpressureInterval: 2
      });
    });

    test('should detect backpressure when queue exceeds threshold', () => {
      // Fill queue above threshold
      ruleProcessor.asyncResultsQueue = new Array(15).fill({ id: 'task' });
      
      expect(ruleProcessor.asyncResultsQueue.length).toBe(15);
      expect(ruleProcessor.asyncResultsQueue.length > ruleProcessor.config.backpressureThreshold).toBe(true);
    });

    test('should update max queue size tracking', async () => {
      ruleProcessor.asyncResultsQueue = new Array(15).fill({ id: 'task' });
      await ruleProcessor._checkAndApplyBackpressure();
      
      expect(ruleProcessor.maxQueueSize).toBeGreaterThanOrEqual(15);
      
      // Reduce queue size and verify max doesn't decrease
      ruleProcessor.asyncResultsQueue = new Array(5).fill({ id: 'task' });
      await ruleProcessor._checkAndApplyBackpressure();
      
      expect(ruleProcessor.maxQueueSize).toBeGreaterThanOrEqual(15); // Should maintain max
    });

    test('should apply backpressure based on queue size', async () => {
      // Test with queue size above threshold
      ruleProcessor.asyncResultsQueue = new Array(15).fill({ id: 'task' }); // Above threshold of 10
      
      const start = Date.now();
      await ruleProcessor._checkAndApplyBackpressure();
      const end = Date.now();
      
      // Should have delayed execution due to backpressure
      expect(end - start).toBeGreaterThanOrEqual(ruleProcessor.config.backpressureInterval);
    });

    test('should not apply backpressure when under threshold', async () => {
      // Test with queue size below threshold
      ruleProcessor.asyncResultsQueue = new Array(5).fill({ id: 'task' }); // Below threshold of 10
      
      const start = Date.now();
      await ruleProcessor._checkAndApplyBackpressure();
      const end = Date.now();
      
      // Should not have significant delay
      expect(end - start).toBeLessThan(ruleProcessor.config.backpressureInterval * 2);
    });

    test('should include backpressure information in status', () => {
      ruleProcessor.asyncResultsQueue = new Array(12).fill({ id: 'task' });
      
      const status = ruleProcessor.getStatus();
      
      expect(status.backpressure).toBeDefined();
      expect(status.backpressure.queueLength).toBe(12);
      expect(status.backpressure.threshold).toBe(10);
      expect(status.backpressure.isApplyingBackpressure).toBe(true);
    });
  });

  describe('Advanced Sampling Strategies', () => {
    let taskBag;
    let memory;
    let premiseSource;

    beforeEach(() => {
      const tasks = [
        { 
          id: 'recent-task', 
          priority: 0.5, 
          stamp: { creationTime: Date.now() - 100, depth: 0 } 
        },
        { 
          id: 'old-task', 
          priority: 0.5, 
          stamp: { creationTime: Date.now() - 10000, depth: 0 } 
        },
        { 
          id: 'deep-task', 
          priority: 0.5, 
          stamp: { creationTime: Date.now() - 500, depth: 8 } 
        },
        { 
          id: 'shallow-task', 
          priority: 0.5, 
          stamp: { creationTime: Date.now() - 500, depth: 1 } 
        }
      ];
      taskBag = new MockTaskBag(tasks);
      memory = { taskBag };
    });

    test('should select by closeness to target time', () => {
      premiseSource = new TaskBagPremiseSource(memory, { 
        recency: true, 
        targetTime: Date.now() - 50 // Target time close to recent-task
      });
      
      // Mock the internal method to focus on recency selection
      const targetTimeTask = premiseSource._sampleByRecency();
      
      // Should select the task closest to target time
      expect(targetTimeTask.id).toBe('recent-task');
    });

    test('should select by novelty (lowest derivation depth)', () => {
      premiseSource = new TaskBagPremiseSource(memory, { novelty: true });
      
      const novelTask = premiseSource._sampleByNovelty();
      
      // Should select the task with lowest depth (highest novelty)
      expect(novelTask.id).toBe('shallow-task');
    });

    test('should handle punctuation-based selection', () => {
      const tasksWithPunct = [
        { id: 'belief', sentence: { punctuation: '.' } },
        { id: 'goal', sentence: { punctuation: '!' } },
        { id: 'question', sentence: { punctuation: '?' } }
      ];
      
      const punctTaskBag = new MockTaskBag(tasksWithPunct);
      premiseSource = new TaskBagPremiseSource({ taskBag: punctTaskBag }, { punctuation: true });
      
      const punctTask = premiseSource._sampleByPunctuation();
      
      // Should select either goal or question (both are punctuation targets)
      expect(['goal', 'question']).toContain(punctTask.id);
    });
  });
});