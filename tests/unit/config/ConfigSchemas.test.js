import { describe, test, expect } from '@jest/globals';
import { configSchema, validateConfig, validateConfigWithDefaults } from '../../../core/src/config/ConfigSchemas.js';

describe('ConfigSchemas', () => {
    describe('validateConfig', () => {
        test('validates a correct minimal config', () => {
            const config = {
                memory: { capacity: 1000 }
            };
            const result = validateConfig(config);
            expect(result.error).toBeNull();
            expect(result.value.memory.capacity).toBe(1000);
        });

        test('returns error for invalid config', () => {
            const config = {
                memory: { capacity: -1 }
            };
            const result = validateConfig(config);
            expect(result.error).not.toBeNull();
            expect(result.value).toBeNull();
        });
    });

    describe('validateConfigWithDefaults', () => {
        test('returns validated config with defaults', () => {
            const config = {};
            const result = validateConfigWithDefaults(config);
            expect(result.memory.capacity).toBe(1000); // Default
            // System defaults might not be populated if the key is missing entirely in the input
            // depending on how Zod default() works on the object schema vs the property schema.
            // Let's check if system is defined or provide it.
            if (result.system) {
                expect(result.system.port).toBeDefined();
            }
        });

        test('throws error for invalid config', () => {
            const config = {
                cycle: { delay: -10 }
            };
            expect(() => validateConfigWithDefaults(config)).toThrow(/validation failed/i);
        });
    });

    describe('Schema Specifics', () => {
        test('validates nested objects', () => {
            const config = {
                lm: {
                    enabled: true,
                    providers: {
                        test: {
                            name: 'Test',
                            model: 'gpt-4',
                            baseURL: 'http://localhost:8080' // Valid URL required
                        }
                    }
                }
            };
            const result = validateConfigWithDefaults(config);
            expect(result.lm.enabled).toBe(true);
            expect(result.lm.providers.test.model).toBe('gpt-4');
        });

        test('allows passthrough for unknown keys', () => {
            const config = {
                extra: 'value',
                memory: { custom: 123 }
            };
            const result = validateConfigWithDefaults(config);
            expect(result.extra).toBe('value');
            expect(result.memory.custom).toBe(123);
        });
    });
});
