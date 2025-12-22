import {describe, expect, test} from '@jest/globals';
import {LangChainProvider} from '../../../core/src/lm/LangChainProvider.js';

describe('LangChainProvider', () => {
    const providers = [
        ['ollama', {provider: 'ollama', modelName: 'llama2', baseURL: 'http://localhost:11434'}, 'llama2'],
        ['openai', {provider: 'openai', modelName: 'gpt-3.5-turbo', apiKey: 'test-key'}, 'gpt-3.5-turbo']
    ];

    test.each(providers)('initializes %s provider correctly', (providerType, config, modelName) => {
        const provider = new LangChainProvider(config);
        expect(provider.providerType).toBe(providerType);
        expect(provider.getModelName()).toBe(modelName);
    });

    const errorCases = [
        ['missing modelName', {}, 'modelName is required'],
        ['OpenAI without API key', {provider: 'openai', modelName: 'gpt-3.5-turbo'}, 'API key is required'],
        ['unsupported provider', {provider: 'unsupported', modelName: 'test-model'}, 'Unsupported provider type']
    ];

    test.each(errorCases)('throws error for %s', (_, config, expectedError) =>
        expect(() => new LangChainProvider(config)).toThrow(expectedError)
    );
});
