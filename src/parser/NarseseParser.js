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
        try {
            return parse(input, {termFactory: this.termFactory});
        } catch (error) {
            throw new Error(`Narsese parsing failed: ${error.message}`);
        }
    }
}
