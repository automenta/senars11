import {describe, expect, test} from '@jest/globals';
import {validateConfig, validateConfigWithDefaults} from '../../../core/src/config/ConfigSchemas.js';

describe('ConfigSchemas', () => {
    describe('validateConfig', () => {
        test('validates a correct minimal config', () => {
            const result = validateConfig({memory: {capacity: 1000}});
            expect(result.error).toBeNull();
            expect(result.value.memory.capacity).toBe(1000);
        });

        test('returns error for invalid config', () => {
            const result = validateConfig({memory: {capacity: -1}});
            expect(result.error).not.toBeNull();
            expect(result.value).toBeNull();
        });
    });

    describe('validateConfigWithDefaults', () => {
        test('returns validated config with defaults', () => {
            const result = validateConfigWithDefaults({});
            expect(result.memory.capacity).toBe(1000);
            result.system && expect(result.system.port).toBeDefined();
        });

        test('throws error for invalid config', () =>
            expect(() => validateConfigWithDefaults({cycle: {delay: -10}}))
                .toThrow(/validation failed/i)
        );
    });

    describe('Schema Specifics', () => {
        test('validates nested objects', () => {
            const result = validateConfigWithDefaults({
                lm: {
                    enabled: true,
                    providers: {
                        test: {
                            name: 'Test',
                            model: 'gpt-4',
                            baseURL: 'http://localhost:8080'
                        }
                    }
                }
            });
            expect(result.lm.enabled).toBe(true);
            expect(result.lm.providers.test.model).toBe('gpt-4');
        });

        test('allows passthrough for unknown keys', () => {
            const result = validateConfigWithDefaults({
                extra: 'value',
                memory: {custom: 123}
            });
            expect(result.extra).toBe('value');
            expect(result.memory.custom).toBe(123);
        });
    });
});
