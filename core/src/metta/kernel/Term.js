/**
 * Term.js - Interned atoms with structural equality
 * Core data structures for MeTTa expressions
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

// Symbol interning cache
const symbolCache = new Map();

// Variable interning cache
const variableCache = new Map();

// Expression interning cache
const expressionCache = new Map();

/**
 * Create an interned symbol atom
 * @param {string} name - Symbol name
 * @returns {Object} Interned symbol atom
 */
export const sym = (name) => {
    if (symbolCache.has(name)) return symbolCache.get(name);

    const atom = {
        type: 'atom',
        name,
        operator: null,
        components: [],
        toString: () => name,
        equals: (other) => other?.type === 'atom' && other.name === name
    };

    symbolCache.set(name, atom);
    return atom;
};

/**
 * Create an interned variable atom
 * @param {string} name - Variable name (with or without $ prefix)
 * @returns {Object} Interned variable atom
 */
export const var_ = (name) => {
    const cleanName = name.startsWith('$') ? name.substring(1) : name.startsWith('?') ? name.substring(1) : name;
    const fullName = `$${cleanName}`;

    if (variableCache.has(fullName)) return variableCache.get(fullName);

    const atom = {
        type: 'atom',
        name: fullName,
        operator: null,
        components: [],
        toString: () => fullName,
        equals: (other) => other?.type === 'atom' && other.name === fullName
    };

    variableCache.set(fullName, atom);
    return atom;
};

/**
 * Create an interned expression atom
 * @param {Object|string} operator - Operator atom or string name
 * @param {Array} components - Expression components
 * @returns {Object} Interned expression atom
 */
export const exp = (operator, components) => {
    if (!operator) throw new Error('Operator must be defined');
    if (!Array.isArray(components)) throw new Error('Components must be an array');

    // Normalize operator to atom if it's a string
    const normalizedOperator = typeof operator === 'string' ? sym(operator) : operator;
    const opString = normalizedOperator.toString ? normalizedOperator.toString() : String(normalizedOperator);

    // Create a unique key for the expression
    const key = `${opString},${components.map(c => c.toString ? c.toString() : c).join(',')}`;

    if (expressionCache.has(key)) return expressionCache.get(key);

    // Create canonical name
    const canonicalName = `(${opString} ${components.map(c => c.name || c).join(' ')})`;

    const atom = {
        type: 'compound',
        name: canonicalName,
        operator: normalizedOperator,
        components: Object.freeze([...components]),
        toString: () => canonicalName,
        equals: function (other) {
            if (!other || other.type !== 'compound' || other.components.length !== this.components.length) return false;

            // Check operator equality
            const opEqual = this.operator.equals
                ? this.operator.equals(other.operator)
                : this.operator === other.operator;

            if (!opEqual) return false;

            return this.components.every((comp, i) => comp.equals(other.components[i]));
        }
    };

    expressionCache.set(key, atom);
    return atom;
};

/**
 * Structural equality check for any atom
 * @param {Object} a - First atom
 * @param {Object} b - Second atom
 * @returns {boolean} True if atoms are structurally equal
 */
export const equals = (a, b) => {
    if (a === b) return a !== null && b !== null;  // Special case: null equals null is false
    if (!a || !b) return false;
    return a.equals?.(b) ?? false;
};

/**
 * Deep clone an atom (for substitution operations)
 * @param {Object} atom - Atom to clone
 * @returns {Object} Cloned atom
 */
export const clone = (atom) => {
    if (!atom) return atom;

    switch (atom.type) {
        case 'atom':
            return atom.operator === null ? sym(atom.name) : var_(atom.name);
        case 'compound':
            return exp(atom.operator, atom.components.map(clone));
        default:
            return atom;
    }
};

/**
 * Check if atom is a variable
 * @param {Object} atom - Atom to check
 * @returns {boolean} True if atom is a variable
 */
export const isVariable = (atom) => atom?.type === 'atom' &&
           atom.name &&
           typeof atom.name === 'string' &&
           (atom.name.startsWith('$') || atom.name.startsWith('?'));

/**
 * Check if atom is a symbol
 * @param {Object} atom - Atom to check
 * @returns {boolean} True if atom is a symbol
 */
export const isSymbol = (atom) => atom?.type === 'atom' &&
           atom.operator === null &&
           atom.name &&
           typeof atom.name === 'string' &&
           !atom.name.startsWith('$') &&
           !atom.name.startsWith('?');

/**
 * Check if atom is an expression
 * @param {Object} atom - Atom to check
 * @returns {boolean} True if atom is an expression
 */
export const isExpression = (atom) => atom?.type === 'compound';

// === List Optimization Utilities ===

/**
 * Check if atom is a List (Cons) expression (: head tail)
 */
export const isList = (atom) => isExpression(atom) &&
           atom.operator?.name === ':' &&
           atom.components.length === 2;

/**
 * Flatten a Cons list into an array of elements + tail
 * @param {Object} list - The list atom
 * @returns {Object} { elements: Array, tail: Atom }
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
 * Reconstruct a Cons list from elements and tail
 * @param {Array} elements - Array of atoms
 * @param {Object} tail - Tail atom
 * @returns {Object} Cons list atom
 */
export const constructList = (elements, tail) => {
    let res = tail;
    for (let i = elements.length - 1; i >= 0; i--) {
        res = exp(sym(':'), [elements[i], res]);
    }
    return res;
};

// Export a Term object that matches the expected API in tests
export const Term = {
    sym,
    var: var_,
    exp,
    equals,
    clone,
    isVar: isVariable,
    isSymbol,
    isExpression,

    // List utils
    isList,
    flattenList,
    constructList,

    // Additional helper for test compatibility
    clearSymbolTable: () => {
        symbolCache.clear();
        variableCache.clear();
        expressionCache.clear();
    }
};
