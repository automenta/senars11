/**
 * Term.js - Interned atoms with structural equality
 * Core data structures for MeTTa expressions
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

// Atom Caches
const caches = { sym: new Map(), var: new Map(), exp: new Map() };

/**
 * Create a symbol atom
 */
export const sym = (name) => {
    if (caches.sym.has(name)) return caches.sym.get(name);

    const atom = {
        type: 'atom',
        name,
        operator: null,
        components: [],
        toString: () => name,
        equals: o => o?.type === 'atom' && o.name === name
    };

    caches.sym.set(name, atom);
    return atom;
};

/**
 * Create a variable atom
 */
export const var_ = (name) => {
    const n = name.replace(/^[\?\$]/, '');
    const fullName = `$${n}`;

    if (caches.var.has(fullName)) return caches.var.get(fullName);

    const atom = {
        type: 'atom',
        name: fullName,
        operator: null,
        components: [],
        toString: () => fullName,
        equals: o => o?.type === 'atom' && o.name === fullName
    };

    caches.var.set(fullName, atom);
    return atom;
};

/**
 * Create an expression atom
 */
export const exp = (operator, components) => {
    if (!operator) throw new Error('Operator required');
    if (!Array.isArray(components)) throw new Error('Components array required');

    const op = typeof operator === 'string' ? sym(operator) : operator;
    const opStr = op.toString();
    const key = `${opStr},${components.map(c => c.toString()).join(',')}`;

    if (caches.exp.has(key)) return caches.exp.get(key);

    const compStr = components.map(c => c.name || c).join(' ');
    const name = `(${opStr}${compStr ? ' ' + compStr : ''})`;
    const atom = {
        type: 'compound',
        name,
        operator: op,
        components: Object.freeze([...components]),
        toString: () => name,
        equals: function (other) {
            return other?.type === 'compound' &&
                other.components.length === this.components.length &&
                (this.operator.equals ? this.operator.equals(other.operator) : this.operator === other.operator) &&
                this.components.every((c, i) => c.equals(other.components[i]));
        }
    };

    caches.exp.set(key, atom);
    return atom;
};

/**
 * Check equality between two atoms
 */
export const equals = (a, b) => (a === b && a !== null) || (!!a && !!b && a.equals?.(b));

/**
 * Clone an atom
 */
export const clone = (atom) => {
    if (!atom) return atom;
    if (atom.type === 'atom') return atom.operator === null ? sym(atom.name) : var_(atom.name);
    if (atom.type === 'compound') return exp(atom.operator, atom.components.map(clone));
    return atom;
};

/**
 * Check if an atom is a variable
 */
export const isVariable = (a) => a?.type === 'atom' && /^[?$]/.test(a.name);

/**
 * Check if an atom is a symbol
 */
export const isSymbol = (a) => a?.type === 'atom' && !a.operator && !/^[?$]/.test(a.name);

/**
 * Check if an atom is an expression
 */
export const isExpression = (a) => a?.type === 'compound';

// List Utilities
/**
 * Check if an atom is a list
 */
export const isList = (a) => isExpression(a) && a.operator?.name === ':' && a.components.length === 2;

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
export const constructList = (elements, tail) => {
    let res = tail;
    for (let i = elements.length - 1; i >= 0; i--) {
        res = exp(sym(':'), [elements[i], res]);
    }
    return res;
};

// Legacy/Test Compatibility
export const Term = {
    sym,
    var: var_,
    exp,
    equals,
    clone,
    isVar: isVariable,
    isSymbol,
    isExpression,
    isList,
    flattenList,
    constructList,
    clearSymbolTable: () => Object.values(caches).forEach(c => c.clear())
};
