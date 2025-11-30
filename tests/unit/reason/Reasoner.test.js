import {jest} from '@jest/globals';
import {Reasoner} from '../../../src/reason/Reasoner.js';
import {Focus} from '../../../src/memory/Focus.js';
import {createTestMemory, createTestReasoner} from '../../support/baseTestUtils.js';

describe('Reasoner', () => {
    let reasoner, testMemory;

    beforeEach(() => {
        testMemory = createTestMemory();
        reasoner = createTestReasoner({ focus: new Focus(), memory: testMemory });
    });

    describe('Initialization', () => {
        test('defaults', () => {
            expect(reasoner.config).toMatchObject({ maxDerivationDepth: 10, cpuThrottleInterval: 0 });
            expect(reasoner.isRunning).toBe(false);
        });

        test('custom config', () => {
             const custom = createTestReasoner({
                focus: new Focus(),
                memory: testMemory,
                config: { maxDerivationDepth: 5, cpuThrottleInterval: 1, backpressureThreshold: 50, backpressureInterval: 10 }
            });
            expect(custom.config).toMatchObject({ maxDerivationDepth: 5, cpuThrottleInterval: 1, backpressureThreshold: 50, backpressureInterval: 10 });
        });
    });

    describe('Metrics & Status', () => {
        test('getMetrics', () => {
            const metrics = reasoner.getMetrics();
            expect(metrics).toMatchObject({
                totalDerivations: expect.any(Number),
                throughput: expect.any(Number),
                avgProcessingTime: expect.any(Number)
            });
            expect(metrics.startTime).toBeNull();
        });

        test('getState', () => {
            expect(reasoner.getState()).toMatchObject({
                isRunning: false,
                config: expect.any(Object),
                metrics: expect.any(Object),
                timestamp: expect.any(Number)
            });
        });

        test('getComponentStatus', () => {
            expect(reasoner.getComponentStatus()).toMatchObject({
                premiseSource: expect.any(Object),
                strategy: expect.any(Object),
                ruleProcessor: expect.any(Object)
            });
        });

        test('getDebugInfo', () => {
             expect(reasoner.getDebugInfo()).toMatchObject({
                state: expect.any(Object),
                config: expect.any(Object),
                metrics: expect.any(Object),
                componentStatus: expect.any(Object),
                timestamp: expect.any(Number)
            });
        });

        test('getPerformanceMetrics', () => {
            expect(reasoner.getPerformanceMetrics()).toMatchObject({
                throughput: expect.any(Number),
                avgProcessingTime: expect.any(Number),
                memoryUsage: expect.any(Number),
                detailed: expect.any(Object)
            });
        });
    });

    describe('Lifecycle', () => {
        test('start/stop', async () => {
            expect(reasoner.isRunning).toBe(false);
            reasoner.start();
            expect(reasoner.isRunning).toBe(true);
            await reasoner.stop();
            expect(reasoner.isRunning).toBe(false);
        });

        test('start warn if running', () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
            reasoner.start();
            reasoner.start();
            expect(warn).toHaveBeenCalledWith('Reasoner is already running');
            warn.mockRestore();
        });

        test('step', async () => {
            reasoner.start();
            expect(await reasoner.step(100)).toBeDefined();
        });

        test('cleanup', async () => {
            reasoner.start();
            await reasoner.cleanup();
            expect(reasoner.isRunning).toBe(false);
            expect(reasoner._outputStream).toBeNull();
            expect(reasoner.metrics.totalDerivations).toBe(0);
        });
    });

    describe('Feedback', () => {
        test('registerConsumerFeedbackHandler', () => {
            const handler = jest.fn();
            reasoner.registerConsumerFeedbackHandler(handler);

            const deriv = {id: 'test'};
            reasoner.notifyConsumption(deriv, 10, {consumerId: 'test-consumer'});

            expect(handler).toHaveBeenCalledWith(deriv, 10, expect.objectContaining({
                consumerId: 'test-consumer',
                timestamp: expect.any(Number),
                queueLength: expect.any(Number)
            }));
        });

        test('receiveConsumerFeedback', () => {
            reasoner.receiveConsumerFeedback({ processingSpeed: 5, backlogSize: 20, consumerId: 'test-consumer' });
            expect(reasoner.outputConsumerSpeed).toBe(5);
            expect(reasoner.performance.backpressureLevel).toBe(20);
        });
    });
});
