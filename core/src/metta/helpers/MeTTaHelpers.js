
export const Unification = {
    isVar: (term) => term?.name?.startsWith('$') || term?.name?.startsWith('?'),

    subst: (term, bindings, termFactory = null) => {
        if (!term) return term;
        if (Unification.isVar(term)) return bindings[term.name] || term;

        if (term.components) {
            const newComponents = term.components.map(c => Unification.subst(c, bindings, termFactory));
            if (termFactory) {
                return term.operator
                    ? termFactory.create({ operator: term.operator, components: newComponents })
                    : termFactory.create({ components: newComponents });
            }
            if (term.constructor?.name === 'Term') {
                return new term.constructor(term.type, term.name, newComponents, term.operator);
            }
            return { ...term, components: newComponents };
        }
        return term;
    },

    unify: (pattern, term, bindings = {}) => {
        if (!bindings) return null;

        if (Unification.isVar(pattern)) {
            const name = pattern.name;
            return name in bindings
                ? Unification.unify(bindings[name], term, bindings)
                : { ...bindings, [name]: term };
        }

        if (!pattern.operator && !term.operator) {
            return pattern.name === term.name ? bindings : null;
        }

        if (pattern.operator !== term.operator || pattern.components?.length !== term.components?.length) return null;

        let result = bindings;
        for (let i = 0; i < pattern.components.length; i++) {
            result = Unification.unify(pattern.components[i], term.components[i], result);
            if (!result) return null;
        }
        return result;
    },

    matchAll: (patterns, terms) => {
        const results = [];
        for (const pattern of patterns) {
            for (const term of terms) {
                const bindings = Unification.unify(pattern, term);
                if (bindings) results.push({ pattern, term, bindings });
            }
        }
        return results;
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

