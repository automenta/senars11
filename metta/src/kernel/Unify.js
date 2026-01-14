/**
 * Unify.js - Pattern Matching & Unification
 * Adapter for Core Unification Logic
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isVariable, isExpression, isList, flattenList, constructList, exp } from './Term.js';
import * as UnifyCore from '../../../core/src/term/UnifyCore.js';

/**
 * Metta-specific adapter for core unification logic
 */
const mettaAdapter = {
    isVariable,
    isCompound: isExpression,
    getVariableName: t => t.name,
    getOperator: t => t.operator?.name ? t.operator : t.operator,
    getComponents: t => t.components || [], // Structural: (; A B) -> (: A (: B ()))
    equals: (t1, t2) => t1 === t2 || (t1?.equals?.(t2) ?? false),
    substitute: (t, b) => safeSubstitute(t, b),
    reconstruct: (t, comps) => {
        if (isList(t)) {
            const { tail } = flattenList(t);
            return constructList(comps, tail);
        }
        return exp(typeof t.operator === 'object' ? t.operator : t.operator, comps);
    }
};

/**
 * Safely substitute variables in a term with their bindings
 */
const safeSubstitute = (term, bindings) => {
    if (!term) return term;

    if (isVariable(term)) {
        const val = bindings[term.name];
        return (val !== undefined && val !== term) ? safeSubstitute(val, bindings) : term;
    }

    if (isExpression(term)) {
        if (isList(term)) {
            const { elements, tail } = flattenList(term);
            const subEls = elements.map(e => safeSubstitute(e, bindings));
            const subTail = safeSubstitute(tail, bindings);
            if (subTail === tail && subEls.every((e, i) => e === elements[i])) return term;
            return constructList(subEls, subTail);
        }

        const op = typeof term.operator === 'object'
            ? safeSubstitute(term.operator, bindings)
            : term.operator;
        const comps = term.components.map(c => safeSubstitute(c, bindings));

        if (op === term.operator && comps.every((c, i) => c === term.components[i])) return term;
        return exp(op, comps);
    }

    return term;
};

/**
 * Unify two list structures
 */
const unifyLists = (l1, l2, bindings) => {
    const f1 = flattenList(l1);
    const f2 = flattenList(l2);
    const len = Math.min(f1.elements.length, f2.elements.length);
    let curr = bindings;

    // Unify elements up to the minimum length
    for (let i = 0; i < len; i++) {
        const b = Unify.unify(f1.elements[i], f2.elements[i], curr);
        if (!b) return null;
        curr = b;
    }

    // Handle remaining elements
    const t1 = f1.elements.length > len
        ? constructList(f1.elements.slice(len), f1.tail)
        : f1.tail;
    const t2 = f2.elements.length > len
        ? constructList(f2.elements.slice(len), f2.tail)
        : f2.tail;

    return Unify.unify(t1, t2, curr);
};

export const Unify = {
    /**
     * Unify two terms
     */
    unify: (t1, t2, binds = {}) =>
        (isList(t1) && isList(t2))
            ? unifyLists(t1, t2, binds)
            : UnifyCore.unify(t1, t2, binds, mettaAdapter),

    /**
     * Substitute variables in a term with their bindings
     */
    subst: safeSubstitute,

    /**
     * Match a pattern against a term
     */
    match: (pat, term, binds = {}) => UnifyCore.match(pat, term, binds, mettaAdapter),

    /**
     * Match multiple patterns against multiple terms
     */
    matchAll: (pats, terms) => {
        const res = [];
        pats.forEach(p => terms.forEach(t => {
            const b = Unify.unify(p, t);
            if (b) res.push({ pattern: p, term: t, bindings: b });
        }));
        return res;
    },

    /**
     * Check if a term is a variable
     */
    isVar: isVariable
};
