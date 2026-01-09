/**
 * TypeChecker.js - Constraint-based type inference
 * Implements Hindley-Milner style type inference with dependent types
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TypeMismatchError } from './helpers/MeTTaHelpers.js';

/**
 * Type variable counter for generating fresh type variables
 */
let typeVarCounter = 0;

/**
 * Create a fresh type variable
 * @returns {Object} Type variable
 */
function freshTypeVar() {
    return { kind: 'TypeVar', id: typeVarCounter++ };
}

/**
 * Type constructors
 */
const TypeConstructors = {
    Arrow: (from, to) => ({ kind: 'Arrow', from, to }),
    List: (elemType) => ({ kind: 'List', elemType }),
    Maybe: (elemType) => ({ kind: 'Maybe', elemType }),
    Either: (left, right) => ({ kind: 'Either', left, right }),
    Vector: (length) => ({ kind: 'Vector', length }),
    Forall: (varName, type) => ({ kind: 'Forall', var: varName, type }),
    Number: { kind: 'Number' },
    String: { kind: 'String' },
    Bool: { kind: 'Bool' },
    Atom: { kind: 'Atom' }
};

/**
 * TypeChecker - Constraint-based type inference
 * Supports Hindley-Milner type inference with extensions
 */
export class TypeChecker extends BaseMeTTaComponent {
    constructor(typeSystem, config = {}, eventBus = null, termFactory = null) {
        super(config, 'TypeChecker', eventBus, termFactory);
        this.typeSystem = typeSystem;
        this.constraints = [];
        this.typeEnv = new Map(); // variable name -> type
    }

    /**
     * Infer type of term
     * @param {Term} term - Term to infer type for
     * @param {Map} context - Type environment
     * @returns {Object} Type
     */
    infer(term, context = new Map()) {
        return this.trackOperation('infer', () => {
            this.constraints = [];
            const { type, constraints } = this.generate(term, context);
            const substitution = this.solve(constraints);
            return this.apply(substitution, type);
        });
    }

    /**
     * Check term has expected type
     * @param {Term} term - Term to check
     * @param {Object} expectedType - Expected type
     * @param {Map} context - Type environment
     * @returns {boolean} True if types match
     */
    check(term, expectedType, context = new Map()) {
        return this.trackOperation('check', () => {
            const inferredType = this.infer(term, context);
            return this.typeEquals(inferredType, expectedType);
        });
    }

    /**
     * Generate type and constraints for term
     * @param {Term} term - Term
     * @param {Map} context - Type environment
     * @returns {Object} {type, constraints}
     */
    generate(term, context) {
        // Variable
        if (term.name?.startsWith('$')) {
            const varType = context.get(term.name) ?? freshTypeVar();
            return { type: varType, constraints: [] };
        }

        // Atomic term
        if (!term.operator) {
            // Infer base type
            if (!isNaN(Number(term.name))) {
                return { type: TypeConstructors.Number, constraints: [] };
            }
            if (term.name?.startsWith('"')) {
                return { type: TypeConstructors.String, constraints: [] };
            }
            if (term.name === 'True' || term.name === 'False') {
                return { type: TypeConstructors.Bool, constraints: [] };
            }

            // Look up in context
            const varType = context.get(term.name) ?? TypeConstructors.Atom;
            return { type: varType, constraints: [] };
        }

        // Function application: (^ f args)
        if (term.operator === '^') {
            const func = term.components[0];
            const args = term.components[1]; // Product term

            const { type: fType, constraints: fC } = this.generate(func, context);
            const { type: argType, constraints: argC } = this.generate(args, context);

            const resultType = freshTypeVar();

            return {
                type: resultType,
                constraints: [
                    ...fC,
                    ...argC,
                    { lhs: fType, rhs: TypeConstructors.Arrow(argType, resultType) }
                ]
            };
        }

        // Product: (*, x, y, ...)
        if (term.operator === '*') {
            // Tuple type - for now just infer first component
            if (term.components.length > 0) {
                const { type, constraints } = this.generate(term.components[0], context);
                return { type, constraints };
            }
            return { type: TypeConstructors.Atom, constraints: [] };
        }

        // Equality: (= A B)
        if (term.operator === '=') {
            const { type: t1, constraints: c1 } = this.generate(term.components[0], context);
            const { type: t2, constraints: c2 } = this.generate(term.components[1], context);

            return {
                type: TypeConstructors.Bool,
                constraints: [...c1, ...c2, { lhs: t1, rhs: t2 }]
            };
        }

        // Default: infer as Atom
        return { type: TypeConstructors.Atom, constraints: [] };
    }

