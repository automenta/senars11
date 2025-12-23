import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Component, Config, DEFAULT_CONFIG_CORE } from '../../../core/src/config/Config.js';

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

const { ConfigManager, DEFAULT_CONFIG } = await import('../../../core/src/config/ConfigManager.js');


describe('Config', () => {
    describe('parse', () => {
        test('parses default arguments', () =>
            expect(Config.parse([])).toEqual(DEFAULT_CONFIG_CORE)
        );

        const parseTests = [
            {
                name: 'LM flags',
                args: ['--ollama', 'llama3', '--temperature', '0.7'],
                expect: (config) => {
                    expect(config.lm.enabled).toBe(true);
                    expect(config.lm.modelName).toBe('llama3');
                    expect(config.lm.temperature).toBe(0.7);
                }
            },
            {
                name: 'provider flag',
                args: ['--provider', 'openai', '--api-key', 'sk-test'],
                expect: (config) => {
                    expect(config.lm.enabled).toBe(true);
                    expect(config.lm.provider).toBe('openai');
                    expect(config.lm.apiKey).toBe('sk-test');
                }
            },
            {
                name: 'UI flags',
                args: ['--port', '3000', '--prod', '--graph-ui'],
                expect: (config) => {
                    expect(config.ui.port).toBe(3000);
                    expect(config.ui.dev).toBe(false);
                    expect(config.ui.layout).toBe('graph');
                }
            },
            {
                name: 'WebSocket flags',
                args: ['--ws-port', '9090', '--host', '127.0.0.1'],
                expect: (config) => {
                    expect(config.webSocket.port).toBe(9090);
                    expect(config.webSocket.host).toBe('127.0.0.1');
                }
            }
        ];

        test.each(parseTests)('parses $name', ({ args, expect: expectFn }) =>
            expectFn(Config.parse(args))
        );
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

        async _initialize() {
            this.initCalled = true;
        }

        async _start() {
            this.startCalled = true;
        }

        async _stop() {
            this.stopCalled = true;
        }

        async _destroy() {
            this.destroyCalled = true;
        }
    }

    let component;

    beforeEach(() => component = new TestComponent({}));

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

    test('prevents start before initialize', async () =>
        await expect(component.start()).rejects.toThrow(/must be initialized/)
    );

    test('handles destroy', async () => {
        await component.initialize();
        await component.start();
        await component.destroy();
        expect(component.started).toBe(false);
        expect(component.stopped).toBe(true);
        expect(component.destroyCalled).toBe(true);
    });

    test('updateConfig merges values', () => {
        const comp = new TestComponent({ a: 1, b: { c: 2 } });
        comp.updateConfig({ b: { d: 3 } });
        expect(comp.config.a).toBe(1);
        expect(comp.config.b.c).toBe(2);
    });

    test('prevents double initialization', async () => {
        await component.initialize();
        await component.initialize();
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
        const config = Config.parse(['--port', 'invalid']);
        expect(config).toBeDefined();
    });
});

describe('ConfigManager', () => {
    let configManager;

    beforeEach(() => {
        jest.clearAllMocks();
        configManager = new ConfigManager();
    });

    test('initializes with default config', () => {
        expect(configManager._config).toMatchObject(DEFAULT_CONFIG);
        expect(configManager._config.memory.focusSetSize).toBe(100);
    });

    test('updates config values', () => {
        configManager.update({ lm: { enabled: true } });
        expect(configManager._config.lm.enabled).toBe(true);
    });

    test('validates config on update', () => {
        const result = configManager.update({ webSocket: { port: 1234 } });
        expect(result).toBe(configManager);
    });
});
