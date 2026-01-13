/**
 * Unify.js - Pattern matching with occurs check
 * MeTTa-specific unification using shared UnifyCore
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isVariable, isExpression, isList, flattenList, constructList, exp, sym } from './Term.js';
import * as UnifyCore from '../../../core/src/term/UnifyCore.js';

// MeTTa term adapter for UnifyCore
const mettaAdapter = {
    isVariable: term => isVariable(term),

    isCompound: term => isExpression(term),

    getVariableName: term => term.name,

    getOperator: term => typeof term.operator === 'object' ? term.operator : term.operator,

    getComponents: term => {
        if (isList(term)) {
            const { elements } = flattenList(term);
            return elements;
        }
        return term.components || [];
    },

    equals: (t1, t2) => {
        if (t1 === t2) return true;
        if (t1?.equals && typeof t1.equals === 'function') return t1.equals(t2);
        return false;
    },

    substitute: (term, bindings) => safeSubstitute(term, bindings),

    reconstruct: (term, newComponents) => {
        if (isList(term)) {
            const { tail } = flattenList(term);
            return constructList(newComponents, tail);
        }
        const op = typeof term.operator === 'object' ? term.operator : term.operator;
        return exp(op, newComponents);
    }
};

// Substitution with MeTTa-specific handling
const safeSubstitute = (term, bindings) => {
    if (!term) return term;

    if (isVariable(term)) {
        let val = bindings[term.name];
        if (val !== undefined && val !== term) return safeSubstitute(val, bindings);
        return term;
    }

    if (isExpression(term)) {
        if (isList(term)) {
            const { elements, tail } = flattenList(term);
            const subEls = elements.map(e => safeSubstitute(e, bindings));
            const subTail = safeSubstitute(tail, bindings);
            if (subTail === tail && subEls.every((e, i) => e === elements[i])) return term;
            return constructList(subEls, subTail);
        }

        const op = typeof term.operator === 'object' ? safeSubstitute(term.operator, bindings) : term.operator;
        const comps = term.components.map(c => safeSubstitute(c, bindings));
        if (op === term.operator && comps.every((c, i) => c === term.components[i])) return term;
        return exp(op, comps);
    }

    return term;
};

// Specialized list unification for MeTTa
const unifyLists = (l1, l2, bindings) => {
    const f1 = flattenList(l1), f2 = flattenList(l2);
    const len = Math.min(f1.elements.length, f2.elements.length);
    let curr = bindings;

    for (let i = 0; i < len; i++) {
        const b = Unify.unify(f1.elements[i], f2.elements[i], curr);
        if (!b) return null;
        curr = b;
    }

    const t1 = f1.elements.length > len ? constructList(f1.elements.slice(len), f1.tail) : f1.tail;
    const t2 = f2.elements.length > len ? constructList(f2.elements.slice(len), f2.tail) : f2.tail;
    return Unify.unify(t1, t2, curr);
};

// Public API
export const Unify = {
    unify: (t1, t2, bindings = {}) => {
        // Special handling for MeTTa lists
        if (isList(t1) && isList(t2)) {
            return unifyLists(t1, t2, bindings);
        }
        return UnifyCore.unify(t1, t2, bindings, mettaAdapter);
    },

    subst: (term, bindings) => safeSubstitute(term, bindings),

    match: (pattern, term, bindings = {}) => UnifyCore.match(pattern, term, bindings, mettaAdapter),

    isVar: isVariable,

    matchAll: (patterns, terms) => {
        const matches = [];
        patterns.forEach(pattern => terms.forEach(term => {
            const bindings = Unify.unify(pattern, term);
            if (bindings) matches.push({ pattern, term, bindings });
        }));
        return matches;
    }
};
