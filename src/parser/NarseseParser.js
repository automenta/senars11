import {parse} from './peggy-parser.js';
import {TermFactory} from '../term/TermFactory.js';

/**
 * Unified Narsese Parser
 * Provides parsing capabilities for Narsese syntax with integration to TermFactory
 */
export class NarseseParser {
    /**
     * Creates a new Narsese parser instance
     * @param {TermFactory} termFactory - Factory for creating terms
     */
    constructor(termFactory) {
        this.termFactory = termFactory || new TermFactory();
        this._parseCache = new Map();
        this._maxCacheSize = 1000; // Limit cache size to prevent memory issues
    }

    /**
     * Parses a Narsese string into structured representation
     * @param {string} input - The Narsese string to parse
     * @returns {object} Parsed representation of the input
     * @throws {Error} If input is invalid
     */
    parse(input) {
        if (typeof input !== 'string' || input.trim() === '') {
            throw new Error('Input must be a non-empty string');
        }

        // Check cache first for repeat inputs
        if (this._parseCache.has(input)) {
            return this._parseCache.get(input);
        }

        try {
            const result = parse(input, {termFactory: this.termFactory});

            // Add to cache if cache size is under limit
            if (this._parseCache.size < this._maxCacheSize) {
                this._parseCache.set(input, result);
            }

            return result;
        } catch (error) {
            throw new Error(`Narsese parsing failed: ${error.message}`);
        }
    }

    /**
     * Clear the parse cache
     */
    clearCache() {
        this._parseCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this._parseCache.size,
            maxSize: this._maxCacheSize
        };
    }
}
