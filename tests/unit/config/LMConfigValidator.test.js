import { describe, test, expect } from '@jest/globals';
import { validateLMConfig } from '../../../core/src/config/LMConfigValidator.js';

describe('LMConfigValidator', () => {
    test('validates valid LM config', () => {
        const config = {
            provider: 'openai',
            apiKey: 'sk-test',
            modelName: 'gpt-4',
            temperature: 0.7
        };
        const result = validateLMConfig(config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('validates valid Ollama config', () => {
        const config = {
            provider: 'ollama',
            modelName: 'llama2',
            baseUrl: 'http://localhost:11434'
        };
        const result = validateLMConfig(config);
        expect(result.isValid).toBe(true);
    });

    test('detects missing required fields', () => {
        const config = {
            provider: 'openai'
            // Missing apiKey and modelName
        };
        const result = validateLMConfig(config);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringMatching(/apiKey/));
        expect(result.errors).toContainEqual(expect.stringMatching(/modelName/));
    });

    test('detects invalid provider', () => {
        const config = {
            provider: 'unknown-provider'
        };
        const result = validateLMConfig(config);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringMatching(/provider/));
    });

    test('validates temperature range', () => {
        const config = {
            provider: 'openai',
            apiKey: 'sk-test',
            modelName: 'gpt-4',
            temperature: 2.0 // Invalid
        };
        const result = validateLMConfig(config);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringMatching(/temperature/));
    });
});
