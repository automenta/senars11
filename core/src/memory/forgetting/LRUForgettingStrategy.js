import { ForgettingStrategy } from './ForgettingStrategy.js';

/**
 * Least Recently Used (LRU) forgetting strategy.
 * Removes the concept that was accessed least recently.
 */
export class LRUForgettingStrategy extends ForgettingStrategy {
    /**
     * Find and return the concept with the oldest lastAccessed timestamp.
     * 
     * @param {Map} concepts - Map of terms to Concept instances
     * @param {Object} stats - Memory statistics (unused for this strategy)
     * @returns {*|null} The term of the least recently used concept, or null if no concepts
     */
    forget(concepts, stats) {
        let targetTerm = null;
        let oldestAccess = Infinity;

        for (const [term, concept] of concepts) {
            const lastAccessed = concept.lastAccessed ?? 0;
            if (lastAccessed < oldestAccess) {
                oldestAccess = lastAccessed;
                targetTerm = term;
            }
        }

        return targetTerm;
    }
}
