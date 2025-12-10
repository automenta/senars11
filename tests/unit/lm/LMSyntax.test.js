import {LangChainProvider} from '../../../core/src/lm/LangChainProvider.js';
import {HuggingFaceProvider} from '../../../core/src/lm/HuggingFaceProvider.js';
import {AdvancedNarseseTranslator} from '../../../core/src/lm/AdvancedNarseseTranslator.js';

describe('Module Syntax Check', () => {
    test('should import modules without syntax errors', () => {
        [LangChainProvider, HuggingFaceProvider, AdvancedNarseseTranslator]
            .forEach(provider => expect(provider).toBeDefined());
    });
});
