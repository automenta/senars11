import { Unify } from '../kernel/Unify.js';
import { Term } from '../kernel/Term.js';

export const Unification = {
    isVar: (term) => Unify.isVar(term),

    subst: (term, bindings) => {
        return Unify.subst(term, bindings);
    },

    unify: (pattern, term, bindings = {}) => {
        return Unify.unify(pattern, term, bindings);
    },

    matchAll: (patterns, terms) => {
        return Unify.matchAll(patterns, terms);
    }
};

export const TermBuilders = {
    functor: (tf, head, ...args) => args.length ? tf.predicate(head, tf.product(...args)) : head,
    eq: (tf, a, b) => tf.equality(a, b),
    typed: (tf, term, type) => tf.inheritance(term, type),
    and: (tf, ...terms) => tf.conjunction(...terms),
    or: (tf, ...terms) => tf.disjunction(...terms),
    not: (tf, term) => tf.negation(term),
    implies: (tf, a, b) => tf.implication(a, b),
    equiv: (tf, a, b) => tf.equivalence(a, b),
    extSet: (tf, ...terms) => tf.setExt(...terms),
    intSet: (tf, ...terms) => tf.setInt(...terms)
};

export const TaskBuilders = {
    task: (term, punctuation = '.', truth = { frequency: 0.9, confidence: 0.9 }) => ({ term, punctuation, truth }),
    defaultTruth: () => ({ frequency: 0.9, confidence: 0.9 })
};

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
        Object.assign(this, { expected, actual, term });
    }
}

export class UnificationError extends MeTTaError {
    constructor(pattern, term) {
        super(`Cannot unify ${pattern} with ${term}`);
        this.name = 'UnificationError';
        Object.assign(this, { pattern, term });
    }
}

export class ReductionError extends MeTTaError {
    constructor(message, expr) {
        super(message);
        this.name = 'ReductionError';
        this.expr = expr;
    }
}
