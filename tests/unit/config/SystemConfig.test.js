import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SystemConfig } from '../../../core/src/config/SystemConfig.js';
// We need to access the internal DEFAULT_CONFIG which is not exported, 
// so we'll test against the expected structure or export it if possible.
// Looking at SystemConfig.js, DEFAULT_CONFIG is not exported.
// We should export it for testing purposes or reconstruct the expected object.
// Let's modify SystemConfig.js to export DEFAULT_CONFIG first.
import { DEFAULT_CONFIG } from '../../../core/src/config/SystemConfig.js';

describe('SystemConfig', () => {
    let systemConfig;

    beforeEach(() => {
        systemConfig = new SystemConfig();
    });

    test('initializes with default config', () => {
        expect(systemConfig._config).toMatchObject(DEFAULT_CONFIG);
    });

    test('validates valid configuration', () => {
        const validConfig = {
            memory: { capacity: 5000 },
            lm: { enabled: true }
        };
        // Should not throw
        expect(() => new SystemConfig(validConfig)).not.toThrow();
    });

    test('detects invalid configuration', () => {
        const invalidConfig = {
            memory: { capacity: -100 } // Invalid capacity
        };
        expect(() => new SystemConfig(invalidConfig)).toThrow(/validation failed/);
    });

    test('gets nested config values', () => {
        expect(systemConfig.get('memory.capacity')).toBe(1000); // Default
    });

    test('returns undefined for non-existent paths', () => {
        expect(systemConfig.get('non.existent.path')).toBeUndefined();
    });
});
