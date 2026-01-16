/**
 * Space.js - Set of atoms with functor indexing
 * Core storage and retrieval mechanism for MeTTa programs
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import {isExpression, isSymbol, exp, sym, isVariable} from './Term.js';

export class Space {
    constructor() {
        this.atoms = new Set();
        this.rules = [];

        // Multi-level indexing for O(1) average lookup
        this.functorIndex = new Map();      // functor -> rules
        this.arityIndex = new Map();         // functor+arity -> rules
        this.signatureIndex = new Map();     // functor+arg1+arg2 -> rules

        this._stats = {
            adds: 0, removes: 0, queries: 0,
            indexedLookups: 0, fullScans: 0
        };
    }

    /**
     * Add an atom to the space
     */
    add(atom) {
        if (!atom) throw new Error("Cannot add null/undefined atom");
        if (!this.atoms.has(atom)) {
            this.atoms.add(atom);
            this._indexItem(atom, atom);
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
            this._deindexItem(atom, atom);
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
     * Get rules for a specific functor or term
     */
    rulesFor(term) {
        this._stats.indexedLookups++;

        if (!isExpression(term)) {
            // Check if it's a functor name (string or symbol) passed directly
            const functorName = this._getFunctorName(term);
            if (functorName) {
                 return this.functorIndex.get(functorName) || [...this.rules];
            }

            this._stats.fullScans++;
            return [...this.rules];
        }

        const functor = this._getFunctorName(term.operator);
        const arity = term.components?.length || 0;

        // Try most specific index first
        const sigKey = this._getSignatureKey(term);
        if (sigKey && this.signatureIndex.has(sigKey)) {
            return this.signatureIndex.get(sigKey);
        }

        // Fall back to arity index
        const arityKey = `${functor}/${arity}`;
        if (this.arityIndex.has(arityKey)) {
            return this.arityIndex.get(arityKey);
        }

        // Fall back to functor index
        if (functor && this.functorIndex.has(functor)) {
            return this.functorIndex.get(functor);
        }

        // Last resort: full scan
        this._stats.fullScans++;
        return [...this.rules];
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
        this.arityIndex.clear();
        this.signatureIndex.clear();
        this._stats = {adds: 0, removes: 0, queries: 0, indexedLookups: 0, fullScans: 0};
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
     * Get signature key for indexing
     */
    _getSignatureKey(pattern) {
        const functor = this._getFunctorName(pattern.operator);
        const args = pattern.components || [];

        // Only index if first args are constants (not variables)
        const constArgs = args.slice(0, 2)
            .filter(a => !isVariable(a))
            .map(a => a.name || a.toString());

        if (constArgs.length === 0) return null;
        return `${functor}/${constArgs.join('/')}`;
    }

    /**
     * Index an item with a pattern
     */
    _indexItem(item, pattern) {
        if (!isExpression(pattern)) return;

        const functor = this._getFunctorName(pattern.operator);
        const arity = pattern.components?.length || 0;

        if (functor) {
            // Level 1: Functor index
            if (!this.functorIndex.has(functor)) this.functorIndex.set(functor, []);
            this.functorIndex.get(functor).push(item);

            // Level 2: Functor+Arity index
            const arityKey = `${functor}/${arity}`;
            if (!this.arityIndex.has(arityKey)) this.arityIndex.set(arityKey, []);
            this.arityIndex.get(arityKey).push(item);

            // Level 3: Signature index (first 2 constant args)
            const sigKey = this._getSignatureKey(pattern);
            if (sigKey) {
                if (!this.signatureIndex.has(sigKey)) this.signatureIndex.set(sigKey, []);
                this.signatureIndex.get(sigKey).push(item);
            }
        }
    }

    /**
     * Remove an item from the index
     */
    _deindexItem(item, pattern) {
         if (!isExpression(pattern)) return;
         const functor = this._getFunctorName(pattern.operator);
         const arity = pattern.components?.length || 0;

         if (functor) {
             this._removeFromMap(this.functorIndex, functor, item);

             const arityKey = `${functor}/${arity}`;
             this._removeFromMap(this.arityIndex, arityKey, item);

             const sigKey = this._getSignatureKey(pattern);
             if (sigKey) {
                 this._removeFromMap(this.signatureIndex, sigKey, item);
             }
         }
    }

    /**
     * Helper to remove item from a map entry
     */
    _removeFromMap(map, key, item) {
        if (map.has(key)) {
            const list = map.get(key);
            const idx = list.indexOf(item);
            if (idx !== -1) {
                list.splice(idx, 1);
                if (list.length === 0) map.delete(key);
            }
        }
    }
}
