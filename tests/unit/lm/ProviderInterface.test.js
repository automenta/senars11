import { describe, expect, test } from '@jest/globals';
import { DummyProvider } from '../../../core/src/lm/DummyProvider.js';
import { HuggingFaceProvider } from '../../../core/src/lm/HuggingFaceProvider.js';
import { LangChainProvider } from '../../../core/src/lm/LangChainProvider.js';

describe('LM Provider Interface', () => {
    const providers = [
        {
            name: 'DummyProvider',
            factory: () => new DummyProvider(),
            config: {},
            expectedId: 'dummy'
        },
        {
            name: 'HuggingFaceProvider',
            factory: () => new HuggingFaceProvider({ modelName: 'test-model' }),
            config: { modelName: 'test-model' },
            expectedId: undefined
        },
        {
            name: 'LangChainProvider (ollama)',
            factory: () => new LangChainProvider({ provider: 'ollama', modelName: 'llama2', baseURL: 'http://localhost:11434' }),
            config: { provider: 'ollama', modelName: 'llama2', baseURL: 'http://localhost:11434' },
            expectedModelName: 'llama2'
        }
    ];

    describe('Initialization', () => {
        test.each(providers)('$name initializes correctly', ({ factory, expectedId }) => {
            const provider = factory();
            expect(provider).toBeDefined();
            if (expectedId) {
                expect(provider.id).toBe(expectedId);
            }
        });
    });

    describe('Model Name Retrieval', () => {
        test.each(providers.filter(p => p.expectedModelName))('$name returns model name', ({ factory, expectedModelName }) => {
            const provider = factory();
            expect(provider.getModelName()).toBe(expectedModelName);
        });
    });

    describe('Text Generation Interface', () => {
        test('DummyProvider generates text', async () => {
            const provider = new DummyProvider();
            const result = await provider.generateText('test prompt');
            expect(result).toMatch(/.+/);
        });

        test('DummyProvider streams text', async () => {
            const provider = new DummyProvider();
            let fullText = '';
            for await (const chunk of provider.streamText('test prompt')) {
                fullText += chunk;
            }
            expect(fullText).toMatch(/.+/);
        });
    });

    describe('Configuration Validation', () => {
        const errorCases = [
            {
                name: 'LangChainProvider - missing modelName',
                factory: () => new LangChainProvider({}),
                expectedError: 'modelName is required'
            },
            {
                name: 'LangChainProvider - OpenAI without API key',
                factory: () => new LangChainProvider({ provider: 'openai', modelName: 'gpt-3.5-turbo' }),
                expectedError: 'API key is required'
            },
            {
                name: 'LangChainProvider - unsupported provider',
                factory: () => new LangChainProvider({ provider: 'unsupported', modelName: 'test-model' }),
                expectedError: 'Unsupported provider type'
            }
        ];

        test.each(errorCases)('$name throws error', ({ factory, expectedError }) => {
            expect(factory).toThrow(expectedError);
        });
    });

    describe('Tool Support', () => {
        test('DummyProvider handles tools in config', async () => {
            const provider = new DummyProvider({ tools: [{ name: 'test_tool', description: 'test' }] });
            const result = await provider.generateText('Use test_tool');
            expect(result).toMatch(/.+/);
        });
    });
});
