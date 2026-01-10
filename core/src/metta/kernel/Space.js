/**
 * Space.js - Set of atoms with functor indexing
 * Core storage and retrieval mechanism for MeTTa programs
 */

import { isExpression, isSymbol } from './Term.js';

export class Space {
    constructor() {
        // Main storage for atoms
        this.atoms = new Set();
        
        // Functor index for efficient rule lookup
        // Maps functor names to sets of matching rules
        this.functorIndex = new Map();
        
        // Stats for performance monitoring
        this.stats = {
            adds: 0,
            removes: 0,
            queries: 0,
            indexedLookups: 0
        };
    }

    /**
     * Add an atom to the space
     * @param {Object} atom - Atom to add
     * @returns {Space} This space for chaining
     */
    add(atom) {
        if (!this.atoms.has(atom)) {
            this.atoms.add(atom);
            this._indexAtom(atom);
            this.stats.adds++;
        }
        return this;
    }

    /**
     * Remove an atom from the space
     * @param {Object} atom - Atom to remove
     * @returns {boolean} True if atom was removed
     */
    remove(atom) {
        if (this.atoms.has(atom)) {
            this.atoms.delete(atom);
            this._deindexAtom(atom);
            this.stats.removes++;
            return true;
        }
        return false;
    }

    /**
     * Check if space contains an atom
     * @param {Object} atom - Atom to check
     * @returns {boolean} True if atom is in space
     */
    has(atom) {
        return this.atoms.has(atom);
    }

    /**
     * Get all atoms in the space
     * @returns {Array} Array of all atoms
     */
    all() {
        return Array.from(this.atoms);
    }

    /**
     * Get rules for a specific functor/operator
     * @param {string|Object} functor - Functor name or atom
     * @returns {Array} Matching rules
     */
    rulesFor(functor) {
        this.stats.indexedLookups++;
        
        if (isSymbol(functor)) {
            return this.functorIndex.get(functor.name) || [];
        } else if (isExpression(functor) && isSymbol(functor.operator)) {
            return this.functorIndex.get(functor.operator.name) || [];
        }
        
        // If functor is not a symbol, return all atoms
        return this.all();
    }

    /**
     * Index an atom for faster lookup
     * @private
     * @param {Object} atom - Atom to index
     */
    _indexAtom(atom) {
        if (isExpression(atom) && isSymbol(atom.operator)) {
            const functorName = atom.operator.name;
            if (!this.functorIndex.has(functorName)) {
                this.functorIndex.set(functorName, []);
            }
            this.functorIndex.get(functorName).push(atom);
        }
    }

    /**
     * Remove atom from index
     * @private
     * @param {Object} atom - Atom to deindex
     */
    _deindexAtom(atom) {
        if (isExpression(atom) && isSymbol(atom.operator)) {
            const functorName = atom.operator.name;
            if (this.functorIndex.has(functorName)) {
                const rules = this.functorIndex.get(functorName);
                const index = rules.indexOf(atom);
                if (index !== -1) {
                    rules.splice(index, 1);
                    if (rules.length === 0) {
                        this.functorIndex.delete(functorName);
                    }
                }
            }
        }
    }

    /**
     * Clear all atoms from the space
     */
    clear() {
        this.atoms.clear();
        this.functorIndex.clear();
        this.stats = {
            adds: 0,
            removes: 0,
            queries: 0,
            indexedLookups: 0
        };
    }

    /**
     * Size of the space
     * @returns {number} Number of atoms in space
     */
    size() {
        return this.atoms.size;
    }

    /**
     * Get statistics about the space
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            atomCount: this.atoms.size,
            functorCount: this.functorIndex.size
        };
    }

    /**
     * Query space with a pattern
     * @param {Object} pattern - Pattern to match
     * @returns {Array} Matching atoms
     */
    query(pattern) {
        this.stats.queries++;
        
        // For now, do a linear scan
        // In a full implementation, this would use more sophisticated indexing
        const results = [];
        for (const atom of this.atoms) {
            // Simple structural match for now
            if (atom.equals && atom.equals(pattern)) {
                results.push(atom);
            }
        }
        return results;
    }
}