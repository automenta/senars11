/**
 * Unify.js - Pattern matching with occurs check
 * Core unification algorithm for MeTTa
 */

import { isVariable, isExpression, isSymbol, clone } from './Term.js';

/**
 * Unify two terms with variable bindings
 * @param {Object} term1 - First term
 * @param {Object} term2 - Second term
 * @param {Map} bindings - Current bindings (optional)
 * @returns {Map|null} Resulting bindings or null if unification fails
 */
export function unify(term1, term2, bindings = new Map()) {
    // Clone bindings to avoid modifying the original
    const resultBindings = new Map(bindings);
    
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
        // Check if operators match
        if (!boundTerm1.operator.equals(boundTerm2.operator)) {
            return null;
        }
        
        // Check if number of arguments match
        if (boundTerm1.args.length !== boundTerm2.args.length) {
            return null;
        }
        
        // Recursively unify arguments
        let currentBindings = resultBindings;
        for (let i = 0; i < boundTerm1.args.length; i++) {
            const unified = unify(boundTerm1.args[i], boundTerm2.args[i], currentBindings);
            if (unified === null) {
                return null;
            }
            currentBindings = unified;
        }
        
        return currentBindings;
    }
    
    // Case 5: Terms are incompatible
    return null;
}

/**
 * Bind a variable to a term with occurs check
 * @private
 * @param {Object} variable - Variable to bind
 * @param {Object} term - Term to bind to
 * @param {Map} bindings - Current bindings
 * @returns {Map|null} Updated bindings or null if fails
 */
function bindVariable(variable, term, bindings) {
    // Occurs check: prevent circular references
    if (occursCheck(variable, term, bindings)) {
        return null;
    }
    
    // Create new bindings with the variable bound to the term
    const newBindings = new Map(bindings);
    newBindings.set(variable.name, term);
    return newBindings;
}

/**
 * Check if a variable occurs in a term (with bindings applied)
 * @private
 * @param {Object} variable - Variable to check for
 * @param {Object} term - Term to check in
 * @param {Map} bindings - Current bindings
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
        for (const arg of boundTerm.args) {
            if (occursCheck(variable, arg, bindings)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Substitute variables in a term with their bindings
 * @param {Object} term - Term to substitute in
 * @param {Map} bindings - Variable bindings
 * @returns {Object} Term with substitutions applied
 */
export function substitute(term, bindings) {
    if (!term) return term;
    
    // If term is a variable, try to substitute it
    if (isVariable(term)) {
        if (bindings.has(term.name)) {
            return bindings.get(term.name);
        }
        return term;
    }
    
    // If term is an expression, substitute in its components
    if (isExpression(term)) {
        const substitutedArgs = term.args.map(arg => substitute(arg, bindings));
        return { ...term, args: substitutedArgs, components: [term.operator, ...substitutedArgs] };
    }
    
    // For symbols or other terms, return as-is
    return term;
}

/**
 * Create a copy of bindings
 * @param {Map} bindings - Bindings to copy
 * @returns {Map} Copy of bindings
 */
export function copyBindings(bindings) {
    return new Map(bindings);
}

/**
 * Extend bindings with new mappings
 * @param {Map} baseBindings - Base bindings
 * @param {Map} newBindings - New bindings to add
 * @returns {Map} Combined bindings
 */
export function extendBindings(baseBindings, newBindings) {
    const combined = new Map(baseBindings);
    for (const [key, value] of newBindings) {
        combined.set(key, value);
    }
    return combined;
}