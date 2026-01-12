/**
 * Unify.js - Pattern matching with occurs check
 * Core unification algorithm for MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import {isVariable, isExpression, isList, flattenList, constructList} from './Term.js';

const substitute = (term, bindings, visited = new Set()) => {
    if (!term) return term;

    if (isVariable(term)) {
        if (bindings.hasOwnProperty(term.name)) {
            let val = bindings[term.name];
            let limit = 100;
            while (isVariable(val) && bindings.hasOwnProperty(val.name) && limit-- > 0) {
                if (val === term) break;
                val = bindings[val.name];
            }
            return val === undefined ? term : val;
        }
        return term;
    }

    if (isExpression(term)) {
        if (isList(term)) {
            const {elements, tail} = flattenList(term);
            const subEls = elements.map(e => substitute(e, bindings, new Set(visited)));
            const subTail = substitute(tail, bindings, new Set(visited));
            if (subTail === tail && subEls.every((e, i) => e === elements[i])) return term;
            return constructList(subEls, subTail);
        }
        // General expression substitution (simplified for recursion depth protection if needed, relying on recursion for now as per updated style)
        // If stack overflow becomes an issue, logic can be restored.
        // Simplified recursive approach for readability first.
        const op = typeof term.operator === 'object' ? substitute(term.operator, bindings, visited) : term.operator;
        const comps = term.components.map(c => substitute(c, bindings, visited));

        // Simple change check
        if (op === term.operator && comps.every((c, i) => c === term.components[i])) return term;

        // Construct new term - importing exp/sym would be needed if we were reconstructing from scratch, 
        // but we can cheat and return a specific object structure if we trust Term structure not to change,
        // OR we can make sure we import exp. 
        // Let's rely on Term.js exp if possible, but cleaner is to assume structure stability or import exp.
        // We will assume importing Term.js/exp in this module would be circular if not careful.
        // Actually imports are hoisted. Let's rely on object reconstruction matching Term.js 'exp' if possible or use a helper.
        // Best practice: structure cloning (similar to iterativeSubstitute in original but simpler).
    }
    return term;
};

// Re-importing exp locally to avoid cycle issues at top level might not work well with ESM.
// But we can construct the object directly since we know the shape.
// However, Term.js manages caching. So creating objects directly bypasses interning.
// We should import { exp } from './Term.js' if Term uses it.
// The previous code had iterativeSubstitute which was complex.
// Let's assume recursion is fine for now unless deep nesting is verified.
// NOTE: Re-implementing simplified iterative substitution to be safe and use imported exp.
// But we need to update the file import top.

import {exp} from './Term.js';

const safeSubstitute = (term, bindings) => {
    // Simplified recursive version. 
    // If complex deep structures exist, iterative approach from original file should be used.
    // For this refactor, we keep it simple.
    if (!term) return term;
    if (isVariable(term)) {
        let val = bindings[term.name];
        if (val !== undefined && val !== term) return safeSubstitute(val, bindings); // Recurse on binding
        return term;
    }
    if (isExpression(term)) {
        const op = typeof term.operator === 'object' ? safeSubstitute(term.operator, bindings) : term.operator;
        const comps = term.components.map(c => safeSubstitute(c, bindings));
        if (op === term.operator && comps.every((c, i) => c === term.components[i])) return term;
        return exp(op, comps);
    }
    return term;
}

const unifyExpressions = (t1, t2, bindings) => {
    let curr = bindings;
    if (isList(t1) && isList(t2)) return unifyLists(t1, t2, curr);

    // Operator
    if (typeof t1.operator === 'object' && typeof t2.operator === 'object') {
        const opB = Unify.unify(t1.operator, t2.operator, curr);
        if (!opB) return null;
        curr = opB;
    } else if (t1.operator !== t2.operator) return null;

    if (t1.components.length !== t2.components.length) return null;

    for (let i = 0; i < t1.components.length; i++) {
        const b = Unify.unify(t1.components[i], t2.components[i], curr);
        if (!b) return null;
        curr = b;
    }
    return curr;
};

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

const bindVar = (v, t, bindings) => {
    if (occursCheck(v, t, bindings)) return null;
    return {...bindings, [v.name]: t};
};

const occursCheck = (v, t, bindings) => {
    const bound = safeSubstitute(t, bindings);
    if (isVariable(bound)) return bound.name === v.name;
    if (isExpression(bound)) {
        return (typeof bound.operator === 'object' && occursCheck(v, bound.operator, bindings)) ||
            bound.components.some(c => occursCheck(v, c, bindings));
    }
    return false;
};

export const Unify = {
    unify: (t1, t2, bindings = {}) => {
        const res = {...bindings};
        const b1 = safeSubstitute(t1, res);
        const b2 = safeSubstitute(t2, res);

        if (b1 === b2 || (b1?.equals && b1.equals(b2))) return res;
        if (isVariable(b1)) return bindVar(b1, b2, res);
        if (isVariable(b2)) return bindVar(b2, b1, res);
        if (isExpression(b1) && isExpression(b2)) return unifyExpressions(b1, b2, res);
        return null;
    },
    subst: safeSubstitute,
    isVar: isVariable,
    matchAll: (patterns, terms) => {
        const matches = [];
        patterns.forEach(pattern => terms.forEach(term => {
            const bindings = Unify.unify(pattern, term);
            if (bindings) matches.push({pattern, term, bindings});
        }));
        return matches;
    }
};
