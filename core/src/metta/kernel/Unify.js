/**
 * Unify.js - Pattern matching with occurs check
 * Core unification algorithm for MeTTa
 */

import { isVariable, isExpression, isSymbol, clone } from './Term.js';

// Export an object with the expected API for tests
export const Unify = {
    /**
     * Unify two terms with variable bindings
     * @param {Object} term1 - First term
     * @param {Object} term2 - Second term
     * @param {Object} bindings - Current bindings (optional)
     * @returns {Object|null} Resulting bindings or null if unification fails
     */
    unify: function(term1, term2, bindings = {}) {
        // Use plain object instead of Map for test compatibility
        const resultBindings = {...bindings};

        // Apply current bindings to both terms
        const boundTerm1 = substitute(term1, resultBindings);
        const boundTerm2 = substitute(term2, resultBindings);

        // Case 1: Both terms are identical
        if (boundTerm1.equals && boundTerm1.equals(boundTerm2)) {
            return resultBindings;
        }

        // Case 2: First term is a variable
        if (isVariable(boundTerm1)) {
            return bindVariable(boundTerm1, boundTerm2, resultBindings);
        }

        // Case 3: Second term is a variable
        if (isVariable(boundTerm2)) {
            return bindVariable(boundTerm2, boundTerm1, resultBindings);
        }

        // Case 4: Both terms are expressions
        if (isExpression(boundTerm1) && isExpression(boundTerm2)) {
            let currentBindings = resultBindings;

            // Unify operators if they are objects, or check strict equality if primitives
            if (typeof boundTerm1.operator === 'object' || typeof boundTerm2.operator === 'object') {
                // log(`Unifying operators: ${boundTerm1.operator} vs ${boundTerm2.operator}`);
                // If one is object and other isn't, they don't match (unless implicit conversion logic exists, but let's be strict)
                if (typeof boundTerm1.operator !== 'object' || typeof boundTerm2.operator !== 'object') {
                    // log(`Operator type mismatch`);
                    return null;
                }
                // Recursively unify operators
                const opUnified = Unify.unify(boundTerm1.operator, boundTerm2.operator, currentBindings);
                if (opUnified === null) {
                    // log(`Operator unification failed`);
                    return null;
                }
                currentBindings = opUnified;
                // log(`Operator unified. Bindings: ${JSON.stringify(Object.keys(currentBindings))}`);
            } else {
                // Check if operators match (strings)
                if (boundTerm1.operator !== boundTerm2.operator) {
                    return null;
                }
            }

            // Check if number of arguments match
            if (boundTerm1.components.length !== boundTerm2.components.length) {
                return null;
            }

            // Recursively unify arguments
            // Note: currentBindings might have been updated by operator unification
            for (let i = 0; i < boundTerm1.components.length; i++) {
                const unified = Unify.unify(boundTerm1.components[i], boundTerm2.components[i], currentBindings);
                if (unified === null) {
                    return null;
                }
                currentBindings = unified;
            }

            // log(`Unify success. Bindings: ${JSON.stringify(Object.keys(currentBindings))}`);
            return currentBindings;
        }

        // Case 5: Terms are incompatible
        return null;
    },

    /**
     * Substitute variables in a term with their bindings
     * @param {Object} term - Term to substitute in
     * @param {Object} bindings - Variable bindings
     * @returns {Object} Term with substitutions applied
     */
    subst: substitute,  // Changed to match expected name

    /**
     * Check if a term is a variable
     * @param {Object} term - Term to check
     * @returns {boolean} True if term is a variable
     */
    isVar: isVariable,

    /**
     * Match all patterns against terms
     * @param {Array} patterns - Array of pattern terms
     * @param {Array} terms - Array of terms to match against
     * @returns {Array} Array of matches with pattern, term, and bindings
     */
    matchAll: function(patterns, terms) {
        const matches = [];

        for (const pattern of patterns) {
            for (const term of terms) {
                const bindings = Unify.unify(pattern, term);
                if (bindings !== null) {
                    matches.push({ pattern, term, bindings });
                }
            }
        }

        return matches;
    }
};

