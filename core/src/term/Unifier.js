import { getComponents, getOperator, getVariableName, isCompound, isVariable, termsEqual } from './TermUtils.js';

const FAILURE = { success: false, substitution: {} };

export class Unifier {
    constructor(termFactory) {
        this.termFactory = termFactory;
    }

    unify(term1, term2, substitution = {}) {
        const t1 = this.applySubstitution(term1, substitution);
        const t2 = this.applySubstitution(term2, substitution);

        if (isVariable(t1)) return this._unifyVariable(t1, t2, substitution);
        if (isVariable(t2)) return this._unifyVariable(t2, t1, substitution);
        if (termsEqual(t1, t2)) return { success: true, substitution };

        if (isCompound(t1) && isCompound(t2)) {
            const comps1 = getComponents(t1);
            const comps2 = getComponents(t2);

            if (comps1.length !== comps2.length ||
                (getOperator(t1) ?? '') !== (getOperator(t2) ?? '')) {
                return FAILURE;
            }

            let currentSubstitution = substitution;
            for (let i = 0; i < comps1.length; i++) {
                const result = this.unify(comps1[i], comps2[i], currentSubstitution);
                if (!result.success) return FAILURE;
                currentSubstitution = result.substitution;
            }
            return { success: true, substitution: currentSubstitution };
        }

        return FAILURE;
    }

    match(pattern, term, substitution = {}) {
        const p = this.applySubstitution(pattern, substitution);

        if (isVariable(p)) return this._unifyVariable(p, term, substitution);

        if (isCompound(p) && isCompound(term)) {
            if (getOperator(p) !== getOperator(term)) return FAILURE;

            const pComps = getComponents(p);
            const tComps = getComponents(term);
            if (pComps.length !== tComps.length) return FAILURE;

            let currentSub = substitution;
            for (let i = 0; i < pComps.length; i++) {
                const res = this.match(pComps[i], tComps[i], currentSub);
                if (!res.success) return FAILURE;
                currentSub = res.substitution;
            }
            return { success: true, substitution: currentSub };
        }

        return termsEqual(p, term)
            ? { success: true, substitution }
            : FAILURE;
    }

    _unifyVariable(variable, term, substitution) {
        const varName = getVariableName(variable);

        if (substitution[varName]) {
            return this.unify(substitution[varName], term, substitution);
        }

        const termVarName = getVariableName(term);
        if (isVariable(term) && substitution[termVarName]) {
            return this.unify(variable, substitution[termVarName], substitution);
        }

        if (this._occursCheck(varName, term, substitution)) {
            return FAILURE;
        }

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

    applySubstitution(term, substitution, visited = new Set()) {
        if (!term) return term;

        if (isVariable(term)) {
            const varName = getVariableName(term);
            if (substitution[varName]) {
                if (visited.has(varName)) return term; // Cycle detected
                visited.add(varName);
                return this.applySubstitution(substitution[varName], substitution, visited);
            }
            return term;
        }

        if (isCompound(term)) {
            const components = getComponents(term);
            let changed = false;
            const newComponents = components.map(comp => {
                const newComp = this.applySubstitution(comp, substitution, new Set(visited));
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
