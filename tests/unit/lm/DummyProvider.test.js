import { describe, test, expect, beforeEach } from '@jest/globals';
import { DummyProvider } from '../../../core/src/lm/DummyProvider.js';

describe('DummyProvider', () => {
    let provider;

    beforeEach(() => provider = new DummyProvider());

    test('initializes correctly', () => expect(provider.id).toBe('dummy'));

    test('generates text', async () => {
        const result = await provider.generateText('Hello');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    test('streams text', async () => {
        let fullText = '';
        for await (const chunk of provider.streamText('Hello')) {
            fullText += chunk;
        }
        expect(fullText.length).toBeGreaterThan(0);
    });

    test('handles tools (mock)', async () => {
        provider = new DummyProvider({ tools: [{ name: 'test_tool', description: 'test' }] });
        const result = await provider.generateText('Use test_tool');
        expect(result).toBeDefined();
    });
});
