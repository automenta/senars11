/**
 * Unifier.js
 * 
 * Provides unification and pattern matching capabilities for Terms.
 * Extracted from PrologStrategy.js to support general-purpose rule matching.
 */

import { isVariable, isCompound, termsEqual, getComponents, getOperator, getVariableName } from './TermUtils.js';

export class Unifier {
    constructor(termFactory) {
        this.termFactory = termFactory;
    }

    /**
     * Unify two terms and return the substitution.
     * Two-way unification: variables in both terms can be bound.
     * 
     * @param {Term} term1 
     * @param {Term} term2 
     * @param {Object} substitution - Existing substitution
     * @returns {{success: boolean, substitution: Object}}
     */
    unify(term1, term2, substitution = {}) {
        const t1 = this.applySubstitution(term1, substitution);
        const t2 = this.applySubstitution(term2, substitution);

        if (isVariable(t1)) return this._unifyVariable(t1, t2, substitution);
        if (isVariable(t2)) return this._unifyVariable(t2, t1, substitution);

        if (termsEqual(t1, t2)) return { success: true, substitution };

        if (isCompound(t1) && isCompound(t2)) {
            const comps1 = getComponents(t1);
            const comps2 = getComponents(t2);

            if (comps1.length !== comps2.length) {
                return { success: false, substitution: {} };
            }

            if ((getOperator(t1) || '') !== (getOperator(t2) || '')) {
                return { success: false, substitution: {} };
            }

            let currentSubstitution = substitution;

            for (let i = 0; i < comps1.length; i++) {
                const result = this.unify(comps1[i], comps2[i], currentSubstitution);
                if (!result.success) return { success: false, substitution: {} };
                currentSubstitution = result.substitution;
            }
            return { success: true, substitution: currentSubstitution };
        }

        return { success: false, substitution: {} };
    }

    /**
     * Match a pattern against a term (One-way unification).
     * Only variables in the pattern are bound. Variables in the term are treated as constants.
     * 
     * @param {Term} pattern - The pattern term (may contain variables)
     * @param {Term} term - The concrete term (variables treated as constants)
     * @param {Object} substitution - Existing substitution
     * @returns {{success: boolean, substitution: Object}}
     */
    match(pattern, term, substitution = {}) {
        // Apply existing substitution to pattern ONLY
        const p = this.applySubstitution(pattern, substitution);

        // If pattern is a variable, bind it to the term
        if (isVariable(p)) {
            return this._unifyVariable(p, term, substitution);
        }

        // If pattern is compound, recurse
        if (isCompound(p) && isCompound(term)) {
            if (getOperator(p) !== getOperator(term)) return { success: false, substitution: {} };

            const pComps = getComponents(p);
            const tComps = getComponents(term);

            if (pComps.length !== tComps.length) return { success: false, substitution: {} };

            let currentSub = substitution;
            for (let i = 0; i < pComps.length; i++) {
                const res = this.match(pComps[i], tComps[i], currentSub);
                if (!res.success) return { success: false, substitution: {} };
                currentSub = res.substitution;
            }
            return { success: true, substitution: currentSub };
        }

        // Atomic equality check
        if (termsEqual(p, term)) {
            return { success: true, substitution };
        }

        return { success: false, substitution: {} };
    }

    _unifyVariable(variable, term, substitution) {
        const varName = getVariableName(variable);

        // If variable is already bound, unify the binding with the term
        if (substitution[varName]) {
            return this.unify(substitution[varName], term, substitution);
        }

        // If term is a variable and already bound, unify variable with term's binding
        const termVarName = getVariableName(term);
        if (isVariable(term) && substitution[termVarName]) {
            return this.unify(variable, substitution[termVarName], substitution);
        }

        // Occurs check
        if (this._occursCheck(varName, term, substitution)) {
            return { success: false, substitution: {} };
        }

        // Bind variable to term
        return {
            success: true,
            substitution: { ...substitution, [varName]: term }
        };
    }

    _occursCheck(varName, term, substitution) {
        if (isVariable(term) && getVariableName(term) === varName) return true;

        if (isCompound(term)) {
            return getComponents(term).some(comp => this._occursCheck(varName, comp, substitution));
        }

        return false;
    }

    applySubstitution(term, substitution) {
        if (!term) return term;

        if (isVariable(term)) {
            const varName = getVariableName(term);
            if (substitution[varName]) {
                return this.applySubstitution(substitution[varName], substitution);
            }
            return term;
        }

        if (isCompound(term)) {
            const components = getComponents(term);
            let changed = false;
            const newComponents = components.map(comp => {
                const newComp = this.applySubstitution(comp, substitution);
                if (newComp !== comp) changed = true;
                return newComp;
            });

            if (changed) {
                return this.termFactory.create(getOperator(term), newComponents);
            }
        }

        return term;
    }
}
