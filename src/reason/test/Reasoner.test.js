import {jest} from '@jest/globals';
import { Reasoner } from '../Reasoner.js';
import { Strategy } from '../Strategy.js';
import { RuleProcessor } from '../RuleProcessor.js';
import { RuleExecutor } from '../RuleExecutor.js';
import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { createTestMemory, createTestTask } from '../utils/test.js';

describe('Reasoner', () => {
  let reasoner;
  let premiseSource;
  let strategy;
  let ruleProcessor;
  let ruleExecutor;
  let testMemory;

  beforeEach(() => {
    testMemory = createTestMemory({ tasks: [createTestTask({ id: 'test-task' })] });
    premiseSource = new TaskBagPremiseSource(testMemory);
    strategy = new Strategy();
    ruleExecutor = new RuleExecutor();
    ruleProcessor = new RuleProcessor(ruleExecutor);
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor);
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      expect(reasoner.config.maxDerivationDepth).toBe(10);
      expect(reasoner.config.cpuThrottleInterval).toBe(0);
      expect(reasoner.isRunning).toBe(false);
    });

    test('should initialize with custom config', () => {
      reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
        maxDerivationDepth: 5,
        cpuThrottleInterval: 1,
        backpressureThreshold: 50,
        backpressureInterval: 10
      });

      expect(reasoner.config.maxDerivationDepth).toBe(5);
      expect(reasoner.config.cpuThrottleInterval).toBe(1);
      expect(reasoner.config.backpressureThreshold).toBe(50);
      expect(reasoner.config.backpressureInterval).toBe(10);
    });
  });

  describe('getMetrics', () => {
    test('should return metrics object', () => {
      const metrics = reasoner.getMetrics();
      
      expect(metrics.totalDerivations).toBeDefined();
      expect(metrics.startTime).toBeDefined();
      expect(metrics.throughput).toBeDefined();
      expect(metrics.avgProcessingTime).toBeDefined();
    });
  });

  describe('getState', () => {
    test('should return state information', () => {
      const state = reasoner.getState();
      
      expect(state.isRunning).toBe(false);
      expect(state.config).toBeDefined();
      expect(state.metrics).toBeDefined();
      expect(state.timestamp).toBeDefined();
    });
  });

  describe('getComponentStatus', () => {
    test('should return component status', () => {
      const status = reasoner.getComponentStatus();
      
      expect(status.premiseSource).toBeDefined();
      expect(status.strategy).toBeDefined();
      expect(status.ruleProcessor).toBeDefined();
    });
  });

  describe('getDebugInfo', () => {
    test('should return debug information', () => {
      const debugInfo = reasoner.getDebugInfo();
      
      expect(debugInfo.state).toBeDefined();
      expect(debugInfo.config).toBeDefined();
      expect(debugInfo.metrics).toBeDefined();
      expect(debugInfo.componentStatus).toBeDefined();
      expect(debugInfo.timestamp).toBeDefined();
    });
  });

  describe('getPerformanceMetrics', () => {
    test('should return performance metrics', () => {
      const perfMetrics = reasoner.getPerformanceMetrics();
      
      expect(perfMetrics.throughput).toBeDefined();
      expect(perfMetrics.avgProcessingTime).toBeDefined();
      expect(perfMetrics.memoryUsage).toBeDefined();
      expect(perfMetrics.detailed).toBeDefined();
    });
  });

  describe('start/stop', () => {
    test('should start and stop the reasoner', async () => {
      expect(reasoner.isRunning).toBe(false);
      
      reasoner.start();
      expect(reasoner.isRunning).toBe(true);
      
      await reasoner.stop();
      expect(reasoner.isRunning).toBe(false);
    });

    test('should warn if starting already running reasoner', () => {
      console.warn = jest.fn();
      
      reasoner.start();
      reasoner.start(); // Should trigger warning
      
      expect(console.warn).toHaveBeenCalledWith('Reasoner is already running');
    });
  });

  describe('step', () => {
    test('should execute a single reasoning step', async () => {
      reasoner.start();
      const result = await reasoner.step(100); // 100ms timeout
      
      // Should either return a result or null due to timeout
      expect(result).toBeDefined();
    });
  });

  describe('registerConsumerFeedbackHandler', () => {
    test('should register and call feedback handlers', () => {
      const mockHandler = jest.fn();
      reasoner.registerConsumerFeedbackHandler(mockHandler);

      const testDerivation = { id: 'test' };
      reasoner.notifyConsumption(testDerivation, 10, { consumerId: 'test-consumer' });

      expect(mockHandler).toHaveBeenCalledWith(
        testDerivation,
        10,
        expect.objectContaining({
          consumerId: 'test-consumer',
          timestamp: expect.any(Number),
          queueLength: expect.any(Number)
        })
      );
    });
  });

  describe('receiveConsumerFeedback', () => {
    test('should adjust behavior based on consumer feedback', () => {
      const feedback = {
        processingSpeed: 5,
        backlogSize: 20,
        consumerId: 'test-consumer'
      };

      reasoner.receiveConsumerFeedback(feedback);

      // Should have adjusted based on high backlog
      expect(reasoner.outputConsumerSpeed).toBe(5);
      expect(reasoner.performance.backpressureLevel).toBe(20);
    });
  });

  describe('cleanup', () => {
    test('should properly clean up resources', async () => {
      reasoner.start();
      await reasoner.cleanup();

      expect(reasoner.isRunning).toBe(false);
      expect(reasoner._outputStream).toBeNull();
      expect(reasoner.metrics.totalDerivations).toBe(0);
    });
  });
});