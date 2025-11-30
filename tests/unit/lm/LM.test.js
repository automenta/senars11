import {LM} from '../../../src/lm/LM.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';
import {ProviderRegistry} from '../../../src/lm/ProviderRegistry.js';
import {jest} from '@jest/globals';

describe('LM', () => {
    let lm;

    beforeEach(async () => {
        lm = new LM();
        await lm.initialize();
        lm.registerProvider('test-provider', new DummyProvider({id: 'test-provider'}));
    });

    test('should initialize with default properties', () => {
        expect(lm.providers).toBeInstanceOf(ProviderRegistry);
        expect(lm.modelSelector).toBeDefined();
        expect(lm.narseseTranslator).toBeDefined();
        expect(lm.metrics).toBeDefined();
        expect(lm.activeWorkflows).toBeInstanceOf(Map);
        expect(lm.config).toEqual({});
        expect(lm.lmStats).toBeDefined();
    });

    test('should register a provider', () => {
        const provider = new DummyProvider({id: 'test-provider'});
        lm.registerProvider('additional-provider', provider);

        expect(lm.providers.get('additional-provider')).toBe(provider);
    });

    test('should get metrics', () => {
        expect(lm.getMetrics()).toMatchObject({
            providerCount: 1,
            lmStats: expect.any(Object),
            providerUsage: expect.any(Object)
        });
    });

    test('should handle generateText when provider exists', async () => {
        lm.registerProvider('gen-provider', new DummyProvider({
            id: 'gen-provider',
            responseTemplate: 'Generated: {prompt}'
        }));

        expect(await lm.generateText('Hello, world!', {}, 'gen-provider'))
            .toBe('Generated: Hello, world!');
    });

    test('should throw error when provider does not exist', async () => {
        await expect(lm.generateText('Hello', {}, 'non-existent')).rejects.toThrow();
    });

    test('should handle generateEmbedding when provider exists', async () => {
        lm.registerProvider('emb-provider', new DummyProvider({id: 'emb-provider'}));
        const result = await lm.generateEmbedding('Hello, world!', 'emb-provider');

        expect(result).toHaveLength(16);
    });

    test('should process text with provider', async () => {
        lm.registerProvider('proc-provider', new DummyProvider({
            id: 'proc-provider',
            responseTemplate: 'Processed: {prompt}'
        }));

        expect(await lm.process('Hello, world!', {}, 'proc-provider'))
            .toBe('Processed: Hello, world!');
    });

    test('should translate to Narsese', () => {
        expect(lm.translateToNarsese('cat is a mammal')).toEqual(expect.stringMatching(/cat.*-->.*mammal/));
    });

    test('should translate from Narsese', () => {
        const result = lm.translateFromNarsese('(dog --> animal).');
        expect(result).toContain('dog');
        expect(result).toContain('animal');
    });

    test('should select optimal model', () => {
        expect(lm.selectOptimalModel({type: 'test'})).toBe('test-provider');
    });

    test('should get available models', () => {
        expect(lm.getAvailableModels()).toHaveLength(1);
    });

    test('should count tokens correctly', () => {
        expect(lm.lmStats._countTokens('hello world')).toBe(2);
        expect(lm.lmStats._countTokens('')).toBe(0);
        expect(lm.lmStats._countTokens(null)).toBe(0);
        expect(lm.lmStats._countTokens('hello  world')).toBe(2);
    });

    describe('Interface Compatibility', () => {
        test('generateText should support provider with generateText method', async () => {
            const provider = { generateText: jest.fn().mockResolvedValue('response-generateText') };
            lm.registerProvider('p1', provider);
            const result = await lm.generateText('test', {}, 'p1');
            expect(result).toBe('response-generateText');
            expect(provider.generateText).toHaveBeenCalledWith('test', {});
        });

        test('generateText should support provider with invoke method (LangChain style)', async () => {
            const provider = { invoke: jest.fn().mockResolvedValue({content: 'response-invoke'}) };
            lm.registerProvider('p2', provider);
            const result = await lm.generateText('test', {}, 'p2');
            expect(result).toBe('response-invoke');
            expect(provider.invoke).toHaveBeenCalledWith('test', {});
        });

        test('generateText should support provider with invoke method returning string', async () => {
            const provider = { invoke: jest.fn().mockResolvedValue('response-invoke-string') };
            lm.registerProvider('p3', provider);
            expect(await lm.generateText('test', {}, 'p3')).toBe('response-invoke-string');
        });

        test('generateText should support provider with generate method', async () => {
            const provider = { generate: jest.fn().mockResolvedValue('response-generate') };
            lm.registerProvider('p4', provider);
            expect(await lm.generateText('test', {}, 'p4')).toBe('response-generate');
        });

        test('generateText should throw if no supported method found', async () => {
            const provider = {};
            lm.registerProvider('p5', provider);
            await expect(lm.generateText('test', {}, 'p5')).rejects.toThrow('Provider missing generation method');
        });

        test('streamText should support provider with streamText method', async () => {
            const provider = { streamText: jest.fn().mockResolvedValue('stream-result') };
            lm.registerProvider('p6', provider);
            expect(await lm.streamText('test', {}, 'p6')).toBe('stream-result');
        });

        test('streamText should support provider with stream method', async () => {
            const provider = { stream: jest.fn().mockResolvedValue('stream-result-2') };
            lm.registerProvider('p7', provider);
            expect(await lm.streamText('test', {}, 'p7')).toBe('stream-result-2');
        });
    });
});
