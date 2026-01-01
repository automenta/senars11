import { NAR } from './nar/NAR.js';

/**
 * SeNARS Facade - A simplified API for SeNARS reasoning system
 * 
 * The goal is to provide a friction-free API that allows users to quickly
 * experience SeNARS value in under 60 seconds.
 * 
 * @example
 * import { SeNARS } from 'senars';
 * 
 * const brain = new SeNARS();
 * brain.learn('(cats --> mammals).');
 * brain.learn('(mammals --> animals).');
 * 
 * const answer = await brain.ask('(cats --> animals)?');
 * // → { answer: true, confidence: 0.85, proof: [...] }
 */
export class SeNARS {
    constructor(config = {}) {
        // Use sensible defaults for a simple user experience
        this.nar = new NAR({
            // Default configuration for ease of use
            lm: {
                enabled: false, // Disable LM by default for simplicity
                ...config.lm
            },
            memory: {
                capacity: 1000,
                ...config.memory
            },
            // Override with user config
            ...config
        });
        
        // Auto-initialize for friction-free experience
        this._initialized = false;
        this._initialize();
    }

    async _initialize() {
        try {
            await this.nar.initialize();
            this._initialized = true;
        } catch (error) {
            console.error('Failed to initialize SeNARS:', error);
            throw error;
        }
    }

    /**
     * Learn a fact or belief in Narsese format
     * @param {string} narsese - The Narsese statement to learn (e.g., '(cats --> mammals).')
     * @returns {Promise<boolean>} - Whether the learning was successful
     */
    async learn(narsese) {
        if (!this._initialized) {
            await this._initialize();
        }
        
        try {
            await this.nar.input(narsese);
            return true;
        } catch (error) {
            console.error('Learning failed:', error);
            return false;
        }
    }

    /**
     * Ask a question in Narsese format
     * @param {string} narsese - The Narsese question (e.g., '(cats --> animals)?')
     * @returns {Promise<Object>} - Result with answer, confidence, and proof chain
     */
    async ask(narsese) {
        if (!this._initialized) {
            await this._initialize();
        }
        
        try {
            // For now, return a simple result structure
            // In the future, this could return structured results with proof chains
            const result = await this.nar.input(narsese);
            
            // Return a structured response with answer, confidence, and proof
            return {
                answer: result ? true : false,
                confidence: result?.truth?.c || 0,
                frequency: result?.truth?.f || 0,
                proof: this._getRecentProofChain(), // Placeholder for proof chain
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Question failed:', error);
            return {
                answer: null,
                confidence: 0,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Get recent proof chain for the latest reasoning
     * @private
     */
    _getRecentProofChain() {
        // Placeholder implementation - in the future this would return actual proof chain
        // For now, return an empty array but in a real implementation this would
        // connect to the reasoning trace system
        return [];
    }

    /**
     * Query the system for beliefs about a term
     * @param {string} term - The term to query
     * @returns {Array} - Array of beliefs about the term
     */
    query(term) {
        return this.nar.getBeliefs(term);
    }

    /**
     * Get all current beliefs in the system
     * @returns {Array} - Array of all beliefs
     */
    getBeliefs() {
        return this.nar.getBeliefs();
    }

    /**
     * Reset the reasoning system
     */
    reset() {
        this.nar.reset();
    }

    /**
     * Start the reasoning process
     */
    async start() {
        if (!this._initialized) {
            await this._initialize();
        }
        return this.nar.start();
    }

    /**
     * Stop the reasoning process
     */
    stop() {
        return this.nar.stop();
    }

    /**
     * Perform a single reasoning step
     */
    async step() {
        if (!this._initialized) {
            await this._initialize();
        }
        return this.nar.step();
    }

    /**
     * Run multiple reasoning cycles
     * @param {number} count - Number of cycles to run
     */
    async runCycles(count) {
        if (!this._initialized) {
            await this._initialize();
        }
        return this.nar.runCycles(count);
    }

    /**
     * Get system statistics
     */
    getStats() {
        return this.nar.getStats();
    }

    /**
     * Get the underlying NAR instance (for advanced users)
     */
    getNAR() {
        return this.nar;
    }

    /**
     * Cleanup resources
     */
    async dispose() {
        if (this.nar) {
            await this.nar.dispose();
        }
    }
}