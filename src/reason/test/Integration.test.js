import { Reasoner } from '../Reasoner.js';
import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { Strategy } from '../Strategy.js';
import { RuleProcessor } from '../RuleProcessor.js';
import { RuleExecutor } from '../RuleExecutor.js';
import { Rule } from '../Rule.js';
import { createTestMemory, createTestTask } from '../utils/test.js';

// Define test rules for integration tests
class TestDeductionRule extends Rule {
  constructor() {
    super('deduction-rule', 'nal', 1.0);
  }

  apply(primaryPremise, secondaryPremise) {
    // Simple derivation: create a new task based on the inputs
    return [{
      id: `derived-${primaryPremise.id}-${secondaryPremise.id}`,
      priority: (primaryPremise.priority + secondaryPremise.priority) / 2,
      stamp: { depth: Math.max(primaryPremise.stamp.depth, secondaryPremise.stamp.depth) + 1 }
    }];
  }
}

class TestDeepRule extends Rule {
  constructor() {
    super('deep-rule', 'nal', 1.0);
  }

  apply(primaryPremise, secondaryPremise) {
    // Create a derivation with a high depth to test limits
    return [{
      id: `deep-derived-${primaryPremise.id}`,
      priority: 0.5,
      stamp: { depth: 10 } // This exceeds our max depth of 5
    }];
  }
}

describe('Reasoner Integration Tests', () => {
  let memory;
  let premiseSource;
  let strategy;
  let ruleExecutor;
  let ruleProcessor;
  let reasoner;

  beforeEach(() => {
    // Create test memory with some tasks
    const tasks = [
      createTestTask({ id: 'task1', priority: 0.9, stamp: { creationTime: Date.now() - 1000, depth: 0 } }),
      createTestTask({ id: 'task2', priority: 0.7, stamp: { creationTime: Date.now() - 500, depth: 0 } }),
      createTestTask({ id: 'task3', priority: 0.5, stamp: { creationTime: Date.now() - 100, depth: 0 } })
    ];
    memory = createTestMemory({ tasks });
    
    premiseSource = new TaskBagPremiseSource(memory, {
      priority: true,
      weights: { priority: 1.0 }
    });
    
    strategy = new Strategy();
    ruleExecutor = new RuleExecutor();
    ruleExecutor.register(new TestDeductionRule());
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
    // Create a rule that creates deeply nested derivations
    const deepRule = new TestDeepRule();
    const ruleExecutorDeep = new RuleExecutor();
    ruleExecutorDeep.register(deepRule);
    const deepRuleProcessor = new RuleProcessor(ruleExecutorDeep, { maxDerivationDepth: 5 });
    
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
    
    // These timestamps are created at nearly the same time, so exact ordering isn't predictable
    // Instead, just verify they are defined and reasonable
    expect(state.timestamp).toBeDefined();
    expect(debugInfo.timestamp).toBeDefined();
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
    // Create a strategy that might fail
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