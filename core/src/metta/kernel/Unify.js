/**
 * Unify.js - Pattern matching with occurs check
 * Core unification algorithm for MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isVariable, isExpression, isSymbol, clone, isList, flattenList, constructList, exp } from './Term.js';

// Define substitute function first to avoid circular reference
const substitute = (term, bindings, visited = new Set()) => {
    if (!term) return term;

    // Fast path for variables
    if (isVariable(term)) {
        if (bindings.hasOwnProperty(term.name)) {
            let value = bindings[term.name];
            let chainCount = 0;
            while (isVariable(value) && bindings.hasOwnProperty(value.name)) {
                value = bindings[value.name];
                if (value === term) break;
                if (chainCount++ > 100) break;
            }
            return value === undefined ? term : value;
        }
        return term;
    }

    if (isExpression(term)) {
        // Optimization for lists
        if (isList(term)) {
            const { elements, tail } = flattenList(term);
            // Iterative map
            const substElements = new Array(elements.length);
            for (let i = 0; i < elements.length; i++) {
                substElements[i] = substitute(elements[i], bindings, new Set(visited));
            }
            const substTail = substitute(tail, bindings, new Set(visited));

            let changed = false;
            if (substTail !== tail) changed = true;
            else {
                for (let i = 0; i < elements.length; i++) {
                    if (substElements[i] !== elements[i]) {
                        changed = true;
                        break;
                    }
                }
            }
            if (!changed) return term;
            return constructList(substElements, substTail);
        }

        // Iterative substitution to prevent stack overflow
        return iterativeSubstitute(term, bindings, visited);
    }
    return term;
};

// === Internal Functions ===

const unifyExpressions = (term1, term2, bindings) => {
    let currentBindings = bindings;

    // Special case: list unification
    if (isList(term1) && isList(term2)) {
        return unifyLists(term1, term2, currentBindings);
    }

    // Operator unification
    if (typeof term1.operator === 'object' || typeof term2.operator === 'object') {
        if (typeof term1.operator !== 'object' || typeof term2.operator !== 'object') return null;
        const opUnified = Unify.unify(term1.operator, term2.operator, currentBindings);
        if (opUnified === null) return null;
        currentBindings = opUnified;
    } else if (term1.operator !== term2.operator) {
        return null;
    }

    // Component count check
    if (term1.components.length !== term2.components.length) return null;

    // Component unification
    for (let i = 0; i < term1.components.length; i++) {
        const unified = Unify.unify(term1.components[i], term2.components[i], currentBindings);
        if (unified === null) return null;
        currentBindings = unified;
    }
    return currentBindings;
};

const unifyLists = (list1, list2, bindings) => {
    const flat1 = flattenList(list1);
    const flat2 = flattenList(list2);
    const len = Math.min(flat1.elements.length, flat2.elements.length);

    let currentBindings = bindings;
    for (let i = 0; i < len; i++) {
        const unified = Unify.unify(flat1.elements[i], flat2.elements[i], currentBindings);
        if (unified === null) return null;
        currentBindings = unified;
    }

    const remaining1 = flat1.elements.slice(len);
    const remaining2 = flat2.elements.slice(len);

    const tail1 = remaining1.length > 0 ? constructList(remaining1, flat1.tail) : flat1.tail;
    const tail2 = remaining2.length > 0 ? constructList(remaining2, flat2.tail) : flat2.tail;

    return Unify.unify(tail1, tail2, currentBindings);
};

const bindVariable = (variable, term, bindings) => {
    if (occursCheck(variable, term, bindings)) return null;
    const newBindings = { ...bindings };
    newBindings[variable.name] = term;
    return newBindings;
};

const occursCheck = (variable, term, bindings) => {
    const boundTerm = substitute(term, bindings);
    if (isVariable(boundTerm) && boundTerm.name === variable.name) return true;
    if (isExpression(boundTerm)) {
        const stack = [boundTerm];
        while (stack.length > 0) {
            const t = stack.pop();
            if (isVariable(t) && t.name === variable.name) return true;
            if (isExpression(t)) {
                if (isList(t)) {
                    const { elements, tail } = flattenList(t);
                    for (const el of elements) stack.push(el);
                    stack.push(tail);
                } else {
                    for (const comp of t.components) stack.push(comp);
                }
            }
        }
    }
    return false;
};

// Helper: Iterative substitution to prevent stack overflow
const iterativeSubstitute = (rootTerm, bindings, visited) => {
    const stack = [{ term: rootTerm, processed: false }];
    const resultStack = [];

    while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        const { term, processed } = frame;

        if (processed) {
            stack.pop();
            if (term && typeof term === 'object') visited.delete(term);

            if (isExpression(term)) {
                const numComponents = term.components.length;
                const newComponents = new Array(numComponents);
                for (let i = numComponents - 1; i >= 0; i--) {
                    newComponents[i] = resultStack.pop();
                }

                let newOperator = term.operator;
                if (typeof term.operator === 'object' && term.operator !== null) {
                    newOperator = resultStack.pop();
                }

                let changed = (newOperator !== term.operator);
                if (!changed) {
                    for (let i = 0; i < numComponents; i++) {
                        if (newComponents[i] !== term.components[i]) {
                            changed = true;
                            break;
                        }
                    }
                }

                if (!changed) {
                    resultStack.push(term);
                } else {
                    const opString = typeof newOperator === 'string' ? newOperator : (newOperator.toString ? newOperator.toString() : String(newOperator));
                    const newName = `(${opString} ${newComponents.map(c => c.name || c).join(' ')})`;
                    const newTerm = {
                        ...term,
                        operator: newOperator,
                        components: Object.freeze(newComponents),
                        name: newName,
                        toString: () => newName
                    };
                    resultStack.push(newTerm);
                }
            } else if (isVariable(term)) {
                // Handled in processed=false
            } else {
                resultStack.push(term);
            }
            continue;
        }

        // First visit
        frame.processed = true;
        if (term && typeof term === 'object') {
            if (visited.has(term)) {
                stack.pop();
                resultStack.push(term);
                continue;
            }
            visited.add(term);
        }

        if (isVariable(term)) {
            if (bindings.hasOwnProperty(term.name)) {
                let value = bindings[term.name];
                let chainCount = 0;
                while (isVariable(value) && bindings.hasOwnProperty(value.name)) {
                    value = bindings[value.name];
                    if (value === term) break;
                    if (chainCount++ > 100) break;
                }
                resultStack.push(value === undefined ? term : value);
            } else {
                resultStack.push(term);
            }
            stack.pop();
            if (term && typeof term === 'object') visited.delete(term);
            continue;
        }

        if (isExpression(term)) {
            for (let i = term.components.length - 1; i >= 0; i--) {
                stack.push({ term: term.components[i], processed: false });
            }
            if (typeof term.operator === 'object' && term.operator !== null) {
                stack.push({ term: term.operator, processed: false });
            }
        } else {
            resultStack.push(term);
            stack.pop();
            if (term && typeof term === 'object') visited.delete(term);
        }
    }

    return resultStack[resultStack.length - 1];
};

// Export an object with the expected API for tests - define after functions are declared
export const Unify = {
    unify: (term1, term2, bindings = {}) => {
        const resultBindings = { ...bindings };
        const boundTerm1 = substitute(term1, resultBindings);
        const boundTerm2 = substitute(term2, resultBindings);

        // Structural equality check
        if (boundTerm1.equals && boundTerm1.equals(boundTerm2)) return resultBindings;

        // Variable binding cases
        if (isVariable(boundTerm1)) return bindVariable(boundTerm1, boundTerm2, resultBindings);
        if (isVariable(boundTerm2)) return bindVariable(boundTerm2, boundTerm1, resultBindings);

        // Expression unification
        if (isExpression(boundTerm1) && isExpression(boundTerm2)) {
            return unifyExpressions(boundTerm1, boundTerm2, resultBindings);
        }
        return null;
    },

    subst: substitute,
    isVar: isVariable,
    matchAll: (patterns, terms) => {
        const matches = [];
        for (const pattern of patterns) {
            for (const term of terms) {
                const bindings = Unify.unify(pattern, term);
                if (bindings !== null) matches.push({ pattern, term, bindings });
            }
        }
        return matches;
    }
};
