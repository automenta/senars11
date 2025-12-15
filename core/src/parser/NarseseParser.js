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

            // Post-processing for Negation Simplification
            // If term is --(A), replace with A and invert truth
            if (result.term && result.term.operator === '--' && result.term.components.length === 1) {
                const innerTerm = result.term.components[0];

                // Only apply if truth is present (otherwise it's just a term structure)
                if (result.truthValue) {
                    // Import Truth dynamically to avoid circular deps if any, or assume global/imported
                    // Since Truth is not imported in this file, we need to import it or pass it.
                    // However, Truth is a value object. We can do the math directly or import Truth.
                    // Let's import Truth at the top of the file.

                    // Actually, let's just do the math here to be safe and simple, 
                    // or better, add Truth import.
                    // I will add Truth import in a separate step if needed, but for now let's assume I can add it.
                    // Wait, I can't add import easily with replace_file_content if I'm only replacing this block.
                    // I'll use the math directly: f' = 1 - f

                    result.term = innerTerm;
                    result.truthValue = {
                        frequency: 1 - result.truthValue.frequency,
                        confidence: result.truthValue.confidence
                    };
                }
            }

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
