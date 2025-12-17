import { describe, test, expect } from '@jest/globals';
import { HuggingFaceProvider } from '../../../core/src/lm/HuggingFaceProvider.js';

describe('HuggingFaceProvider', () => {
    test('initializes with correct configuration and defaults', () => {
        const provider = new HuggingFaceProvider({
            modelName: 'sshleifer/distilbart-cnn-12-6',
            temperature: 0.7,
            maxTokens: 100
        });

        expect(provider.getModelName()).toBe('sshleifer/distilbart-cnn-12-6');
        expect(provider.temperature).toBe(0.7);
        expect(provider.maxTokens).toBe(100);
        expect(provider.modelType).toBe('generic');
    });

    test('uses default values when not specified', () => {
        const provider = new HuggingFaceProvider({});
        expect(provider.modelName).toBeDefined();
        expect(provider.temperature).toBeDefined();
        expect(provider.maxTokens).toBeDefined();
    });

    const modelTypes = [
        ['MobileBERT/mobilebert-uncased', 'mobilebert'],
        ['HuggingFaceTB/SmolLM-135M', 'smollm'],
        ['sshleifer/distilbart-cnn-12-6', 'generic']
    ];

    test.each(modelTypes)('identifies model type for %s as %s', (modelName, expectedType) => {
        const provider = new HuggingFaceProvider({ modelName });
        expect(provider.modelType).toBe(expectedType);
    });
});
