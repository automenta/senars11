/**
 * Space.js - Set of atoms with functor indexing
 * Core storage and retrieval mechanism for MeTTa programs
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import {isExpression, isSymbol, exp, sym} from './Term.js';

export class Space {
    constructor() {
        this.atoms = new Set();
        this.rules = [];
        this.functorIndex = new Map();
        this._stats = {adds: 0, removes: 0, queries: 0, indexedLookups: 0};
    }

    /**
     * Add an atom to the space
     */
    add(atom) {
        if (!atom) throw new Error("Cannot add null/undefined atom");
        if (!this.atoms.has(atom)) {
            this.atoms.add(atom);
            this._indexAtom(atom);
            this._stats.adds++;
        }
        return this;
    }

    /**
     * Remove an atom from the space
     */
    remove(atom) {
        if (this.atoms.has(atom)) {
            this.atoms.delete(atom);
            this._deindexAtom(atom);
            this._stats.removes++;
            return true;
        }
        return false;
    }

    /**
     * Check if an atom exists in the space
     */
    has(atom) {
        return this.atoms.has(atom);
    }

    /**
     * Get all atoms in the space
     */
    all() {
        return [...this.atoms, ...this._getRulesAsAtoms()];
    }

    /**
     * Get rules as atoms
     */
    _getRulesAsAtoms() {
        return this.rules
            .filter(r => typeof r.result !== 'function')
            .map(r => exp(sym('='), [r.pattern, r.result]));
    }

    /**
     * Add a rule to the space
     */
    addRule(pattern, result) {
        if (!pattern) throw new Error("Pattern cannot be null");
        const rule = {pattern, result};
        this.rules.push(rule);
        this._indexItem(rule, pattern);
        return this;
    }

    /**
     * Get all rules in the space
     */
    getRules() {
        return [...this.rules];
    }

    /**
     * Get rules for a specific functor
     */
    rulesFor(functor) {
        this._stats.indexedLookups++;
        const name = this._getFunctorName(functor);
        return name ? (this.functorIndex.get(name) || []) : [...this.rules];
    }

    /**
     * Get the number of atoms in the space
     */
    size() {
        return this.atoms.size;
    }

    /**
     * Get the number of atoms in the space (alias for size)
     */
    getAtomCount() {
        return this.atoms.size;
    }

    /**
     * Get statistics about the space
     */
    getStats() {
        return {
            ...this._stats,
            atomCount: this.atoms.size,
            functorCount: this.functorIndex.size,
            indexedFunctors: this.functorIndex.size,
            ruleCount: this.rules.length
        };
    }

    /**
     * Get statistics about the space (alias for getStats)
     */
    stats() {
        return this.getStats();
    }

    /**
     * Query the space for atoms matching a pattern
     */
    query(pattern) {
        this._stats.queries++;
        return Array.from(this.atoms).filter(atom => atom.equals?.(pattern));
    }

    /**
     * Clear all atoms and rules from the space
     */
    clear() {
        this.atoms.clear();
        this.rules = [];
        this.functorIndex.clear();
        this._stats = {adds: 0, removes: 0, queries: 0, indexedLookups: 0};
    }

    // === Private Methods ===

    /**
     * Get the functor name from a term
     */
    _getFunctorName(functor) {
        if (typeof functor === 'string') return functor;
        if (isSymbol(functor)) return functor.name;
        if (isExpression(functor)) return this._getFunctorName(functor.operator);
        return null;
    }

    /**
     * Index an atom
     */
    _indexAtom(atom) {
        this._indexItem(atom, atom);
    }

    /**
     * Remove an atom from the index
     */
    _deindexAtom(atom) {
        if (!isExpression(atom)) return;
        const name = this._getFunctorName(atom.operator);
        if (name && this.functorIndex.has(name)) {
            const items = this.functorIndex.get(name);
            const idx = items.indexOf(atom);
            if (idx !== -1) {
                items.splice(idx, 1);
                if (items.length === 0) this.functorIndex.delete(name);
            }
        }
    }

    /**
     * Index an item with a pattern
     */
    _indexItem(item, pattern) {
        if (!isExpression(pattern)) return;
        const name = this._getFunctorName(pattern.operator);
        if (name) {
            if (!this.functorIndex.has(name)) this.functorIndex.set(name, []);
            this.functorIndex.get(name).push(item);
        }
    }
}
