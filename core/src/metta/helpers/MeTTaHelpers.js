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
    subst: (term, bindings) => {
        if (!term) return term;

        if (Unification.isVar(term)) {
            return bindings[term.name] || term;
        }

        if (term.components) {
            return {
                ...term,
                components: term.components.map(c => Unification.subst(c, bindings))
            };
        }

        return term;
    },

    // Unify two terms, return bindings or null
    unify: (pattern, term, bindings = {}) => {
        // Already failed
        if (bindings === null) return null;

        // Variable in pattern
        if (Unification.isVar(pattern)) {
            const varName = pattern.name;
            if (bindings[varName]) {
                return Unification.unify(bindings[varName], term, bindings);
            }
            return { ...bindings, [varName]: term };
        }

        // Atomic terms must match exactly
        if (!pattern.operator && !term.operator) {
            return pattern.name === term.name ? bindings : null;
        }

        // Compound terms
        if (pattern.operator && term.operator) {
            if (pattern.operator !== term.operator) return null;
            if (pattern.components.length !== term.components.length) return null;

            let result = bindings;
            for (let i = 0; i < pattern.components.length; i++) {
                result = Unification.unify(pattern.components[i], term.components[i], result);
                if (result === null) return null;
            }
            return result;
        }

        return null;
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

// ===== Reduction Helpers =====

export const Reduction = {
    // Check if expression is in normal form (fully reduced)
    isReduced: (expr) => {
        if (!expr) return true;
        if (!expr.operator) return true; // Atomic
        if (expr.operator === '^') return false; // Functor call not reduced
        // Check components
        return expr.components?.every(c => Reduction.isReduced(c)) ?? true;
    },

    // Apply reduction rule if pattern matches
    reduce: (expr, pattern, result, bindings = {}) => {
        const unified = Unification.unify(pattern, expr, bindings);
        if (unified) {
            return { reduced: Unification.subst(result, unified), applied: true };
        }
        return { reduced: expr, applied: false };
    },

    // Reduce to normal form with step limit
    normalize: (expr, rules, maxSteps = 1000) => {
        let current = expr;
        let steps = 0;

        while (steps < maxSteps) {
            let applied = false;

            for (const { pattern, result } of rules) {
                const { reduced, applied: ruleApplied } = Reduction.reduce(current, pattern, result);
                if (ruleApplied) {
                    current = reduced;
                    applied = true;
                    break;
                }
            }

            if (!applied) break;
            steps++;
        }

        return { result: current, steps };
    }
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
