/**
 * Term.js - Optimized MeTTa atoms with Tier 1 performance enhancements
 * 
 * Optimizations applied:
 * - Q1: Symbol interning (with limited cache + structural fallback)
 * - Q2: Pre-computed type tags for fast dispatch
 * - Q3: Stable object shapes (all properties pre-allocated)
 */

import { intern, symbolEq } from './Interning.js';
import { TYPE_SYMBOL, TYPE_VARIABLE, TYPE_EXPRESSION, isVariableName } from './FastPaths.js';
import { METTA_CONFIG } from '../config.js';

// Atom Caches (expression cache only, symbols handled by Interning.js)
const expCache = new Map();
const varCache = new Map();  // Variables also need caching for referential equality

/**
 * Create a symbol atom
 * Q1: Uses interning for deduplication
 * Q3: All properties pre-allocated for stable shape
 */
export const sym = (name) => {
    if (METTA_CONFIG.interning) {
        return intern(name);
    }

    // Fallback: create without interning
    // Q3: Pre-allocate ALL properties (stable V8 hidden class)
    return {
        type: 'atom',
        name,
        operator: null,
        components: [],
        _typeTag: TYPE_SYMBOL,  // Q2: Pre-computed type tag
        _hash: null,            // Reserved for future caching
        _metadata: null,        // Reserved for future use
        toString: () => name,
        equals: o => symbolEq({ name }, o)
    };
};

/**
 * Create a variable atom
 * Q1: Variables also use caching for referential equality
 * Q3: All properties pre-allocated
 */
export const variable = (name) => {
    // Normalize variable name
    const n = name.replace(/^[\?$]/, '');
    const fullName = `$${n}`;

    // Check cache first (Q1: interning for variables too)
    if (varCache.has(fullName)) {
        return varCache.get(fullName);
    }

    // Q3: Pre-allocate ALL properties (stable V8 hidden class)
    const atom = {
        type: 'atom',
        name: fullName,
        operator: null,
        components: [],
        _typeTag: TYPE_VARIABLE,  // Q2: Pre-computed type tag
        _hash: null,
        _metadata: null,
        toString: () => fullName,
        equals: o => o?.type === 'atom' && o.name === fullName
    };

    // Cache the variable for future lookups
    varCache.set(fullName, atom);
    return atom;
};

/**
 * Create an expression atom
 * Q3: All properties pre-allocated
 */
export const exp = (operator, components) => {
    if (!operator) throw new Error('Operator required');
    if (!Array.isArray(components)) throw new Error('Components array required');

    const op = typeof operator === 'string' ? sym(operator) : operator;
    const opStr = op.toString();
    const key = `${opStr},${components.map(c => c.toString()).join(',')}`;

    if (expCache.has(key)) return expCache.get(key);

    const compStr = components.map(c => c.name || c).join(' ');
    const name = `(${opStr}${compStr ? ' ' + compStr : ''})`;

    // Q3: Pre-allocate ALL properties (stable V8 hidden class)
    const atom = {
        type: 'compound',
        name,
        operator: op,
        components: Object.freeze([...components]),
        _typeTag: TYPE_EXPRESSION,  // Q2: Pre-computed type tag
        _hash: null,
        _metadata: null,
        toString: () => name,
        equals: function (other) {
            if (other?.type !== 'compound' ||
                other.components.length !== this.components.length ||
                !(this.operator.equals ? this.operator.equals(other.operator) : this.operator === other.operator)) {
                return false;
            }
            for (let i = 0; i < this.components.length; i++) {
                if (!this.components[i].equals(other.components[i])) {
                    return false;
                }
            }
            return true;
        }
    };

    // Limit cache size to prevent unbounded growth
    if (expCache.size > METTA_CONFIG.maxCacheSize) {
        // Simple eviction: clear cache when full
        // TODO: Implement LRU eviction in Q5
        expCache.clear();
    }

    expCache.set(key, atom);
    return atom;
};

/**
 * Check equality between two atoms
 * Q1: Uses optimized symbolEq for symbols
 */
export const equals = (a, b) => {
    // Fast path: referential equality
    if (a === b && a !== null) return true;

    // Use type-specific equality
    if (!a || !b) return false;

    // For symbols, use optimized symbolEq
    if (a._typeTag === TYPE_SYMBOL && b._typeTag === TYPE_SYMBOL) {
        return symbolEq(a, b);
    }

    // For other types, use equals method
    return a.equals?.(b) ?? false;
};

/**
 * Clone an atom
 */
export const clone = (atom) => {
    if (!atom) return atom;
    if (atom.type === 'atom') return atom.operator === null ? sym(atom.name) : variable(atom.name);
    if (atom.type === 'compound') return exp(atom.operator, atom.components.map(clone));
    return atom;
};

/**
 * Check if an atom is a variable
 */
export const isVariable = (a) => a?._typeTag === TYPE_VARIABLE || (a?.type === 'atom' && isVariableName(a.name));

/**
 * Check if an atom is a symbol
 */
export const isSymbol = (a) => a?._typeTag === TYPE_SYMBOL || (a?.type === 'atom' && !a.operator && !isVariableName(a.name));

/**
 * Check if an atom is an expression
 */
export const isExpression = (a) => a?._typeTag === TYPE_EXPRESSION || a?.type === 'compound';

/**
 * Check if an atom is a list
 */
export const isList = (a) => isExpression(a) && a.operator?.name === ':' && a.components?.length === 2;

/**
 * Flatten a list to an array
 */
export const flattenList = (list) => {
    const elements = [];
    let curr = list;

    while (isList(curr)) {
        elements.push(curr.components[0]);
        curr = curr.components[1];
    }

    return { elements, tail: curr };
};

/**
 * Construct a list from an array
 */
export const constructList = (elements, tail = sym('()')) => {
    let res = tail;
    for (let i = elements.length - 1; i >= 0; i--) {
        res = exp(sym(':'), [elements[i], res]);
    }
    return res;
};


// Direct exports for backward compatibility
export const var_ = variable;

// Legacy/Test Compatibility
export const Term = {
    sym,
    var: variable,
    var_: variable,  // Maintain backward compatibility
    exp,
    equals,
    clone,
    isVar: isVariable,
    isSymbol,
    isExpression,
    isList,
    flattenList,
    constructList,
    clearSymbolTable: () => {
        expCache.clear();
        varCache.clear();
    }
};
