/**
 * Space.js - Set of atoms with functor indexing
 * Core storage and retrieval mechanism for MeTTa programs
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isExpression, isSymbol, exp, sym } from './Term.js';

export class Space {
    constructor() {
        this.atoms = new Set();
        this.rules = [];
        this.functorIndex = new Map();
        this.stats = { adds: 0, removes: 0, queries: 0, indexedLookups: 0 };
    }

    /**
     * Add an atom to the space
     * @param {Object} atom - Atom to add
     * @returns {Space} This space for chaining
     */
    add(atom) {
        if (!atom) throw new Error("Cannot add null/undefined atom");

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
     * Get all atoms in the space (including rules)
     * @returns {Array} Array of all atoms
     */
    all() {
        const atoms = Array.from(this.atoms);
        const rulesAsAtoms = this.rules
            .filter(rule => typeof rule.result !== 'function')
            .map(rule => exp(sym('='), [rule.pattern, rule.result]));

        return [...atoms, ...rulesAsAtoms];
    }

    /**
     * Add a rewrite rule to the space
     * @param {Object} pattern - Pattern to match
     * @param {Object|Function} result - Result to return (either a term or a function that takes bindings and returns a term)
     * @returns {Space} This space for chaining
     */
    addRule(pattern, result) {
        if (!pattern) throw new Error("Pattern cannot be null or undefined");

        const rule = { pattern, result };
        this.rules.push(rule);

        // Index the rule by its pattern's functor if it's an expression
        if (isExpression(pattern)) {
            const functorName = this._getFunctorName(pattern.operator);
            if (functorName) {
                if (!this.functorIndex.has(functorName)) {
                    this.functorIndex.set(functorName, []);
                }
                this.functorIndex.get(functorName).push(rule);
            }
        }

        return this;
    }

    /**
     * Get all rules in the space
     * @returns {Array} Array of rules
     */
    getRules() {
        return [...this.rules];
    }

    /**
     * Get rules for a specific functor/operator
     * @param {string|Object} functor - Functor name or atom
     * @returns {Array} Matching rules
     */
    rulesFor(functor) {
        this.stats.indexedLookups++;

        const functorName = this._getFunctorName(functor);
        return functorName ? this.functorIndex.get(functorName) || [] : [...this.rules];
    }

    /**
     * Get functor name from an atom or string
     * @private
     * @param {string|Object} functor - Functor to extract name from
     * @returns {string|null} Functor name or null
     */
    _getFunctorName(functor) {
        if (typeof functor === 'string') return functor;
        if (isSymbol(functor)) return functor.name;
        if (isExpression(functor)) {
            if (typeof functor.operator === 'string') return functor.operator;
            if (isSymbol(functor.operator)) return functor.operator.name;
        }
        return null;
    }

    /**
     * Index an atom for faster lookup
     * @private
     * @param {Object} atom - Atom to index
     */
    _indexAtom(atom) {
        if (isExpression(atom)) {
            const functorName = this._getFunctorName(atom.operator);
            if (functorName) {
                if (!this.functorIndex.has(functorName)) {
                    this.functorIndex.set(functorName, []);
                }
                this.functorIndex.get(functorName).push(atom);
            }
        }
    }

    /**
     * Remove atom from index
     * @private
     * @param {Object} atom - Atom to deindex
     */
    _deindexAtom(atom) {
        if (isExpression(atom)) {
            const functorName = this._getFunctorName(atom.operator);
            if (functorName && this.functorIndex.has(functorName)) {
                const items = this.functorIndex.get(functorName);
                const index = items.indexOf(atom);
                if (index !== -1) {
                    items.splice(index, 1);
                    if (items.length === 0) {
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
        this.rules = [];
        this.functorIndex.clear();
        this.stats = { adds: 0, removes: 0, queries: 0, indexedLookups: 0 };
    }

    /**
     * Size of the space
     * @returns {number} Number of atoms in space
     */
    size() {
        return this.atoms.size;
    }

    /**
     * Get the count of atoms in the space (alias for size)
     * @returns {number} Atom count
     */
    getAtomCount() {
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
            functorCount: this.functorIndex.size,
            indexedFunctors: this.functorIndex.size,
            ruleCount: this.rules.length
        };
    }

    /**
     * Get space statistics (alias for getStats)
     * @returns {Object} Statistics object
     */
    stats() {
        return this.getStats();
    }

    /**
     * Query space with a pattern
     * @param {Object} pattern - Pattern to match
     * @returns {Array} Matching atoms
     */
    query(pattern) {
        this.stats.queries++;
        return Array.from(this.atoms).filter(atom => atom.equals?.(pattern));
    }
}
