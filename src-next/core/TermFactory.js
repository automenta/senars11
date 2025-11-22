import {Term, TermType} from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*', '<->', '=', '<=>']);
const ASSOCIATIVE_OPERATORS = new Set(['&', '|']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
    }

    create(data) {
        if (!data) throw new Error('TermFactory.create: data is required');

        if (typeof data === 'string') {
            return this._getOrCreateAtomic(data);
        }

        // Handle object input {operator, components}
        let {operator, components} = data;

        if (!operator) {
             if (data.name && !data.components) return this._getOrCreateAtomic(data.name);
             throw new Error('TermFactory: invalid compound term data');
        }

        if (!Array.isArray(components)) throw new Error('TermFactory: components must be array');

        // Recursively create components
        components = components.map(c => (c instanceof Term) ? c : this.create(c));

        // Normalize
        if (ASSOCIATIVE_OPERATORS.has(operator)) {
            components = this._flatten(operator, components);
        }

        if (COMMUTATIVE_OPERATORS.has(operator)) {
            // Deduplicate (Set) - except for '=' maybe? The original code said:
            // "Special case for '=' operator: don't remove redundancy"
            // I'll stick to that logic if I can find a good reason.
            // (5=5) is valid. (A&A) -> A (idempotent).
            // NAL sets {A, A} -> {A}.
            // I'll assume & and | are idempotent. = is not.
            // The original code: "return operator === '=' ? ... : removeRedundancy(...)"

            if (operator !== '=') {
                components = this._removeRedundancy(components);
            }

            // Sort
            components.sort((a, b) => a.name.localeCompare(b.name));
        }

        const name = this._buildName(operator, components);
        return this._createAndCache(operator, components, name);
    }

    _getOrCreateAtomic(name) {
        let term = this._cache.get(name);
        if (!term) {
            term = new Term(TermType.ATOM, name);
            this._cache.set(name, term);
        }
        return term;
    }

    _createAndCache(operator, components, name) {
        let term = this._cache.get(name);
        if (!term) {
            term = new Term(TermType.COMPOUND, name, components, operator);
            this._cache.set(name, term);
        }
        return term;
    }

    _flatten(op, comps) {
        return comps.flatMap(c => (c.operator === op) ? c.components : [c]);
    }

    _removeRedundancy(comps) {
        const unique = new Map();
        comps.forEach(c => unique.set(c.name, c));
        return Array.from(unique.values());
    }

    _buildName(op, comps) {
        // Simplified naming scheme - Narsese compliant
        if (['-->', '<->', '==>', '<=>', '=', '=/>', '=|', '=/=', '^'].includes(op)) {
            return `(${comps.map(c => c.name).join(' ' + op + ' ')})`; // (A --> B)
        }
        // Prefix for sets and others
        const names = comps.map(c => c.name).join(', ');
        if (op === '{}') return `{${names}}`;
        if (op === '[]') return `[${names}]`;
        if (op === ',') return `(${names})`;

        // Default prefix: (&, A, B)
        return `(${op}, ${names})`;
    }

    // Special NAL canonicalization for <->, <=> (Ordering)
    // Wait, COMMUTATIVE_OPERATORS handles sorting.
    // (A <-> B) vs (B <-> A) -> Both sort to (A, B) -> Name (A <-> B).
    // So logic is consistent.
}
