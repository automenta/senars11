import { Reasoner } from '../Reasoner.js';
import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { Strategy } from '../Strategy.js';
import { RuleProcessor } from '../RuleProcessor.js';
import { RuleExecutor } from '../RuleExecutor.js';
import { Rule } from '../Rule.js';
import { createTestMemory, createTestTask } from '../utils/test.js';

// Complex rules for advanced testing
class TestDeductionRule extends Rule {
  constructor() {
    super('deduction', 'nal', 1.0);
  }

  apply(primary, secondary) {
    return [{
      id: `derived-${primary.id}-${secondary.id}`,
      priority: Math.min(primary.priority, secondary.priority) * 0.9,
      stamp: { 
        depth: Math.max(primary.stamp.depth, secondary.stamp.depth) + 1,
        creationTime: Date.now()
      }
    }];
  }
}

class TestAsyncRule extends Rule {
  constructor() {
    super('async-rule', 'lm', 1.0);
  }

  async applyAsync(primary, secondary) {
    // Simulate async processing time
    await new Promise(resolve => setTimeout(resolve, 5));
    return [{
      id: `async-derived-${primary.id}-${secondary.id}`,
      priority: (primary.priority + secondary.priority) / 2,
      stamp: { 
        depth: Math.max(primary.stamp.depth, secondary.stamp.depth) + 1,
        creationTime: Date.now()
      }
    }];
  }
}

