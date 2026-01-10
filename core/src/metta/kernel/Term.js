/**
 * Term.js - Interned atoms with structural equality
 * Core data structures for MeTTa expressions
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
export function sym(name) {
    if (symbolCache.has(name)) {
        return symbolCache.get(name);
    }
    
    const atom = {
        type: 'symbol',
        name: name,
        toString: () => name,
        equals: (other) => other && other.type === 'symbol' && other.name === name
    };
    
    symbolCache.set(name, atom);
    return atom;
}

/**
 * Create an interned variable atom
 * @param {string} name - Variable name
 * @returns {Object} Interned variable atom
 */
export function var_(name) {
    if (variableCache.has(name)) {
        return variableCache.get(name);
    }
    
    const atom = {
        type: 'variable',
        name: name,
        toString: () => `?${name}`,
        equals: (other) => other && other.type === 'variable' && other.name === name
    };
    
    variableCache.set(name, atom);
    return atom;
}

/**
 * Create an interned expression atom
 * @param {Array} components - Expression components [operator, ...args]
 * @returns {Object} Interned expression atom
 */
export function exp(components) {
    // Create a unique key for the expression
    const key = JSON.stringify(components.map(c => c.toString ? c.toString() : c));
    
    if (expressionCache.has(key)) {
        return expressionCache.get(key);
    }
    
    const atom = {
        type: 'expression',
        components: components,
        operator: components[0],
        args: components.slice(1),
        toString: () => `(${components.map(c => c.toString ? c.toString() : c).join(' ')})`,
        equals: function(other) {
            if (!other || other.type !== 'expression' || other.components.length !== this.components.length) {
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
    
    expressionCache.set(key, atom);
    return atom;
}

/**
 * Structural equality check for any atom
 * @param {Object} a - First atom
 * @param {Object} b - Second atom
 * @returns {boolean} True if atoms are structurally equal
 */
export function equals(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.equals) return a.equals(b);
    return false;
}

/**
 * Deep clone an atom (for substitution operations)
 * @param {Object} atom - Atom to clone
 * @returns {Object} Cloned atom
 */
export function clone(atom) {
    if (!atom) return atom;
    
    switch (atom.type) {
        case 'symbol':
            return sym(atom.name);
        case 'variable':
            return var_(atom.name);
        case 'expression':
            return exp(atom.components.map(clone));
        default:
            return atom;
    }
}

/**
 * Check if atom is a variable
 * @param {Object} atom - Atom to check
 * @returns {boolean} True if atom is a variable
 */
export function isVariable(atom) {
    return atom && atom.type === 'variable';
}

/**
 * Check if atom is a symbol
 * @param {Object} atom - Atom to check
 * @returns {boolean} True if atom is a symbol
 */
export function isSymbol(atom) {
    return atom && atom.type === 'symbol';
}

/**
 * Check if atom is an expression
 * @param {Object} atom - Atom to check
 * @returns {boolean} True if atom is an expression
 */
export function isExpression(atom) {
    return atom && atom.type === 'expression';
}