import { BaseIndex } from './BaseIndex.js';

export class AtomicIndex extends BaseIndex {
    constructor(config = {}) {
        super(config);
        this._index = new Map(); // Maps atomic term name to concepts
    }

    add(concept) {
        const { term } = concept;
        if (term.isAtomic) {
            const concepts = this._index.get(term.name) || new Set();
            concepts.add(concept);
            this._index.set(term.name, concepts);
        }
    }

    remove(concept) {
        const { term } = concept;
        if (term.isAtomic && this._index.has(term.name)) {
            const concepts = this._index.get(term.name);
            concepts.delete(concept);
            if (concepts.size === 0) {
                this._index.delete(term.name);
            }
        }
    }

    find(filters = {}) {
        const { termName } = filters;
        if (termName !== undefined) {
            const concepts = this._index.get(termName);
            return concepts ? Array.from(concepts) : [];
        }
        return this.getAll();
    }

    clear() {
        this._index.clear();
    }

    getAll() {
        const allConcepts = new Set();
        for (const concepts of this._index.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        return Array.from(allConcepts);
    }
}