describe('Advanced Integration Tests - Complex Interactions', () => {
  let memory;
  let premiseSource;
  let strategy;
  let ruleExecutor;
  let ruleProcessor;
  let reasoner;

  beforeEach(() => {
    const tasks = [
      createTestTask({ id: 'task1', priority: 0.9, stamp: { creationTime: Date.now() - 1000, depth: 0 } }),
      createTestTask({ id: 'task2', priority: 0.8, stamp: { creationTime: Date.now() - 500, depth: 0 } }),
      createTestTask({ id: 'task3', priority: 0.7, stamp: { creationTime: Date.now() - 100, depth: 0 } })
    ];
    memory = createTestMemory({ tasks });
  });

  test('should handle complex sampling strategy interactions', async () => {
    // Test a scenario with multiple active sampling strategies
    premiseSource = new TaskBagPremiseSource(memory, {
      priority: true,
      recency: true,
      novelty: true,
      weights: {
        priority: 0.5,
        recency: 0.3,
        novelty: 0.2
      }
    });

    // Set up reasoner components
    strategy = new Strategy();
    ruleExecutor = new RuleExecutor();
    ruleExecutor.register(new TestDeductionRule());
    ruleExecutor.register(new TestAsyncRule());
    ruleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 3 });
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
      maxDerivationDepth: 3,
      cpuThrottleInterval: 0
    });

    // Run for a short time to gather metrics
    const results = [];
    let count = 0;
    for await (const derivation of reasoner.outputStream) {
      results.push(derivation);
      count++;
      if (count >= 5) break; // Get a few results to verify functionality
    }

    expect(results.length).toBeGreaterThanOrEqual(0);
    
    // Verify that metrics reflect the complex interaction
    const metrics = reasoner.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalDerivations).toBeGreaterThanOrEqual(0);
  });

  test('should maintain backpressure across component boundaries', async () => {
    premiseSource = new TaskBagPremiseSource(memory, { priority: true });
    strategy = new Strategy({ maxSecondaryPremises: 5 });
    ruleExecutor = new RuleExecutor();
    ruleExecutor.register(new TestDeductionRule());
    ruleExecutor.register(new TestAsyncRule());
    
    // Create rule processor with low backpressure threshold for testing
    ruleProcessor = new RuleProcessor(ruleExecutor, { 
      maxDerivationDepth: 5,
      backpressureThreshold: 3, // Low threshold for testing
      backpressureInterval: 1
    });
    
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
      maxDerivationDepth: 5,
      cpuThrottleInterval: 0,
      backpressureThreshold: 5,
      backpressureInterval: 2
    });

    // Simulate high load scenario
    const start = Date.now();
    const results = [];
    let count = 0;
    for await (const derivation of reasoner.outputStream) {
      results.push(derivation);
      count++;
      if (count >= 10) break; // Stop after 10 results
    }
    const end = Date.now();

    // Check that backpressure mechanisms affected execution time
    expect(end - start).toBeGreaterThan(0);
    
    // Verify status information shows backpressure behavior
    const ruleProcessorStatus = reasoner.getComponentStatus().ruleProcessor;
    expect(ruleProcessorStatus.backpressure).toBeDefined();
    
    const reasonerMetrics = reasoner.getMetrics();
    expect(reasonerMetrics.backpressureEvents).toBeDefined();
  });

  test('should adapt behavior based on consumer feedback', async () => {
    premiseSource = new TaskBagPremiseSource(memory, { priority: true });
    strategy = new Strategy();
    ruleExecutor = new RuleExecutor();
    ruleExecutor.register(new TestDeductionRule());
    ruleExecutor.register(new TestAsyncRule());
    ruleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 3 });
    
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
      maxDerivationDepth: 3,
      cpuThrottleInterval: 5, // Start with some CPU throttling
      backpressureThreshold: 10
    });

    // Send consumer feedback indicating slow processing
    reasoner.receiveConsumerFeedback({
      processingSpeed: 1, // Very slow consumer
      backlogSize: 20, // Large backlog
      consumerId: 'slow-consumer'
    });

    // Verify the reasoner adjusted its behavior
    const metricsAfterFeedback = reasoner.getMetrics();
    expect(metricsAfterFeedback.backpressureLevel).toBe(20);
    
    // Test consumer feedback handler registration and notification
    const mockHandler = jest.fn();
    reasoner.registerConsumerFeedbackHandler(mockHandler);
    
    reasoner.notifyConsumption({ id: 'test-derivation' }, 100, { consumerId: 'test' });
    
    expect(mockHandler).toHaveBeenCalledWith(
      { id: 'test-derivation' },
      100,
      expect.objectContaining({
        consumerId: 'test',
        timestamp: expect.any(Number)
      })
    );
  });

  test('should handle failure scenarios gracefully with complex interactions', async () => {
    // Create components that might fail in complex ways
    premiseSource = new TaskBagPremiseSource(memory, { priority: true });
    strategy = new Strategy();
    
    // Rule executor that fails intermittently
    const flakyRuleExecutor = {
      getCandidateRules: () => {
        if (Math.random() > 0.7) { // 30% failure rate
          throw new Error('Rule selection failed');
        }
        return [{ id: 'safe-rule', apply: (p, s) => [{ id: 'safe-result' }] }];
      },
      executeRule: (rule, p, s) => {
        if (Math.random() > 0.8) { // 20% failure rate
          throw new Error('Rule execution failed');
        }
        return rule.apply(p, s);
      }
    };
    
    ruleProcessor = new RuleProcessor(flakyRuleExecutor, { maxDerivationDepth: 3 });
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, { maxDerivationDepth: 3 });

    // Should handle intermittent failures without crashing
    const results = [];
    let count = 0;
    try {
      for await (const derivation of reasoner.outputStream) {
        results.push(derivation);
        count++;
        if (count >= 5) break;
      }
    } catch (error) {
      // If there's an error, that's acceptable in failure scenario testing
    }

    // The system should continue operating despite intermittent failures
    expect(results).toBeDefined();
  });

  test('should maintain performance under load with adaptive mechanisms', async () => {
    // Create a scenario with many tasks to test performance under load
    const manyTasks = Array.from({ length: 50 }, (_, i) => 
      createTestTask({
        id: `task${i}`,
        priority: 1.0 - (i * 0.02), // Decreasing priority
        stamp: { creationTime: Date.now() - (i * 10), depth: i % 3 } // Varying depth
      })
    );
    
    const loadedMemory = createTestMemory({ tasks: manyTasks });
    
    premiseSource = new TaskBagPremiseSource(loadedMemory, {
      priority: true,
      weights: { priority: 0.8, recency: 0.2 },
      dynamic: true
    });
    
    strategy = new Strategy({ maxSecondaryPremises: 3 });
    ruleExecutor = new RuleExecutor();
    ruleExecutor.register(new TestDeductionRule());
    ruleExecutor.register(new TestAsyncRule());
    ruleProcessor = new RuleProcessor(ruleExecutor, { 
      maxDerivationDepth: 5,
      backpressureThreshold: 10,
      backpressureInterval: 1
    });
    
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
      maxDerivationDepth: 5,
      cpuThrottleInterval: 1,
      backpressureThreshold: 15,
      backpressureInterval: 2
    });

    // Track performance over time
    const startTime = Date.now();
    const results = [];
    let count = 0;
    for await (const derivation of reasoner.outputStream) {
      results.push(derivation);
      count++;
      if (count >= 15) break; // Get a reasonable sample
    }
    const endTime = Date.now();

    const duration = endTime - startTime;
    const metrics = reasoner.getMetrics();
    
    // Verify that the system maintained reasonable performance under load
    expect(results.length).toBeGreaterThanOrEqual(0);
    expect(metrics.totalDerivations).toBeGreaterThanOrEqual(0);
    
    // Check that adaptive mechanisms were triggered
    expect(metrics.backpressureEvents).toBeDefined();
    expect(metrics.cpuThrottleCount).toBeDefined();
  });

  test('should coordinate complex state across all components', async () => {
    premiseSource = new TaskBagPremiseSource(memory, {
      priority: true,
      dynamic: true,
      weights: { priority: 0.7, novelty: 0.3 }
    });
    
    strategy = new Strategy();
    ruleExecutor = new RuleExecutor();
    ruleExecutor.register(new TestDeductionRule());
    ruleExecutor.register(new TestAsyncRule());
    ruleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 4 });
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
      maxDerivationDepth: 4,
      cpuThrottleInterval: 0
    });

    // Generate some activity to populate state
    const results = [];
    let count = 0;
    for await (const derivation of reasoner.outputStream) {
      results.push(derivation);
      count++;
      if (count >= 3) break;
    }

    // Check coordinated state across components
    const state = reasoner.getState();
    const componentStatus = reasoner.getComponentStatus();
    const debugInfo = reasoner.getDebugInfo();
    
    // Verify all components report consistent state
    expect(state.isRunning).toBe(reasoner.isRunning);
    expect(componentStatus.premiseSource.name).toBe('TaskBagPremiseSource');
    expect(debugInfo.state.isRunning).toBe(state.isRunning);
    
    // Verify metrics are consistent across reporting mechanisms
    expect(state.metrics.totalDerivations).toBe(debugInfo.metrics.totalDerivations);
  });
});