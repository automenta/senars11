import {LM} from '../../../src/lm/LM.js';
import {jest} from '@jest/globals';

describe('LM Interface Compatibility', () => {
    let lm;

    beforeEach(async () => {
        lm = new LM();
        await lm.initialize();
    });

    test('generateText should support provider with generateText method', async () => {
        const provider = {
            generateText: jest.fn().mockResolvedValue('response-generateText')
        };
        lm.registerProvider('p1', provider);
        const result = await lm.generateText('test', {}, 'p1');
        expect(result).toBe('response-generateText');
        expect(provider.generateText).toHaveBeenCalledWith('test', {});
    });

    test('generateText should support provider with invoke method (LangChain style)', async () => {
        const provider = {
            invoke: jest.fn().mockResolvedValue({content: 'response-invoke'})
        };
        lm.registerProvider('p2', provider);
        const result = await lm.generateText('test', {}, 'p2');
        expect(result).toBe('response-invoke');
        expect(provider.invoke).toHaveBeenCalledWith('test', {});
    });

    test('generateText should support provider with invoke method returning string', async () => {
        const provider = {
            invoke: jest.fn().mockResolvedValue('response-invoke-string')
        };
        lm.registerProvider('p3', provider);
        const result = await lm.generateText('test', {}, 'p3');
        expect(result).toBe('response-invoke-string');
    });

    test('generateText should support provider with generate method', async () => {
        const provider = {
            generate: jest.fn().mockResolvedValue('response-generate')
        };
        lm.registerProvider('p4', provider);
        const result = await lm.generateText('test', {}, 'p4');
        expect(result).toBe('response-generate');
    });

    test('generateText should throw if no supported method found', async () => {
        const provider = {};
        lm.registerProvider('p5', provider);
        await expect(lm.generateText('test', {}, 'p5')).rejects.toThrow('Provider missing generation method');
    });

    test('streamText should support provider with streamText method', async () => {
        const provider = {
            streamText: jest.fn().mockResolvedValue('stream-result')
        };
        lm.registerProvider('p6', provider);
        const result = await lm.streamText('test', {}, 'p6');
        expect(result).toBe('stream-result');
    });

    test('streamText should support provider with stream method', async () => {
        const provider = {
            stream: jest.fn().mockResolvedValue('stream-result-2')
        };
        lm.registerProvider('p7', provider);
        const result = await lm.streamText('test', {}, 'p7');
        expect(result).toBe('stream-result-2');
    });
});
