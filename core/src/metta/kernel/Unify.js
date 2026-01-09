/**
 * Minimal MeTTa Kernel - Unification and Substitution
 * 
 * Pattern matching with occurs check and variable substitution.
 * No dependencies on TermFactory - works directly with kernel terms.
 */

/**
 * Check if a term is a variable (name starts with $)
 * @param {object} term - Term to check
 * @returns {boolean} True if variable
 */
function isVar(term) {
    return term && term.type === 'atom' && term.name.startsWith('$');
}

/**
 * Unify two terms, producing a substitution (bindings map)
 * @param {object} pattern - Pattern term
 * @param {object} term - Term to match against
 * @param {object} bindings - Existing variable bindings
 * @returns {object|null} Bindings map or null if unification fails
 */
function unify(pattern, term, bindings = {}) {
    // Apply current substitutions first
    const p = subst(pattern, bindings);
    const t = subst(term, bindings);

    // Variable in pattern: bind it
    if (isVar(p)) {
        return unifyVariable(p, t, bindings);
    }

    // Variable in term: bind it  
    if (isVar(t)) {
        return unifyVariable(t, p, bindings);
    }

    // Both atomic: check equality
    if (p.type === 'atom' && t.type === 'atom') {
        return p.name === t.name ? bindings : null;
    }

    // Both compound: check operator and recursively unify components
    if (p.type === 'compound' && t.type === 'compound') {
        if (p.operator !== t.operator) {
            return null;
        }

        if (p.components.length !== t.components.length) {
            return null;
        }

        let currentBindings = bindings;
        for (let i = 0; i < p.components.length; i++) {
            currentBindings = unify(p.components[i], t.components[i], currentBindings);
            if (currentBindings === null) {
                return null; // Unification failed
            }
        }

        return currentBindings;
    }

    // Type mismatch: can't unify
    return null;
}

/**
 * Unify a variable with a term
 * @param {object} variable - Variable term
 * @param {object} term - Term to bind to
 * @param {object} bindings - Current bindings
 * @returns {object|null} Updated bindings or null
 */
function unifyVariable(variable, term, bindings) {
    const varName = variable.name;

    // Variable already bound: unify its binding with term
    if (bindings[varName]) {
        return unify(bindings[varName], term, bindings);
    }

    // Term is a variable that's already bound: unify variable with term's binding
    if (isVar(term) && bindings[term.name]) {
        return unify(variable, bindings[term.name], bindings);
    }

    // Occurs check: prevent infinite structures
    if (occursCheck(varName, term, bindings)) {
        return null;
    }

    // Create new binding
    return { ...bindings, [varName]: term };
}

/**
 * Check if variable occurs in term (prevents infinite structures)
 * @param {string} varName - Variable name
 * @param {object} term - Term to check
 * @param {object} bindings - Current bindings
 * @returns {boolean} True if variable occurs in term
 */
function occursCheck(varName, term, bindings) {
    // Follow bindings
    const resolved = isVar(term) && bindings[term.name]
        ? bindings[term.name]
        : term;

    // Variable occurs in itself
    if (isVar(resolved) && resolved.name === varName) {
        return true;
    }

    // Recursively check components
    if (resolved.type === 'compound') {
        return resolved.components.some(comp => occursCheck(varName, comp, bindings));
    }

    return false;
}

/**
 * Substitute variables in a term using bindings
 * @param {object} term - Term with variables
 * @param {object} bindings - Variable bindings
 * @returns {object} Term with variables substituted
 */
function subst(term, bindings) {
    if (!term) {
        return term;
    }

    // Variable: substitute if bound
    if (isVar(term)) {
        const varName = term.name;
        if (bindings[varName]) {
            // Recursively substitute in case binding contains variables
            return subst(bindings[varName], bindings);
        }
        return term;
    }

    // Compound: recursively substitute in components
    if (term.type === 'compound') {
        let changed = false;
        const newComponents = term.components.map(comp => {
            const newComp = subst(comp, bindings);
            if (newComp !== comp) {
                changed = true;
            }
            return newComp;
        });

        if (changed) {
            // Rebuild compound term with substituted components
            // Import Term module to rebuild
            const componentNames = newComponents.map(c => c.toString()).join(', ');
            const name = `(${term.operator}, ${componentNames})`;

            return Object.freeze({
                type: 'compound',
                name,
                operator: term.operator,
                components: Object.freeze(newComponents),
                toString: () => name
            });
        }
    }

    // Atomic: return as-is
    return term;
}

/**
 * Match all patterns against all terms, returning successful matches
 * @param {Array} patterns - Array of pattern terms
 * @param {Array} terms - Array of terms to match
 * @returns {Array} Array of {pattern, term, bindings} objects
 */
function matchAll(patterns, terms) {
    const matches = [];

    for (const pattern of patterns) {
        for (const term of terms) {
            const bindings = unify(pattern, term);
            if (bindings !== null) {
                matches.push({ pattern, term, bindings });
            }
        }
    }

    return matches;
}

export const Unify = {
    isVar,
    unify,
    subst,
    matchAll
};
