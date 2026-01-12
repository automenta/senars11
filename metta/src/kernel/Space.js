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
        this._stats = { adds: 0, removes: 0, queries: 0, indexedLookups: 0 };
    }

    add(atom) {
        if (!atom) throw new Error("Cannot add null/undefined atom");
        if (!this.atoms.has(atom)) {
            this.atoms.add(atom);
            this._indexAtom(atom);
            this._stats.adds++;
        }
        return this;
    }

    remove(atom) {
        if (this.atoms.has(atom)) {
            this.atoms.delete(atom);
            this._deindexAtom(atom);
            this._stats.removes++;
            return true;
        }
        return false;
    }

    has(atom) {
        return this.atoms.has(atom);
    }

    all() {
        const rulesAsAtoms = this.rules
            .filter(r => typeof r.result !== 'function')
            .map(r => exp(sym('='), [r.pattern, r.result]));
        return [...this.atoms, ...rulesAsAtoms];
    }

    addRule(pattern, result) {
        if (!pattern) throw new Error("Pattern cannot be null");
        const rule = { pattern, result };
        this.rules.push(rule);
        this._indexItem(rule, pattern);
        return this;
    }

    getRules() {
        return [...this.rules];
    }

    rulesFor(functor) {
        this._stats.indexedLookups++;
        const name = this._getFunctorName(functor);
        return name ? (this.functorIndex.get(name) || []) : [...this.rules];
    }

    size() {
        return this.atoms.size;
    }

    getAtomCount() {
        return this.atoms.size;
    }

    getStats() {
        return {
            ...this._stats,
            atomCount: this.atoms.size,
            functorCount: this.functorIndex.size,
            indexedFunctors: this.functorIndex.size,
            ruleCount: this.rules.length
        };
    }

    stats() {
        return this.getStats();
    }

    query(pattern) {
        this._stats.queries++;
        return Array.from(this.atoms).filter(atom => atom.equals?.(pattern));
    }

    clear() {
        this.atoms.clear();
        this.rules = [];
        this.functorIndex.clear();
        this._stats = { adds: 0, removes: 0, queries: 0, indexedLookups: 0 };
    }

    // === Private ===

    _getFunctorName(functor) {
        if (typeof functor === 'string') return functor;
        if (isSymbol(functor)) return functor.name;
        if (isExpression(functor)) return this._getFunctorName(functor.operator);
        return null;
    }

    _indexAtom(atom) {
        this._indexItem(atom, atom);
    }

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

    _indexItem(item, pattern) {
        if (!isExpression(pattern)) return;
        const name = this._getFunctorName(pattern.operator);
        if (name) {
            if (!this.functorIndex.has(name)) this.functorIndex.set(name, []);
            this.functorIndex.get(name).push(item);
        }
    }
}
