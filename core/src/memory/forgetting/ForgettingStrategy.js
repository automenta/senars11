/**
 * Base class for memory forgetting strategies.
 * Implements the Strategy pattern for concept forgetting policies.
 */
export class ForgettingStrategy {
    /**
     * Select a concept to forget from the given concept map.
     * 
     * @param {Map} concepts - Map of terms to Concept instances
     * @param {Object} stats - Memory statistics for decision making
     * @returns {*|null} The term of the concept to forget, or null if none found
     * @abstract
     */
    forget(concepts, stats) {
        throw new Error(`${this.constructor.name}.forget() must be implemented by subclass`);
    }

    /**
     * Get the strategy name (derived from class name).
     * 
     * @returns {string} Strategy name in lowercase (e.g., 'priority', 'lru', 'fifo')
     */
    getName() {
        return this.constructor.name
            .replace('ForgettingStrategy', '')
            .toLowerCase();
    }
}
