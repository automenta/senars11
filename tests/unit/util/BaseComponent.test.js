import {BaseComponent} from '../../../src/util/BaseComponent.js';
import {EventBus} from '../../../src/util/EventBus.js';

describe('BaseComponent', () => {
    class TestComponent extends BaseComponent {
        constructor(config = {}, name = 'TestComponent', eventBus = null) {
            super(config, name, eventBus);
            this.testValue = 0;
        }
        async _initialize() { this.testValue = 10; return true; }
        async _start() { this.testValue = 20; return true; }
        async _stop() { this.testValue = 30; return true; }
        async _dispose() { this.testValue = 40; return true; }
    }

    test('constructor initializes properly', () => {
        const component = new TestComponent();
        expect(component).toMatchObject({
            name: 'TestComponent',
            config: {},
            eventBus: expect.any(EventBus),
            isInitialized: false,
            isStarted: false,
            isDisposed: false
        });
        expect(component.logger).toBeDefined();
    });

    test('initialize lifecycle method works', async () => {
        const component = new TestComponent();
        expect(await component.initialize()).toBe(true);
        expect(component.isInitialized).toBe(true);
        expect(component.testValue).toBe(10);
    });

    test('start lifecycle method works', async () => {
        const component = new TestComponent();
        await component.initialize();

        expect(await component.start()).toBe(true);
        expect(component.isStarted).toBe(true);
        expect(component.testValue).toBe(20);
    });

    test('stop lifecycle method works', async () => {
        const component = new TestComponent();
        await component.initialize();
        await component.start();

        expect(await component.stop()).toBe(true);
        expect(component.isStarted).toBe(false);
        expect(component.testValue).toBe(30);
    });

    test('dispose lifecycle method works', async () => {
        const component = new TestComponent();
        await component.initialize();
        await component.start();

        expect(await component.dispose()).toBe(true);
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
        ['logInfo', 'logWarn', 'logError', 'logDebug'].forEach(method => {
            expect(() => component[method]('test')).not.toThrow();
        });
    });

    test('event emission and subscription works', (done) => {
        const component = new TestComponent();
        const testEvent = 'test.event';

        component.onEvent(testEvent, (data) => {
            expect(data).toMatchObject({
                component: 'TestComponent',
                testValue: 'testData'
            });
            done();
        });

        component.emitEvent(testEvent, {testValue: 'testData'});
    });

    test('getMetrics returns expected structure', () => {
        expect(new TestComponent().getMetrics()).toMatchObject({
            initializeCount: expect.any(Number),
            startCount: expect.any(Number),
            stopCount: expect.any(Number),
            errorCount: expect.any(Number),
            uptime: expect.any(Number),
            isRunning: expect.any(Boolean)
        });
    });

    test('uptime property works', async () => {
        const component = new TestComponent();
        expect(component.uptime).toBe(0);

        await component.initialize();
        await component.start();

        expect(component.uptime).toBeGreaterThanOrEqual(0);
    });
});
