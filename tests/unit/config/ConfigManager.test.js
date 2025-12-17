import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock fs module
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

// Dynamic import needed after unstable_mockModule
const { ConfigManager } = await import('../../../core/src/config/ConfigManager.js');
const { DEFAULT_CONFIG } = await import('../../../core/src/config/ConfigManager.js');
const fs = await import('fs');

describe('ConfigManager', () => {
    let configManager;

    beforeEach(() => {
        jest.clearAllMocks();
        configManager = new ConfigManager();
    });

    test('initializes with default config', () => {
        // Check that the config contains the default values
        // We use subset match because validation might add extra defaults
        expect(configManager._config).toMatchObject(DEFAULT_CONFIG);
        // Explicitly check the added default
        expect(configManager._config.memory.focusSetSize).toBe(100);
    });

    test('updates config values', () => {
        configManager.update({ lm: { enabled: true } });
        expect(configManager._config.lm.enabled).toBe(true);
    });

    test('validates config on update', () => {
        // Assuming validation logic exists in ConfigValidator which ConfigManager uses
        // This test depends on ConfigValidator implementation details
        // For now, we check if it accepts valid updates
        const validUpdate = { webSocket: { port: 1234 } };
        const result = configManager.update(validUpdate);
        expect(result).toBe(configManager); // Returns this for chaining
    });
});