/**
 * Bind a variable to a term with occurs check
 * @private
 * @param {Object} variable - Variable to bind
 * @param {Object} term - Term to bind to
 * @param {Object} bindings - Current bindings
 * @returns {Object|null} Updated bindings or null if fails
 */
function bindVariable(variable, term, bindings) {
    // Occurs check: prevent circular references
    if (occursCheck(variable, term, bindings)) {
        return null;
    }

    // Create new bindings with the variable bound to the term
    const newBindings = {...bindings};
    newBindings[variable.name] = term;
    return newBindings;
}

/**
 * Check if a variable occurs in a term (with bindings applied)
 * @private
 * @param {Object} variable - Variable to check for
 * @param {Object} term - Term to check in
 * @param {Object} bindings - Current bindings
 * @returns {boolean} True if variable occurs in term
 */
function occursCheck(variable, term, bindings) {
    // Apply current bindings to term
    const boundTerm = substitute(term, bindings);

    // If the term is the variable itself, it occurs
    if (isVariable(boundTerm) && boundTerm.name === variable.name) {
        return true;
    }

    // If the term is an expression, check recursively
    if (isExpression(boundTerm)) {
        for (const comp of boundTerm.components) {
            if (occursCheck(variable, comp, bindings)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Substitute variables in a term with their bindings
 * @param {Object} term - Term to substitute in
 * @param {Object} bindings - Variable bindings
 * @returns {Object} Term with substitutions applied
 */
function substitute(term, bindings) {
    if (!term) return term;

    // If term is a variable, try to substitute it
    if (isVariable(term)) {
        if (bindings.hasOwnProperty(term.name)) {
            let value = bindings[term.name];
            // Handle transitive bindings - if the value is also a variable that's bound, keep resolving
            while (isVariable(value) && bindings.hasOwnProperty(value.name)) {
                value = bindings[value.name];
                // Prevent infinite loops
                if (value === term) break;
            }
            return value;
        }
        return term;
    }

    // If term is an expression, substitute in its components
    if (isExpression(term)) {
        const substitutedComponents = term.components.map(comp => substitute(comp, bindings));

        // Also substitute in operator if it is an object
        let substitutedOperator = term.operator;
        let operatorChanged = false;
        if (typeof term.operator === 'object' && term.operator !== null) {
            substitutedOperator = substitute(term.operator, bindings);
            if (substitutedOperator !== term.operator) {
                operatorChanged = true;
            }
        }

        // Optimize: if no components changed and operator unchanged, return original term
        let componentsChanged = false;
        for (let i = 0; i < term.components.length; i++) {
            if (substitutedComponents[i] !== term.components[i]) {
                componentsChanged = true;
                break;
            }
        }

        if (!componentsChanged && !operatorChanged) return term;

        // Create new expression with substituted components
        const opString = typeof substitutedOperator === 'string' ? substitutedOperator : (substitutedOperator.toString ? substitutedOperator.toString() : String(substitutedOperator));
        return {
            ...term,
            operator: substitutedOperator,
            components: substitutedComponents,
            // Update name if needed
            name: `(${opString}, ${substitutedComponents.map(c => c.name || c).join(', ')})`,
            equals: term.equals // keep the equals function
        };
    }

    // For symbols or other terms, return as-is
    return term;
}

/**
 * Create a copy of bindings
 * @param {Object} bindings - Bindings to copy
 * @returns {Object} Copy of bindings
 */
function copyBindings(bindings) {
    return {...bindings};
}

/**
 * Extend bindings with new mappings
 * @param {Object} baseBindings - Base bindings
 * @param {Object} newBindings - New bindings to add
 * @returns {Object} Combined bindings
 */
function extendBindings(baseBindings, newBindings) {
    return {...baseBindings, ...newBindings};
}
