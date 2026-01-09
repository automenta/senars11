/**
 * Minimal MeTTa Kernel - Term Construction
 * 
 * Core term representation with symbol interning for O(1) equality.
 * No caching, no complexity tracking - pure term construction.
 */

// Symbol interning for O(1) equality checks
const symbolTable = new Map();

/**
 * Create or retrieve an interned atomic term (symbol or variable)
 * @param {string} name - Term name
 * @returns {object} Atomic term
 */
function sym(name) {
    if (symbolTable.has(name)) {
        return symbolTable.get(name);
    }

    const term = Object.freeze({
        type: 'atom',
        name,
        operator: null,
        components: [],
        toString: () => name
    });

    symbolTable.set(name, term);
    return term;
}

/**
 * Create a variable term (name starts with $)
 * @param {string} name - Variable name (can omit leading $)
 * @returns {object} Variable term
 */
function vari(name) {
    const varName = name.startsWith('$') ? name : `$${name}`;
    return sym(varName);
}

/**
 * Create a compound expression term
 * @param {string} operator - Operator symbol
 * @param {Array} components - Component terms
 * @returns {object} Compound term
 */
function exp(operator, components) {
    if (!operator || typeof operator !== 'string') {
        throw new Error('exp: operator must be a non-empty string');
    }

    if (!Array.isArray(components)) {
        throw new Error('exp: components must be an array');
    }

    // Build canonical name for compound terms
    const componentNames = components.map(c => c.toString()).join(', ');
    const name = `(${operator}, ${componentNames})`;

    return Object.freeze({
        type: 'compound',
        name,
        operator,
        components: Object.freeze([...components]),
        toString: () => name
    });
}

/**
 * Check structural equality between two terms
 * @param {object} term1 - First term
 * @param {object} term2 - Second term
 * @returns {boolean} True if structurally equal
 */
function equals(term1, term2) {
    if (!term1 || !term2) return false;

    // Fast path for interned symbols
    if (term1 === term2) return true;

    // Check type and operator
    if (term1.type !== term2.type || term1.operator !== term2.operator) {
        return false;
    }

    // Atomic terms: check by name
    if (term1.type === 'atom') {
        return term1.name === term2.name;
    }

    // Compound terms: recursively check components
    if (term1.components.length !== term2.components.length) {
        return false;
    }

    for (let i = 0; i < term1.components.length; i++) {
        if (!equals(term1.components[i], term2.components[i])) {
            return false;
        }
    }

    return true;
}

/**
 * Check if a term is a variable (name starts with $)
 * @param {object} term - Term to check
 * @returns {boolean} True if variable
 */
function isVar(term) {
    return term && term.type === 'atom' && term.name.startsWith('$');
}

/**
 * Clear the symbol table (useful for testing)
 */
function clearSymbolTable() {
    symbolTable.clear();
}

export const Term = {
    sym,
    var: vari,
    exp,
    equals,
    isVar,
    clearSymbolTable
};
