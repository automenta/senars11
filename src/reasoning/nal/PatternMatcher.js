import {Term} from '../../term/Term.js';

export class PatternMatcher {
    unify = (pattern, term, existingBindings = null) => {
        const bindings = existingBindings || new Map();
        return this._unifyTerms(pattern, term, bindings) ? bindings : null;
    }

    unifyMultiple = (patternTermPairs, initialBindings = new Map()) => {
        let currentBindings = new Map(initialBindings);
        for (const {pattern, term} of patternTermPairs) {
            const result = this.unify(pattern, term, currentBindings);
            if (!result) return null;
            currentBindings = result;
        }
        return currentBindings;
    }

    _unifyTerms(pattern, term, bindings) {
        if (this._isVariable(pattern)) {
            return this._bindVariable(pattern, term, bindings);
        }

        if (pattern.type !== term.type) return false;
        if (pattern.isAtomic) return this._termsEqual(pattern, term, bindings);
        if (pattern.isCompound) return this._unifyCompound(pattern, term, bindings);
        return false;
    }

    _bindVariable(pattern, term, bindings) {
        const variableName = pattern.name || pattern.toString();
        if (bindings.has(variableName)) {
            return this._termsEqual(bindings.get(variableName), term, bindings);
        }
        bindings.set(variableName, term);
        return true;
    }

    _unifyCompound(pattern, term, bindings) {
        if (pattern.operator !== term.operator || pattern.components.length !== term.components.length) return false;
        return pattern.components.every((comp, i) => this._unifyTerms(comp, term.components[i], bindings));
    }

    substitute(term, bindings) {
        if (this._isVariable(term)) {
            const variableName = term.name || term.toString();
            if (bindings.has(variableName)) {
                return this.substitute(bindings.get(variableName), bindings);
            }
            return term;
        }

        return term.isCompound 
            ? new Term(term.type, term.name, term.components.map(comp => this.substitute(comp, bindings)), term.operator)
            : term;
    }

    _isVariable = (term) => !!(term?.name?.startsWith?.('?'))

    _termsEqual(t1, t2, bindings = null) {
        if (!t1 || !t2) return t1 === t2;

        if (bindings) {
            t1 = this.substitute(t1, bindings);
            t2 = this.substitute(t2, bindings);
        }

        if (typeof t1.equals === 'function') return t1.equals(t2);
        if (t1.name !== t2.name) return false;

        if (t1.isAtomic && t2.isAtomic) return true;

        if (t1.isCompound && t2.isCompound) {
            return t1.operator === t2.operator && 
                   t1.components.length === t2.components.length && 
                   t1.components.every((comp, i) => this._termsEqual(comp, t2.components[i], bindings));
        }

        return false;
    }

    unifyHigherOrder = (pattern, term, existingBindings = null) => {
        const bindings = existingBindings || new Map();
        return this._unifyHigherOrderTerms(pattern, term, bindings) ? bindings : null;
    }

    _unifyHigherOrderTerms(pattern, term, bindings) {
        if (this._isVariable(pattern)) {
            return this._bindVariableHigherOrder(pattern, term, bindings);
        }

        if (pattern.isAtomic && term.isAtomic) return this._termsEqualHigherOrder(pattern, term, bindings);

        if (pattern.isCompound && term.isCompound && pattern.operator === term.operator) {
            return this._unifyCompound(pattern, term, bindings);
        }

        // Handle variable-operator matching
        if (this._isVariable(pattern)) {
            bindings.set(pattern.name, term);
            return true;
        } else if (this._isVariable(term)) {
            bindings.set(term.name, pattern);
            return true;
        }

        return false;
    }

    _bindVariableHigherOrder(pattern, term, bindings) {
        const variableName = pattern.name || pattern.toString();
        if (bindings.has(variableName)) {
            return this._termsEqualHigherOrder(bindings.get(variableName), term, bindings);
        }
        bindings.set(variableName, term);
        return true;
    }

    _termsEqualHigherOrder(t1, t2, bindings = null) {
        if (!t1 || !t2) return t1 === t2;

        if (bindings) {
            t1 = this.substitute(t1, bindings);
            t2 = this.substitute(t2, bindings);
        }

        if (typeof t1.equals === 'function') return t1.equals(t2);
        if (t1.name !== t2.name) return false;

        if (t1.isAtomic && t2.isAtomic) return t1.name === t2.name;

        if (t1.isCompound && t2.isCompound) {
            return t1.operator === t2.operator && 
                   t1.components.length === t2.components?.length && 
                   t1.components.every((comp, i) => this._termsEqualHigherOrder(comp, t2.components[i], bindings));
        }

        return false;
    }
}