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

    test('initialization', () => {
        expect(lm.providers).toBeInstanceOf(ProviderRegistry);
        expect(lm.modelSelector).toBeDefined();
        expect(lm.narseseTranslator).toBeDefined();
        expect(lm.config).toEqual({});
    });

    test('registration', () => {
        const provider = new DummyProvider({id: 'p1'});
        lm.registerProvider('p1', provider);
        expect(lm.providers.get('p1')).toBe(provider);
    });

    test('metrics', () => {
        expect(lm.getMetrics()).toMatchObject({providerCount: 1, lmStats: expect.any(Object)});
    });

    test('generateText', async () => {
        lm.registerProvider('gen', new DummyProvider({responseTemplate: 'Gen: {prompt}'}));
        expect(await lm.generateText('Hi', {}, 'gen')).toBe('Gen: Hi');
        await expect(lm.generateText('Hi', {}, '404')).rejects.toThrow();
    });

    test('generateEmbedding', async () => {
        lm.registerProvider('emb', new DummyProvider({id: 'emb'}));
        expect(await lm.generateEmbedding('Hi', 'emb')).toHaveLength(16);
    });

    test('processing & translation', async () => {
        lm.registerProvider('proc', new DummyProvider({responseTemplate: 'Proc: {prompt}'}));
        expect(await lm.process('Hi', {}, 'proc')).toBe('Proc: Hi');
        expect(lm.translateToNarsese('cat is a mammal')).toEqual(expect.stringMatching(/cat.*-->.*mammal/));
        expect(lm.translateFromNarsese('(dog --> animal).')).toContain('dog');
    });

    test('model utils', () => {
        expect(lm.selectOptimalModel({type: 'test'})).toBe('test-provider');
        expect(lm.getAvailableModels()).toHaveLength(1);
        expect(lm.lmStats._countTokens('a b')).toBe(2);
    });

    describe('Interface Compatibility', () => {
        test.each([
            ['generateText', {generateText: jest.fn().mockResolvedValue('res')}],
            ['invoke object', {invoke: jest.fn().mockResolvedValue({content: 'res'})}],
            ['invoke string', {invoke: jest.fn().mockResolvedValue('res')}],
            ['generate', {generate: jest.fn().mockResolvedValue('res')}]
        ])('%s', async (_, mock) => {
            lm.registerProvider('p', mock);
            expect(await lm.generateText('t', {}, 'p')).toBe('res');
        });

        test('fail if no method', async () => {
            lm.registerProvider('p', {});
            await expect(lm.generateText('t', {}, 'p')).rejects.toThrow();
        });

        test.each([
            ['streamText', {streamText: jest.fn().mockResolvedValue('res')}],
            ['stream', {stream: jest.fn().mockResolvedValue('res')}]
        ])('%s', async (_, mock) => {
            lm.registerProvider('p', mock);
            expect(await lm.streamText('t', {}, 'p')).toBe('res');
        });
    });
});
