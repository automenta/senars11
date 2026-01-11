/**
 * Unify.js - Pattern matching with occurs check
 * Core unification algorithm for MeTTa
 */

import { isVariable, isExpression, isSymbol, clone, isList, flattenList, constructList, exp } from './Term.js';

// Export an object with the expected API for tests
export const Unify = {
    unify: function (term1, term2, bindings = {}) {
        const resultBindings = { ...bindings };
        const boundTerm1 = substitute(term1, resultBindings);
        const boundTerm2 = substitute(term2, resultBindings);

        if (boundTerm1.equals && boundTerm1.equals(boundTerm2)) return resultBindings;
        if (isVariable(boundTerm1)) return bindVariable(boundTerm1, boundTerm2, resultBindings);
        if (isVariable(boundTerm2)) return bindVariable(boundTerm2, boundTerm1, resultBindings);

        if (isExpression(boundTerm1) && isExpression(boundTerm2)) {
            let currentBindings = resultBindings;

            if (isList(boundTerm1) && isList(boundTerm2)) {
                const list1 = flattenList(boundTerm1);
                const list2 = flattenList(boundTerm2);
                const len = Math.min(list1.elements.length, list2.elements.length);
                for (let i = 0; i < len; i++) {
                    const unified = Unify.unify(list1.elements[i], list2.elements[i], currentBindings);
                    if (unified === null) return null;
                    currentBindings = unified;
                }
                let tail1 = list1.tail;
                let tail2 = list2.tail;
                if (list1.elements.length > len) tail1 = constructList(list1.elements.slice(len), list1.tail);
                if (list2.elements.length > len) tail2 = constructList(list2.elements.slice(len), list2.tail);
                return Unify.unify(tail1, tail2, currentBindings);
            }

            if (typeof boundTerm1.operator === 'object' || typeof boundTerm2.operator === 'object') {
                if (typeof boundTerm1.operator !== 'object' || typeof boundTerm2.operator !== 'object') return null;
                const opUnified = Unify.unify(boundTerm1.operator, boundTerm2.operator, currentBindings);
                if (opUnified === null) return null;
                currentBindings = opUnified;
            } else {
                if (boundTerm1.operator !== boundTerm2.operator) return null;
            }

            if (boundTerm1.components.length !== boundTerm2.components.length) return null;

            for (let i = 0; i < boundTerm1.components.length; i++) {
                const unified = Unify.unify(boundTerm1.components[i], boundTerm2.components[i], currentBindings);
                if (unified === null) return null;
                currentBindings = unified;
            }
            return currentBindings;
        }
        return null;
    },

    subst: substitute,
    isVar: isVariable,
    matchAll: function (patterns, terms) {
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

function bindVariable(variable, term, bindings) {
    if (occursCheck(variable, term, bindings)) return null;
    const newBindings = { ...bindings };
    newBindings[variable.name] = term;
    return newBindings;
}

function occursCheck(variable, term, bindings) {
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
}




function substitute(term, bindings, visited = new Set()) {
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

        // Iterative substitution for deep expressions (using stack to simulate recursion)
        // Only trigger this for deep trees, otherwise recursion is faster/simpler.
        // Actually, we can use a recursive structure with manual stack if depth is an issue.
        // But for typical expression trees (not lists), depth is usually fine.
        // The issue in maze_solver seems to be deep nesting of filters/lists that are not detected as lists.
        // Let's implement a robust iterative substitution.

        return iterativeSubstitute(term, bindings, visited);
    }
    return term;
}

// Helper: Iterative substitution to prevent stack overflow
function iterativeSubstitute(rootTerm, bindings, visited) {
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
                    const newName = `(${opString}, ${newComponents.map(c => c.name || c).join(', ')})`;
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
}
