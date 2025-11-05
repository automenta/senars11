import { RuleProcessor } from '../RuleProcessor.js';

// Mock components
class MockRuleExecutor {
  constructor(rules = []) {
    this.rules = rules;
  }

  getCandidateRules() {
    return this.rules;
  }

  executeRule(rule, primaryPremise, secondaryPremise) {
    if (rule.type && rule.type.toLowerCase().includes('nal')) {
      // Synchronous rule
      return [{ id: 'sync-result', premise: primaryPremise, ruleId: rule.id }];
    } else {
      // Asynchronous rule - for testing purposes, return result immediately
      return [{ id: 'async-result', premise: primaryPremise, ruleId: rule.id }];
    }
  }
}

// Mock rule class
class MockRule {
  constructor(id, type = 'nal', isAsync = false) {
    this.id = id;
    this.type = type;
    this.isAsync = isAsync;
  }

  applyAsync() {
    return [{ id: 'async-derived', ruleId: this.id }];
  }
}

describe('RuleProcessor', () => {
  let ruleProcessor;
  let mockRuleExecutor;

  beforeEach(() => {
    mockRuleExecutor = new MockRuleExecutor([
      new MockRule('rule1', 'nal'),  // Synchronous
      new MockRule('rule2', 'lm')    // Asynchronous
    ]);
    ruleProcessor = new RuleProcessor(mockRuleExecutor);
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      expect(ruleProcessor.config.maxDerivationDepth).toBe(10);
      expect(ruleProcessor.config.backpressureThreshold).toBe(50);
      expect(ruleProcessor.asyncResultsQueue).toEqual([]);
      expect(ruleProcessor.syncRuleExecutions).toBe(0);
      expect(ruleProcessor.asyncRuleExecutions).toBe(0);
    });

    test('should initialize with custom config', () => {
      ruleProcessor = new RuleProcessor(mockRuleExecutor, {
        maxDerivationDepth: 5,
        backpressureThreshold: 25,
        backpressureInterval: 5
      });

      expect(ruleProcessor.config.maxDerivationDepth).toBe(5);
      expect(ruleProcessor.config.backpressureThreshold).toBe(25);
      expect(ruleProcessor.config.backpressureInterval).toBe(5);
    });
  });

  describe('_isSynchronousRule', () => {
    test('should identify synchronous rules', () => {
      const nalRule = { type: 'nal' };
      const lmRule = { type: 'lm' };
      
      expect(ruleProcessor._isSynchronousRule(nalRule)).toBe(true);
      expect(ruleProcessor._isSynchronousRule(lmRule)).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return execution statistics', () => {
      ruleProcessor.syncRuleExecutions = 5;
      ruleProcessor.asyncRuleExecutions = 3;
      
      const stats = ruleProcessor.getStats();
      
      expect(stats.syncRuleExecutions).toBe(5);
      expect(stats.asyncRuleExecutions).toBe(3);
    });
  });

  describe('resetStats', () => {
    test('should reset execution statistics', () => {
      ruleProcessor.syncRuleExecutions = 5;
      ruleProcessor.asyncRuleExecutions = 3;
      
      ruleProcessor.resetStats();
      
      const stats = ruleProcessor.getStats();
      expect(stats.syncRuleExecutions).toBe(0);
      expect(stats.asyncRuleExecutions).toBe(0);
    });
  });

  describe('_processDerivation', () => {
    test('should process derivations with depth limits', () => {
      const validDerivation = { id: 'valid', stamp: { depth: 5 } };
      const invalidDerivation = { id: 'invalid', stamp: { depth: 15 } }; // Exceeds default max depth of 10
      
      const result1 = ruleProcessor._processDerivation(validDerivation);
      const result2 = ruleProcessor._processDerivation(invalidDerivation);
      
      expect(result1).toBe(validDerivation);
      expect(result2).toBeNull();
    });

    test('should handle derivations without stamps', () => {
      const derivation = { id: 'no-stamp' };
      
      const result = ruleProcessor._processDerivation(derivation);
      
      expect(result).toBe(derivation);
    });
  });

  describe('_checkAndApplyBackpressure', () => {
    test('should apply backpressure when queue is above threshold', async () => {
      // Set up a queue above the threshold
      ruleProcessor.asyncResultsQueue = new Array(60).fill({ id: 'task' }); // Above default threshold of 50
      
      const start = Date.now();
      await ruleProcessor._checkAndApplyBackpressure();
      const end = Date.now();
      
      // Should have waited for backpressure interval
      const expectedWait = ruleProcessor.config.backpressureInterval || 5;
      expect(end - start).toBeGreaterThanOrEqual(expectedWait - 1); // -1 to account for timing precision
    });

    test('should not apply backpressure when queue is below threshold', async () => {
      // Set up a queue below the threshold
      ruleProcessor.asyncResultsQueue = new Array(10).fill({ id: 'task' }); // Below default threshold of 50
      
      const start = Date.now();
      await ruleProcessor._checkAndApplyBackpressure();
      const end = Date.now();
      
      // Should have waited for minimal time
      expect(end - start).toBeLessThan(5); // Should be much less than backpressure interval
    });
  });

  describe('getStatus', () => {
    test('should return status information', () => {
      ruleProcessor.asyncResultsQueue = new Array(5).fill({ id: 'task' });
      ruleProcessor.maxQueueSize = 10;
      ruleProcessor.syncRuleExecutions = 15;
      ruleProcessor.asyncRuleExecutions = 8;
      
      const status = ruleProcessor.getStatus();
      
      expect(status.config).toBeDefined();
      expect(status.stats).toBeDefined();
      expect(status.internalState.asyncResultsQueueLength).toBe(5);
      expect(status.internalState.maxQueueSize).toBe(10);
      expect(status.internalState.syncRuleExecutions).toBe(15);
      expect(status.internalState.asyncRuleExecutions).toBe(8);
      expect(status.backpressure).toBeDefined();
      expect(status.backpressure.queueLength).toBe(5);
      expect(status.backpressure.threshold).toBe(50);
    });
  });

  describe('process', () => {
    test('should process premise pairs and yield results', async () => {
      const premisePairStream = {
        [Symbol.asyncIterator]: async function*() {
          yield [{ id: 'primary' }, { id: 'secondary' }];
        }
      };

      const results = [];
      for await (const result of ruleProcessor.process(premisePairStream)) {
        results.push(result);
        if (results.length >= 2) break; // We expect 2 results from 2 rules
      }

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].ruleId).toBeDefined();
    });

    test('should handle errors during rule processing', async () => {
      const errorRule = {
        id: 'error-rule',
        type: 'nal'
      };
      mockRuleExecutor.rules = [errorRule];
      ruleProcessor.ruleExecutor.executeRule = () => {
        throw new Error('Rule execution failed');
      };

      const premisePairStream = {
        [Symbol.asyncIterator]: async function*() {
          yield [{ id: 'primary' }, { id: 'secondary' }];
        }
      };

      const results = [];
      await expect(async () => {
        for await (const result of ruleProcessor.process(premisePairStream)) {
          results.push(result);
        }
      }).resolves.not.toThrow();

      // Should continue processing despite the error
      expect(results.length).toBe(0);
    });
  });
});