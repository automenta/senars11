import { getComponents, getOperator, getVariableName, isCompound, isVariable, termsEqual } from './TermUtils.js';
import * as UnifyCore from './UnifyCore.js';

const FAILURE = { success: false, substitution: {} };

export class Unifier {
    constructor(termFactory) {
        this.termFactory = termFactory;

        // NARS term adapter for UnifyCore
        this.adapter = {
            isVariable: term => isVariable(term),
            isCompound: term => isCompound(term),
            getVariableName: term => getVariableName(term),
            getOperator: term => getOperator(term) ?? '',
            getComponents: term => getComponents(term),
            equals: (t1, t2) => termsEqual(t1, t2),
            substitute: (term, bindings) => this.applySubstitution(term, bindings),
            reconstruct: (term, newComponents) => {
                const operator = getOperator(term);
                return this.termFactory.create(operator, newComponents);
            }
        };
    }

    unify(term1, term2, substitution = {}) {
        const result = UnifyCore.unify(term1, term2, substitution, this.adapter);
        return result ? { success: true, substitution: result } : FAILURE;
    }

    match(pattern, term, substitution = {}) {
        const result = UnifyCore.match(pattern, term, substitution, this.adapter);
        return result ? { success: true, substitution: result } : FAILURE;
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
