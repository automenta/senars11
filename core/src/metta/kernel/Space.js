/**
 * Minimal MeTTa Kernel - Space Management
 * 
 * Manages atoms and rules with functor indexing for fast lookups.
 * No event emission, no memory coupling - pure space operations.
 */

/**
 * Space manages a collection of atoms and rewrite rules
 */
export class Space {
    constructor() {
        this.atoms = new Set();
        this.rules = [];
        this.functorIndex = new Map(); // Maps operator -> rules with that operator
    }

    /**
     * Add an atom to the space
     * @param {object} term - Term to add
     */
    add(term) {
        if (!term) {
            throw new Error('Space.add: term is required');
        }
        this.atoms.add(term);
    }

    /**
     * Remove an atom from the space
     * @param {object} term - Term to remove
     * @returns {boolean} True if term was removed
     */
    remove(term) {
        return this.atoms.delete(term);
    }

    /**
     * Check if space contains an atom
     * @param {object} term - Term to check
     * @returns {boolean} True if term exists in space
     */
    has(term) {
        return this.atoms.has(term);
    }

    /**
     * Get all atoms in the space
     * @returns {Array} Array of all atoms
     */
    all() {
        return Array.from(this.atoms);
    }

    /**
     * Get the number of atoms in the space
     * @returns {number} Atom count
     */
    size() {
        return this.atoms.size;
    }

    /**
     * Clear all atoms and rules from the space
     */
    clear() {
        this.atoms.clear();
        this.rules = [];
        this.functorIndex.clear();
    }

    /**
     * Add a rewrite rule (pattern -> result)
     * @param {object} pattern - Pattern to match
     * @param {object|function} result - Result term or function
     */
    addRule(pattern, result) {
        if (!pattern) {
            throw new Error('Space.addRule: pattern is required');
        }

        const rule = { pattern, result };
        this.rules.push(rule);

        // Index by functor for fast lookup
        if (pattern.operator) {
            if (!this.functorIndex.has(pattern.operator)) {
                this.functorIndex.set(pattern.operator, []);
            }
            this.functorIndex.get(pattern.operator).push(rule);
        }
    }

    /**
     * Get all rules (unindexed access)
     * @returns {Array} All rules
     */
    getRules() {
        return this.rules;
    }

    /**
     * Get rules that match a specific operator (functor)
     * Uses the functor index for O(1) lookup
     * @param {string} operator - Operator to match
     * @returns {Array} Rules with matching operator
     */
    rulesFor(operator) {
        if (!operator) {
            // Return all rules if no operator specified
            return this.rules;
        }
        return this.functorIndex.get(operator) || [];
    }

    /**
     * Get statistics about the space
     * @returns {object} Stats object
     */
    stats() {
        return {
            atomCount: this.atoms.size,
            ruleCount: this.rules.length,
            indexedFunctors: this.functorIndex.size
        };
    }
}
