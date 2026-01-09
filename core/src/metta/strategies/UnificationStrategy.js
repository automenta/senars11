/**
 * UnificationStrategy.js - Strategies for type unification and constraint solving
 */

import { TypeMismatchError } from '../helpers/MeTTaHelpers.js';
import { TypeConstructors } from '../helpers/TypeUtils.js';

/**
 * Abstract base strategy for unification
 */
export class UnificationStrategy {
    unify(t1, t2, subst) { throw new Error('unify() must be implemented'); }
    solve(constraints) { throw new Error('solve() must be implemented'); }
    apply(subst, type) { throw new Error('apply() must be implemented'); }
}

/**
 * Standard Hindley-Milner Unification (Algorithm W style)
 */
export class HindleyMilnerUnification extends UnificationStrategy {
    unify(t1, t2, subst = new Map()) {
        t1 = this.apply(subst, t1);
        t2 = this.apply(subst, t2);

        if (this.typeEquals(t1, t2)) return subst;

        if (t1.kind === 'TypeVar') return this.occursIn(t1.id, t2) ? null : subst.set(t1.id, t2);
        if (t2.kind === 'TypeVar') return this.occursIn(t2.id, t1) ? null : subst.set(t2.id, t1);

        if (t1.kind === 'Arrow' && t2.kind === 'Arrow') {
            const s1 = this.unify(t1.from, t2.from, subst);
            return s1 ? this.unify(t1.to, t2.to, s1) : null;
        }

        if ((t1.kind === 'List' && t2.kind === 'List') || (t1.kind === 'Maybe' && t2.kind === 'Maybe')) {
            return this.unify(t1.elemType, t2.elemType, subst);
        }

        if (t1.kind === 'Either' && t2.kind === 'Either') {
            const s1 = this.unify(t1.left, t2.left, subst);
            return s1 ? this.unify(t1.right, t2.right, s1) : null;
        }

        return null;
    }

    solve(constraints, typeToStringFn = null) {
        let subst = new Map();
        for (const { lhs, rhs } of constraints) {
            subst = this.unify(lhs, rhs, subst);
            if (!subst) {
                const lhsStr = typeToStringFn ? typeToStringFn(lhs) : JSON.stringify(lhs);
                const rhsStr = typeToStringFn ? typeToStringFn(rhs) : JSON.stringify(rhs);
                throw new TypeMismatchError(lhsStr, rhsStr, null);
            }
        }
        return subst;
    }

    apply(subst, type) {
        if (!type || type.kind !== 'TypeVar') {
            if (type?.kind === 'Arrow') return TypeConstructors.Arrow(this.apply(subst, type.from), this.apply(subst, type.to));
            if (type?.kind === 'List') return TypeConstructors.List(this.apply(subst, type.elemType));
            if (type?.kind === 'Maybe') return TypeConstructors.Maybe(this.apply(subst, type.elemType));
            if (type?.kind === 'Either') return TypeConstructors.Either(this.apply(subst, type.left), this.apply(subst, type.right));
            return type;
        }
        return subst.get(type.id) ?? type;
    }

    occursIn(varId, type) {
        if (!type) return false;
        if (type.kind === 'TypeVar') return type.id === varId;
        if (type.kind === 'Arrow') return this.occursIn(varId, type.from) || this.occursIn(varId, type.to);
        if (['List', 'Maybe'].includes(type.kind)) return this.occursIn(varId, type.elemType);
        if (type.kind === 'Either') return this.occursIn(varId, type.left) || this.occursIn(varId, type.right);
        return false;
    }

    typeEquals(t1, t2) {
        if (!t1 || !t2) return t1 === t2;
        if (t1.kind !== t2.kind) return false;
        if (t1.kind === 'TypeVar') return t1.id === t2.id;
        if (t1.kind === 'Arrow') return this.typeEquals(t1.from, t2.from) && this.typeEquals(t1.to, t2.to);
        if (['List', 'Maybe'].includes(t1.kind)) return this.typeEquals(t1.elemType, t2.elemType);
        if (t1.kind === 'Either') return this.typeEquals(t1.left, t2.left) && this.typeEquals(t1.right, t2.right);
        return true;
    }
}

/**
 * Simple unification (structural equality only, for stricter systems)
 */
export class SimpleUnification extends UnificationStrategy {
    unify(t1, t2, subst = new Map()) {
        // Only structural equality in this simple strategy
        return JSON.stringify(t1) === JSON.stringify(t2) ? subst : null;
    }

    solve(constraints) {
        // ...
        return new Map();
    }

    apply(subst, type) { return type; }
}
