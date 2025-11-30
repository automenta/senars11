import {jest} from '@jest/globals';
import {Reasoner} from '../../../src/reason/Reasoner.js';
import {Focus} from '../../../src/memory/Focus.js';
import {createTestMemory, createTestReasoner} from '../../support/baseTestUtils.js';

describe('Reasoner', () => {
    let reasoner;
    beforeEach(() => {
        reasoner = createTestReasoner({focus: new Focus(), memory: createTestMemory()});
    });

    test('config', () => {
        expect(reasoner.config).toMatchObject({maxDerivationDepth: 10, cpuThrottleInterval: 0});
        expect(reasoner.isRunning).toBe(false);
    });

    test('metrics', () => {
        expect(reasoner.getMetrics()).toMatchObject({totalDerivations: expect.any(Number)});
        expect(reasoner.getState()).toMatchObject({isRunning: false});
        expect(reasoner.getComponentStatus()).toHaveProperty('premiseSource');
        expect(reasoner.getDebugInfo()).toHaveProperty('state');
        expect(reasoner.getPerformanceMetrics()).toHaveProperty('throughput');
    });

    test('lifecycle', async () => {
        reasoner.start();
        expect(reasoner.isRunning).toBe(true);

        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        reasoner.start();
        expect(warn).toHaveBeenCalledWith('Reasoner is already running');
        warn.mockRestore();

        expect(await reasoner.step(100)).toBeDefined();

        await reasoner.stop();
        expect(reasoner.isRunning).toBe(false);

        reasoner.start();
        await reasoner.cleanup();
        expect(reasoner.isRunning).toBe(false);
        expect(reasoner.metrics.totalDerivations).toBe(0);
    });

    test('feedback', () => {
        const handler = jest.fn();
        reasoner.registerConsumerFeedbackHandler(handler);
        reasoner.notifyConsumption({id: 'test'}, 10, {consumerId: 'c1'});
        expect(handler).toHaveBeenCalledWith({id: 'test'}, 10, expect.objectContaining({consumerId: 'c1'}));

        reasoner.receiveConsumerFeedback({processingSpeed: 5, backlogSize: 20});
        expect(reasoner.outputConsumerSpeed).toBe(5);
        expect(reasoner.performance.backpressureLevel).toBe(20);
    });

    test('adaptive processing', () => {
        reasoner.performance.backpressureLevel = 25;
        const initial = reasoner.config.cpuThrottleInterval;
        reasoner._adaptProcessingRate();
        expect(reasoner.config.cpuThrottleInterval).toBeGreaterThanOrEqual(initial);

        reasoner._updatePerformanceMetrics();
        expect(reasoner.config.cpuThrottleInterval).toBeGreaterThanOrEqual(0);
        expect(reasoner.config.backpressureInterval).toBeGreaterThanOrEqual(1);
    });
});
