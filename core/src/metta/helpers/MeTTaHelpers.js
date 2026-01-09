import { Unifier } from '../../term/Unifier.js';

export const Unification = {
    isVar: (term) => term?.name?.startsWith('$') || term?.name?.startsWith('?'),

    subst: (term, bindings, termFactory = null) => {
        // Delegate to Unifier for consistent substitution logic
        // We use a minimal Unifier instance or the provided termFactory
        const factory = termFactory || { create: (op, comps) => ({ operator: op, components: comps }) };
        const unifier = new Unifier(factory);
        return unifier.applySubstitution(term, bindings);
    },

    unify: (pattern, term, bindings = {}) => {
        // Create a temporary Unifier - in a real app, this should be dependency-injected
        // For helper functions, we can instantiate it on the fly or reuse a singleton if possible
        // but here we just need the logic.
        // We pass a minimal mock termFactory since Unifier only calls create when applying substitution for compound terms
        // and we are just unifying here.
        const unifier = new Unifier({
            create: (op, comps) => ({ operator: op, components: comps, isCompound: true }) // Minimal mock
        });

        const result = unifier.unify(pattern, term, bindings);
        return result.success ? result.substitution : null;
    },

    matchAll: (patterns, terms) => patterns.flatMap(pattern =>
        terms.flatMap(term => {
            const bindings = Unification.unify(pattern, term);
            return bindings ? [{ pattern, term, bindings }] : [];
        })
    )
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
