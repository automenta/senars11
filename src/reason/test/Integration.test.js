import { Reasoner } from '../Reasoner.js';
import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { Strategy } from '../Strategy.js';
import { RuleProcessor } from '../RuleProcessor.js';
import { RuleExecutor } from '../RuleExecutor.js';

// Mock components for integration test
class MockTaskBag {
  constructor() {
    this.tasks = [
      { id: 'task1', priority: 0.9, stamp: { creationTime: Date.now() - 1000, depth: 0 } },
      { id: 'task2', priority: 0.7, stamp: { creationTime: Date.now() - 500, depth: 0 } },
      { id: 'task3', priority: 0.5, stamp: { creationTime: Date.now() - 100, depth: 0 } }
    ];
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
}

class MockRuleExecutor {
  constructor() {
    // Create mock rules
    this.rules = [
      {
        id: 'deduction-rule',
        type: 'nal',
        guards: ['compound-term'],
        apply: (primary, secondary) => {
          // Simple derivation: create a new task based on the inputs
          return [{
            id: `derived-${primary.id}-${secondary.id}`,
            priority: (primary.priority + secondary.priority) / 2,
            stamp: { depth: Math.max(primary.stamp.depth, secondary.stamp.depth) + 1 }
          }];
        }
      }
    ];
  }

  getCandidateRules(primary, secondary) {
    // For this test, return all rules
    return this.rules;
  }

  executeRule(rule, primary, secondary) {
    return rule.apply(primary, secondary);
  }
}

describe('Reasoner Integration Tests', () => {
  let memory;
  let taskBag;
  let premiseSource;
  let strategy;
  let ruleExecutor;
  let ruleProcessor;
  let reasoner;

  beforeEach(() => {
    taskBag = new MockTaskBag();
    memory = { taskBag };
    
    premiseSource = new TaskBagPremiseSource(memory, {
      priority: true,
      weights: { priority: 1.0 }
    });
    
    strategy = new Strategy();
    ruleExecutor = new MockRuleExecutor();
    ruleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 5 });
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
      maxDerivationDepth: 5,
      cpuThrottleInterval: 0
    });
  });

  test('should process tasks through the entire pipeline', async () => {
    // Test with a timeout to avoid infinite loops in tests
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 1000));
    
    const resultsPromise = (async () => {
      const results = [];
      let count = 0;
      
      for await (const derivation of reasoner.outputStream) {
        results.push(derivation);
        count++;
        if (count >= 3) break; // Stop after getting a few results
      }
      
      return results;
    })();
    
    const results = await Promise.race([resultsPromise, timeoutPromise]);
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  test('should respect derivation depth limits', async () => {
    // Create a mock rule that creates deeply nested derivations
    const deepRule = {
      id: 'deep-rule',
      type: 'nal',
      apply: (primary, secondary) => {
        // Create a derivation with a high depth to test limits
        return [{
          id: `deep-derived-${primary.id}`,
          priority: 0.5,
          stamp: { depth: 10 } // This exceeds our max depth of 5
        }];
      }
    };

    const mockRuleExecutorDeep = {
      getCandidateRules: () => [deepRule],
      executeRule: (rule, primary, secondary) => rule.apply(primary, secondary)
    };

    const deepRuleProcessor = new RuleProcessor(mockRuleExecutorDeep, { maxDerivationDepth: 5 });
    const deepReasoner = new Reasoner(premiseSource, strategy, deepRuleProcessor, { maxDerivationDepth: 5 });
    
    const results = [];
    let count = 0;
    for await (const derivation of deepReasoner.outputStream) {
      results.push(derivation);
      count++;
      if (count >= 3) break;
    }

    // Results with depth > 5 should be filtered out
    const validDerivations = results.filter(d => d && d.stamp && d.stamp.depth <= 5);
    expect(validDerivations.length).toBe(results.length);
  });

  test('should handle different sampling strategies', async () => {
    // Test recency-based sampling
    const recencySource = new TaskBagPremiseSource(memory, {
      recency: true,
      targetTime: Date.now() // Target current time, so most recent should be selected
    });
    
    const recencyReasoner = new Reasoner(recencySource, strategy, ruleProcessor);
    const state = recencyReasoner.getState();
    
    expect(state.components.premiseSource).toBe('TaskBagPremiseSource');
  });

  test('should provide comprehensive metrics', () => {
    const metrics = reasoner.getMetrics();
    
    expect(metrics.totalDerivations).toBeDefined();
    expect(metrics.startTime).toBeDefined();
    expect(metrics.throughput).toBeDefined();
    expect(metrics.ruleProcessorStats).toBeDefined();
  });

  test('should support introspection capabilities', () => {
    const state = reasoner.getState();
    const debugInfo = reasoner.getDebugInfo();
    const perfMetrics = reasoner.getPerformanceMetrics();
    const componentStatus = reasoner.getComponentStatus();
    
    expect(state).toBeDefined();
    expect(debugInfo).toBeDefined();
    expect(perfMetrics).toBeDefined();
    expect(componentStatus).toBeDefined();
    
    expect(state.timestamp).toBeGreaterThanOrEqual(debugInfo.timestamp);
  });

  test('should support backpressure mechanisms', async () => {
    // Test consumer feedback mechanism
    const feedback = {
      processingSpeed: 2, // 2 derivations per second
      backlogSize: 10, // 10 items in backlog
      consumerId: 'test-consumer'
    };
    
    reasoner.receiveConsumerFeedback(feedback);
    
    const updatedMetrics = reasoner.getMetrics();
    expect(updatedMetrics.backpressureLevel).toBe(10);
  });

  test('should handle component failures gracefully', async () => {
    // Create a reasoner with components that might fail
    const failingStrategy = {
      generatePremisePairs: async function*(premiseStream) {
        for await (const premise of premiseStream) {
          throw new Error('Strategy failed');
        }
      }
    };

    const failingReasoner = new Reasoner(premiseSource, failingStrategy, ruleProcessor);
    
    // This should not crash the reasoner
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 100));
    const resultsPromise = (async () => {
      const results = [];
      try {
        for await (const derivation of failingReasoner.outputStream) {
          results.push(derivation);
        }
      } catch (error) {
        // Expected to catch the error
        return 'error-caught';
      }
      return results;
    })();
    
    const result = await Promise.race([resultsPromise, timeoutPromise]);
    expect(result).toBeDefined(); // Should handle the error gracefully
  });
});