    /**
     * Unify two types
     * @param {Object} t1 - First type
     * @param {Object} t2 - Second type
     * @param {Map} subst - Current substitution
     * @returns {Map|null} Updated substitution or null if unification fails
     */
    unify(t1, t2, subst = new Map()) {
        t1 = this.apply(subst, t1);
        t2 = this.apply(subst, t2);

        if (this.typeEquals(t1, t2)) return subst;

        if (t1.kind === 'TypeVar') {
            return this.occursIn(t1.id, t2) ? null : subst.set(t1.id, t2);
        }
        if (t2.kind === 'TypeVar') {
            return this.occursIn(t2.id, t1) ? null : subst.set(t2.id, t1);
        }

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

    /**
     * Solve constraints
     * @param {Array} constraints - List of type constraints
     * @returns {Map} Substitution
     */
    solve(constraints) {
        let subst = new Map();

        for (const constraint of constraints) {
            subst = this.unify(constraint.lhs, constraint.rhs, subst);
            if (!subst) {
                throw new TypeMismatchError(
                    this.typeToString(constraint.lhs),
                    this.typeToString(constraint.rhs),
                    null
                );
            }
        }

        return subst;
    }

    /**
     * Apply substitution to type
     * @param {Map} subst - Substitution
     * @param {Object} type - Type
     * @returns {Object} Substituted type
     */
    apply(subst, type) {
        if (!type) return type;

        if (type.kind === 'TypeVar') {
            return subst.get(type.id) ?? type;
        }

        if (type.kind === 'Arrow') {
            return TypeConstructors.Arrow(
                this.apply(subst, type.from),
                this.apply(subst, type.to)
            );
        }

        if (type.kind === 'List') {
            return TypeConstructors.List(this.apply(subst, type.elemType));
        }

        if (type.kind === 'Maybe') {
            return TypeConstructors.Maybe(this.apply(subst, type.elemType));
        }

        if (type.kind === 'Either') {
            return TypeConstructors.Either(
                this.apply(subst, type.left),
                this.apply(subst, type.right)
            );
        }

        return type;
    }

    /**
     * Check if type variable occurs in type (occurs check)
     * @param {number} varId - Type variable ID
     * @param {Object} type - Type
     * @returns {boolean}
     */
    occursIn(varId, type) {
        if (!type) return false;
        if (type.kind === 'TypeVar') return type.id === varId;
        if (type.kind === 'Arrow') return this.occursIn(varId, type.from) || this.occursIn(varId, type.to);
        if (['List', 'Maybe'].includes(type.kind)) return this.occursIn(varId, type.elemType);
        if (type.kind === 'Either') return this.occursIn(varId, type.left) || this.occursIn(varId, type.right);
        return false;
    }

    /**
     * Check type equality
     * @param {Object} t1 - First type
     * @param {Object} t2 - Second type
     * @returns {boolean}
     */
    typeEquals(t1, t2) {
        if (!t1 || !t2) return t1 === t2;

        if (t1.kind !== t2.kind) return false;

        if (t1.kind === 'TypeVar') {
            return t1.id === t2.id;
        }

        if (t1.kind === 'Arrow') {
            return this.typeEquals(t1.from, t2.from) && this.typeEquals(t1.to, t2.to);
        }

        if (t1.kind === 'List' || t1.kind === 'Maybe') {
            return this.typeEquals(t1.elemType, t2.elemType);
        }

        if (t1.kind === 'Either') {
            return this.typeEquals(t1.left, t2.left) && this.typeEquals(t1.right, t2.right);
        }

        return true; // Base types
    }

    /**
     * Convert type to string
     * @param {Object} type - Type
     * @returns {string}
     */
    typeToString(type) {
        if (!type) return 'Unknown';

        if (type.kind === 'TypeVar') {
            return `t${type.id}`;
        }

        if (type.kind === 'Arrow') {
            return `(-> ${this.typeToString(type.from)} ${this.typeToString(type.to)})`;
        }

        if (type.kind === 'List') {
            return `(List ${this.typeToString(type.elemType)})`;
        }

        if (type.kind === 'Maybe') {
            return `(Maybe ${this.typeToString(type.elemType)})`;
        }

        if (type.kind === 'Either') {
            return `(Either ${this.typeToString(type.left)} ${this.typeToString(type.right)})`;
        }

        if (type.kind === 'Vector') {
            return `(Vector ${type.length})`;
        }

        if (type.kind === 'Forall') {
            return `(∀ ${type.var} ${this.typeToString(type.type)})`;
        }

        return type.kind || 'Unknown';
    }
}

// Export type constructors
export { TypeConstructors, freshTypeVar };
