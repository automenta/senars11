/**
 * @file tests/unit/lm/LangChainProvider.test.js
 * @description Unit tests for LangChainProvider
 */

import {LangChainProvider} from '../../../src/lm/LangChainProvider.js';

describe('LangChainProvider', () => {
    describe('constructor', () => {
        test.each([
            ['ollama', {provider: 'ollama', modelName: 'llama2', baseURL: 'http://localhost:11434'}, 'llama2'],
            ['openai', {provider: 'openai', modelName: 'gpt-3.5-turbo', apiKey: 'test-key'}, 'gpt-3.5-turbo']
        ])('initializes %s provider correctly', (providerType, config, modelName) => {
            const provider = new LangChainProvider(config);
            expect(provider.providerType).toBe(providerType);
            expect(provider.getModelName()).toBe(modelName);
        });

        test('requires modelName to be specified', () => {
            expect(() => new LangChainProvider({})).toThrow('modelName is required for LangChainProvider');
        });

        test('throws error for OpenAI without API key', () => {
            const config = {provider: 'openai', modelName: 'gpt-3.5-turbo'};
            expect(() => new LangChainProvider(config)).toThrow('API key is required for OpenAI provider');
        });

        test('throws error for unsupported provider', () => {
            const config = {provider: 'unsupported', modelName: 'test-model'};
            expect(() => new LangChainProvider(config)).toThrow('Unsupported provider type: unsupported');
        });
    });
});
