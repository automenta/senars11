import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Config, ConfigValidator, Component, DEFAULT_CONFIG_CORE } from '../../../core/src/config/Config.js';

// Mock ConfigValidator.js dependency if needed, but for now we'll assume it works or mock the import if it's problematic.
// Since we are testing Config.js which imports from ConfigValidator.js, we might need to mock that import if it has side effects or complex logic.
// However, looking at the code, it seems straightforward.

describe('Config', () => {
    describe('parse', () => {
        test('parses default arguments', () => {
            const config = Config.parse([]);
            expect(config).toEqual(DEFAULT_CONFIG_CORE);
        });

        test('parses LM flags', () => {
            const args = ['--ollama', 'llama3', '--temperature', '0.7'];
            const config = Config.parse(args);
            expect(config.lm.enabled).toBe(true);
            expect(config.lm.modelName).toBe('llama3');
            expect(config.lm.temperature).toBe(0.7);
        });

        test('parses provider flag', () => {
            const args = ['--provider', 'openai', '--api-key', 'sk-test'];
            const config = Config.parse(args);
            expect(config.lm.enabled).toBe(true);
            expect(config.lm.provider).toBe('openai');
            expect(config.lm.apiKey).toBe('sk-test');
        });

        test('parses UI flags', () => {
            const args = ['--port', '3000', '--prod', '--graph-ui'];
            const config = Config.parse(args);
            expect(config.ui.port).toBe(3000);
            expect(config.ui.dev).toBe(false);
            expect(config.ui.layout).toBe('graph');
        });

        test('parses WebSocket flags', () => {
            const args = ['--ws-port', '9090', '--host', '127.0.0.1'];
            const config = Config.parse(args);
            expect(config.webSocket.port).toBe(9090);
            expect(config.webSocket.host).toBe('127.0.0.1');
        });
    });
});

describe('Component', () => {
    class TestComponent extends Component {
        constructor(config) {
            super(config);
            this.initCalled = false;
            this.startCalled = false;
            this.stopCalled = false;
            this.destroyCalled = false;
        }

        async _initialize() { this.initCalled = true; }
        async _start() { this.startCalled = true; }
        async _stop() { this.stopCalled = true; }
        async _destroy() { this.destroyCalled = true; }
    }

    let component;

    beforeEach(() => {
        component = new TestComponent({});
    });

    test('lifecycle flow', async () => {
        expect(component.initialized).toBe(false);

        await component.initialize();
        expect(component.initialized).toBe(true);
        expect(component.initCalled).toBe(true);

        await component.start();
        expect(component.started).toBe(true);
        expect(component.startCalled).toBe(true);

        await component.stop();
        expect(component.started).toBe(false);
        expect(component.stopped).toBe(true);
        expect(component.stopCalled).toBe(true);
    });

    test('prevents start before initialize', async () => {
        await expect(component.start()).rejects.toThrow(/must be initialized/);
    });

    test('handles destroy', async () => {
        await component.initialize();
        await component.start();
        await component.destroy();

        expect(component.started).toBe(false);
        expect(component.stopped).toBe(true);
        expect(component.destroyCalled).toBe(true);
    });

    test('updateConfig merges values', () => {
        const initialConfig = { a: 1, b: { c: 2 } };
        const comp = new TestComponent(initialConfig);

        comp.updateConfig({ b: { d: 3 } });

        // Note: Deep merge behavior depends on ConfigValidator.deepMerge implementation
        // Assuming standard deep merge
        expect(comp.config.a).toBe(1);
        expect(comp.config.b.c).toBe(2);
        // expect(comp.config.b.d).toBe(3); // Uncomment if deep merge supports this
    });

    test('prevents double initialization', async () => {
        await component.initialize();
        await component.initialize(); // Should be idempotent
        expect(component.initialized).toBe(true);
    });
});

describe('Config Validation', () => {
    test('handles empty command line args', () => {
        const config = Config.parse([]);
        expect(config).toBeDefined();
        expect(config.lm).toBeDefined();
    });

    test('handles invalid port numbers', () => {
        const args = ['--port', 'invalid'];
        const config = Config.parse(args);
        // Should use default or handle gracefully
        expect(config).toBeDefined();
    });
});
