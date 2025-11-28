import { LangChainProvider } from '../src/lm/LangChainProvider.js';
import { HuggingFaceProvider } from '../src/lm/HuggingFaceProvider.js';
import { AdvancedNarseseTranslator } from '../src/lm/AdvancedNarseseTranslator.js';

describe('Module Syntax Check', () => {
    test('should import modules without syntax errors', () => {
        [LangChainProvider, HuggingFaceProvider, AdvancedNarseseTranslator]
            .forEach(provider => expect(provider).toBeDefined());
    });
});