import { describe, test, expect, beforeEach, jest } from '@jest/globals';

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
