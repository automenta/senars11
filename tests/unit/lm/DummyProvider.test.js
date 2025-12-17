import { describe, test, expect, beforeEach } from '@jest/globals';
import { DummyProvider } from '../../../core/src/lm/DummyProvider.js';

describe('DummyProvider', () => {
    let provider;

    beforeEach(() => {
        provider = new DummyProvider();
    });

    test('initializes correctly', () => {
        expect(provider.id).toBe('dummy');
    });

    test('generates text', async () => {
        const prompt = 'Hello';
        const result = await provider.generateText(prompt);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    test('streams text', async () => {
        const prompt = 'Hello';
        const stream = provider.streamText(prompt);
        let fullText = '';

        for await (const chunk of stream) {
            fullText += chunk;
        }

        expect(fullText.length).toBeGreaterThan(0);
    });

    test('handles tools (mock)', async () => {
        // DummyProvider might not implement tool logic deeply, but should not crash
        const tools = [{ name: 'test_tool', description: 'test' }];
        provider = new DummyProvider({ tools });
        const result = await provider.generateText('Use test_tool');
        expect(result).toBeDefined();
    });
});
