import {BaseComponent} from '../../../src/util/BaseComponent.js';
import {EventBus} from '../../../src/util/EventBus.js';

describe('BaseComponent', () => {
    class TestComponent extends BaseComponent {
        constructor(config = {}, name = 'TestComponent', eventBus = null) {
            super(config, name, eventBus);
            this.testValue = 0;
        }

        async _initialize() {
            this.testValue = 10;
            return true;
        }

        async _start() {
            this.testValue = 20;
            return true;
        }

        async _stop() {
            this.testValue = 30;
            return true;
        }

        async _dispose() {
            this.testValue = 40;
            return true;
        }
    }

    test('constructor initializes properly', () => {
        const component = new TestComponent();
        expect(component.name).toBe('TestComponent');
        expect(component.config).toEqual({});
        expect(component.logger).toBeDefined();
        expect(component.eventBus).toBeInstanceOf(EventBus);
        expect(component.isInitialized).toBe(false);
        expect(component.isStarted).toBe(false);
        expect(component.isDisposed).toBe(false);
    });

    test('initialize lifecycle method works', async () => {
        const component = new TestComponent();
        const result = await component.initialize();
        
        expect(result).toBe(true);
        expect(component.isInitialized).toBe(true);
        expect(component.testValue).toBe(10);
    });

    test('start lifecycle method works', async () => {
        const component = new TestComponent();
        await component.initialize();
        
        const result = await component.start();
        expect(result).toBe(true);
        expect(component.isStarted).toBe(true);
        expect(component.testValue).toBe(20);
    });

    test('stop lifecycle method works', async () => {
        const component = new TestComponent();
        await component.initialize();
        await component.start();
        
        const result = await component.stop();
        expect(result).toBe(true);
        expect(component.isStarted).toBe(false);
        expect(component.testValue).toBe(30);
    });

    test('dispose lifecycle method works', async () => {
        const component = new TestComponent();
        await component.initialize();
        await component.start();
        
        const result = await component.dispose();
        expect(result).toBe(true);
        expect(component.isDisposed).toBe(true);
        expect(component.testValue).toBe(40);
    });

    test('metrics tracking works', () => {
        const component = new TestComponent();
        expect(component.getMetric('initializeCount')).toBe(0);

        component.incrementMetric('initializeCount');
        expect(component.getMetric('initializeCount')).toBe(1);

        component.updateMetric('testMetric', 'testValue');
        expect(component.getMetric('testMetric')).toBe('testValue');
    });

    test('logging methods work without errors', () => {
        const component = new TestComponent();
        
        // These should not throw errors
        expect(() => component.logInfo('test info')).not.toThrow();
        expect(() => component.logWarn('test warn')).not.toThrow();
        expect(() => component.logError('test error')).not.toThrow();
        expect(() => component.logDebug('test debug')).not.toThrow();
    });

    test('event emission and subscription works', (done) => {
        const component = new TestComponent();
        const testEvent = 'test.event';
        
        component.onEvent(testEvent, (data) => {
            expect(data.component).toBe('TestComponent');
            expect(data.testValue).toBe('testData');
            done();
        });
        
        component.emitEvent(testEvent, { testValue: 'testData' });
    });

    test('getMetrics returns expected structure', () => {
        const component = new TestComponent();
        const metrics = component.getMetrics();
        
        expect(metrics).toHaveProperty('initializeCount');
        expect(metrics).toHaveProperty('startCount');
        expect(metrics).toHaveProperty('stopCount');
        expect(metrics).toHaveProperty('errorCount');
        expect(metrics).toHaveProperty('uptime');
        expect(metrics).toHaveProperty('isRunning');
    });

    test('uptime property works', async () => {
        const component = new TestComponent();
        expect(component.uptime).toBe(0);
        
        await component.initialize();
        await component.start();
        
        const uptime = component.uptime;
        expect(typeof uptime).toBe('number');
        expect(uptime).toBeGreaterThanOrEqual(0);
    });
});