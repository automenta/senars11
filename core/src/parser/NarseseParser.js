import { parse } from './peggy-parser.js';
import { TermFactory } from '../term/TermFactory.js';

export class NarseseParser {
    constructor(termFactory) {
        this.termFactory = termFactory || new TermFactory();
        this._parseCache = new Map();
        this._maxCacheSize = 1000;
    }

    parse(input) {
        if (typeof input !== 'string' || input.trim() === '') {
            throw new Error('Input must be a non-empty string');
        }

        if (this._parseCache.has(input)) {
            return this._parseCache.get(input);
        }

        try {
            const result = parse(input, { termFactory: this.termFactory });

            if (result.term?.operator === '--' && result.term.components.length === 1 && result.truthValue) {
                result.term = result.term.components[0];
                result.truthValue = {
                    frequency: 1 - result.truthValue.frequency,
                    confidence: result.truthValue.confidence
                };
            }

            if (this._parseCache.size < this._maxCacheSize) {
                this._parseCache.set(input, result);
            }

            return result;
        } catch (error) {
            throw new Error(`Narsese parsing failed: ${error.message}`);
        }
    }

    clearCache() {
        this._parseCache.clear();
    }

    getCacheStats() {
        return {
            size: this._parseCache.size,
            maxSize: this._maxCacheSize
        };
    }
}
