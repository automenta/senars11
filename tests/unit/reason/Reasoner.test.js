import {jest} from '@jest/globals';
import {Reasoner} from '../../../src/reason/Reasoner.js';
import {Focus} from '../../../src/memory/Focus.js';
import {createTestMemory, createTestReasoner} from '../../support/baseTestUtils.js';

describe('Reasoner', () => {
    let reasoner, testMemory;

    beforeEach(() => {
        testMemory = createTestMemory();
        reasoner = createTestReasoner({
            focus: new Focus(),
            memory: testMemory
        });
    });

    describe('constructor', () => {
        test('should initialize with default config', () => {
            expect(reasoner.config).toMatchObject({
                maxDerivationDepth: 10,
                cpuThrottleInterval: 0
            });
            expect(reasoner.isRunning).toBe(false);
        });

        test('should initialize with custom config', () => {
             const customReasoner = createTestReasoner({
                focus: new Focus(),
                memory: testMemory,
                config: {
                    maxDerivationDepth: 5,
                    cpuThrottleInterval: 1,
                    backpressureThreshold: 50,
                    backpressureInterval: 10
                }
            });

            expect(customReasoner.config).toMatchObject({
                maxDerivationDepth: 5,
                cpuThrottleInterval: 1,
                backpressureThreshold: 50,
                backpressureInterval: 10
            });
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
            expect(reasoner.getState()).toMatchObject({
                isRunning: false,
                config: expect.anything(),
                metrics: expect.anything(),
                timestamp: expect.anything()
            });
        });
    });

    describe('getComponentStatus', () => {
        test('should return component status', () => {
            expect(reasoner.getComponentStatus()).toMatchObject({
                premiseSource: expect.anything(),
                strategy: expect.anything(),
                ruleProcessor: expect.anything()
            });
        });
    });

    describe('getDebugInfo', () => {
        test('should return debug information', () => {
            expect(reasoner.getDebugInfo()).toMatchObject({
                state: expect.anything(),
                config: expect.anything(),
                metrics: expect.anything(),
                componentStatus: expect.anything(),
                timestamp: expect.anything()
            });
        });
    });

    describe('getPerformanceMetrics', () => {
        test('should return performance metrics', () => {
            expect(reasoner.getPerformanceMetrics()).toMatchObject({
                throughput: expect.anything(),
                avgProcessingTime: expect.anything(),
                memoryUsage: expect.anything(),
                detailed: expect.anything()
            });
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
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            reasoner.start();
            reasoner.start();
            expect(warnSpy).toHaveBeenCalledWith('Reasoner is already running');
            warnSpy.mockRestore();
        });
    });

    describe('step', () => {
        test('should execute a single reasoning step', async () => {
            reasoner.start();
            expect(await reasoner.step(100)).toBeDefined();
        });
    });

    describe('registerConsumerFeedbackHandler', () => {
        test('should register and call feedback handlers', () => {
            const mockHandler = jest.fn();
            reasoner.registerConsumerFeedbackHandler(mockHandler);

            const testDerivation = {id: 'test'};
            reasoner.notifyConsumption(testDerivation, 10, {consumerId: 'test-consumer'});

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
            reasoner.receiveConsumerFeedback({
                processingSpeed: 5,
                backlogSize: 20,
                consumerId: 'test-consumer'
            });

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
