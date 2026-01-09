/**
 * MeTTaHelpers.js - Utility functions for MeTTa implementation
 * Reduces boilerplate across MeTTa subsystems
 */

// ===== AST Helpers =====

export const MeTTaAST = {
    // Create atom nodes
    symbol: (value) => ({ type: 'atom', tokenType: 'SYMBOL', value }),
    variable: (value) => ({ type: 'atom', tokenType: 'VARIABLE', value: value.startsWith('$') ? value : `$${value}` }),
    number: (value) => ({ type: 'atom', tokenType: 'NUMBER', value: String(value) }),
    string: (value) => ({ type: 'atom', tokenType: 'STRING', value }),
    grounded: (value) => ({ type: 'atom', tokenType: 'GROUNDED', value: value.startsWith('&') ? value : `&${value}` }),

    // Create expression nodes
    expr: (...elements) => ({ type: 'list', elements }),

    // Predicates
    isSymbol: (node) => node?.type === 'atom' && node.tokenType === 'SYMBOL',
    isVariable: (node) => node?.type === 'atom' && node.tokenType === 'VARIABLE',
    isExpression: (node) => node?.type === 'list',
    isGrounded: (node) => node?.type === 'atom' && node.tokenType === 'GROUNDED',

    // Traversal
    map: (node, fn) => {
        if (!node) return null;
        if (node.type === 'atom') return fn(node);
        if (node.type === 'list') {
            return {
                ...node,
                elements: node.elements.map(el => MeTTaAST.map(el, fn))
            };
        }
        return node;
    },

    fold: (node, fn, acc) => {
        if (!node) return acc;
        if (node.type === 'atom') return fn(acc, node);
        if (node.type === 'list') {
            return node.elements.reduce((a, el) => MeTTaAST.fold(el, fn, a), fn(acc, node));
        }
        return acc;
    }
};

// ===== Unification Helpers =====

export const Unification = {
    // Check if term is variable
    isVar: (term) => {
        if (!term) return false;
        return term.name?.startsWith('$') || term.name?.startsWith('?');
    },

    // Variable substitution
    subst: (term, bindings, termFactory = null) => {
        if (!term) return term;

        if (Unification.isVar(term)) {
            return bindings[term.name] || term;
        }

        if (term.components) {
            const newComponents = term.components.map(c => Unification.subst(c, bindings, termFactory));

            // Reconstruct proper Term if possible
            if (termFactory) {
                // If original had operator, use it (likely compound)
                if (term.operator) {
                    return termFactory.create({ operator: term.operator, components: newComponents });
                }
                // If it was list/compound without operator (e.g. from parsing)
                return termFactory.create({ components: newComponents });
            }

            // Fallback: try to match constructor (for Term instances)
            if (term.constructor && term.constructor.name === 'Term') {
                return new term.constructor(term.type, term.name, newComponents, term.operator);
            }

            return {
                ...term,
                components: newComponents
            };
        }

        return term;
    },

    // Unify two terms, return bindings or null
    unify: (pattern, term, bindings = {}) => {
        if (bindings === null) return null;

        // Variable in pattern
        if (Unification.isVar(pattern)) {
            const varName = pattern.name;
            return varName in bindings
                ? Unification.unify(bindings[varName], term, bindings)
                : { ...bindings, [varName]: term };
        }

        // Atomic terms must match exactly
        if (!pattern.operator && !term.operator) {
            return pattern.name === term.name ? bindings : null;
        }

        // Compound terms
        if (!pattern.operator || !term.operator) return null;
        if (pattern.operator !== term.operator) return null;
        if (pattern.components.length !== term.components.length) return null;

        let result = bindings;
        for (let i = 0; i < pattern.components.length; i++) {
            result = Unification.unify(pattern.components[i], term.components[i], result);
            if (result === null) return null;
        }
        return result;
    },

    // Match multiple patterns/terms
    matchAll: (patterns, terms) => {
        const results = [];
        for (const pattern of patterns) {
            for (const term of terms) {
                const bindings = Unification.unify(pattern, term);
                if (bindings) {
                    results.push({ pattern, term, bindings });
                }
            }
        }
        return results;
    }
};

// ===== Term Construction Helpers =====

export const TermBuilders = {
    // Functor application: f(x, y) → (^, f, (*, x, y))
    functor: (tf, head, ...args) => {
        if (args.length === 0) return head;
        return tf.predicate(head, tf.product(...args));
    },

    // Equality: (= A B)
    eq: (tf, a, b) => tf.equality(a, b),

    // Type annotation: (: term Type)
    typed: (tf, term, type) => tf.inheritance(term, type),

    // Logic shortcuts
    and: (tf, ...terms) => tf.conjunction(...terms),
    or: (tf, ...terms) => tf.disjunction(...terms),
    not: (tf, term) => tf.negation(term),
    implies: (tf, a, b) => tf.implication(a, b),
    equiv: (tf, a, b) => tf.equivalence(a, b),

    // Set builders
    extSet: (tf, ...terms) => tf.setExt(...terms),
    intSet: (tf, ...terms) => tf.setInt(...terms)
};

// ===== Task Construction Helpers =====

export const TaskBuilders = {
    // Create SeNARS task
    task: (term, punctuation = '.', truth = { frequency: 0.9, confidence: 0.9 }) => ({
        term,
        punctuation,
        truth
    }),

    // Default truth value
    defaultTruth: () => ({ frequency: 0.9, confidence: 0.9 })
};

// ===== Error Classes =====

export class MeTTaError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'MeTTaError';
        this.context = context;
    }
}

export class TypeMismatchError extends MeTTaError {
    constructor(expected, actual, term) {
        super(`Type mismatch: expected ${expected}, got ${actual}`);
        this.name = 'TypeMismatchError';
        this.expected = expected;
        this.actual = actual;
        this.term = term;
    }
}

export class UnificationError extends MeTTaError {
    constructor(pattern, term) {
        super(`Cannot unify ${pattern} with ${term}`);
        this.name = 'UnificationError';
        this.pattern = pattern;
        this.term = term;
    }
}

export class ReductionError extends MeTTaError {
    constructor(message, expr) {
        super(message);
        this.name = 'ReductionError';
        this.expr = expr;
    }
}
