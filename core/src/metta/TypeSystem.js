/**
 * TypeSystem.js - Gradual dependent type system for MeTTa
 * Implements Hindley-Milner style type inference with dependent types
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { Term } from './kernel/Term.js';
import { Unify } from './kernel/Unify.js';

// Type constructors
export const TypeConstructors = {
    // Base types
    Number: { kind: 'Base', name: 'Number' },
    String: { kind: 'Base', name: 'String' },
    Bool: { kind: 'Base', name: 'Bool' },
    Atom: { kind: 'Base', name: 'Atom' },
    
    // Function type: Arrow(fromType, toType)
    Arrow: (from, to) => ({ kind: 'Arrow', from, to }),
    
    // List type: List(elementType)
    List: (element) => ({ kind: 'List', element }),
    
    // Maybe type: Maybe(type)
    Maybe: (type) => ({ kind: 'Maybe', type }),
    
    // Either type: Either(leftType, rightType)
    Either: (left, right) => ({ kind: 'Either', left, right }),
    
    // Vector type: Vector(length)
    Vector: (length) => ({ kind: 'Vector', length }),
    
    // Natural numbers less than n: Fin(n)
    Fin: (n) => ({ kind: 'Fin', n }),
    
    // Polymorphic type variable: TypeVar(index)
    TypeVar: (index) => ({ kind: 'TypeVar', index }),
    
    // Universal quantification: Forall(typeVar, type)
    Forall: (varName, type) => ({ kind: 'Forall', varName, type }),
    
    // Type constructor: TypeCtor(name, params)
    TypeCtor: (name, params = []) => ({ kind: 'TypeCtor', name, params })
};

export class TypeSystem {
    constructor() {
        this.typeRegistry = new Map();
        this.typeConstraints = [];
        this.substitution = new Map();
        this.typeVariables = new Map();
        this.nextTypeVarId = 0;
        
        // Register base types
        this.registerType('Number', TypeConstructors.Number);
        this.registerType('String', TypeConstructors.String);
        this.registerType('Bool', TypeConstructors.Bool);
        this.registerType('Atom', TypeConstructors.Atom);
    }

    /**
     * Register a custom type with validation function
     * @param {string} name - Type name
     * @param {Function} validator - Function that takes a term and returns boolean
     */
    registerType(name, validator) {
        this.typeRegistry.set(name, validator);
    }

    /**
     * Create a fresh type variable
     * @returns {Object} Fresh type variable
     */
    freshTypeVar() {
        const id = this.nextTypeVarId++;
        return TypeConstructors.TypeVar(id);
    }

    /**
     * Infer type of a term
     * @param {Object} term - Term to infer type for
     * @param {Object} context - Type context
     * @returns {Object} Inferred type
     */
    inferType(term, context = {}) {
        if (!term) return this.freshTypeVar();

        // Handle variables
        if (term.type === 'atom' && term.name && (term.name.startsWith('$') || term.name.startsWith('?'))) {
            // Look up variable type in context
            const varName = term.name.startsWith('$') ? term.name.substring(1) : term.name.substring(1);
            if (context[varName]) {
                return context[varName];
            }
            // If not in context, return fresh type variable
            return this.freshTypeVar();
        }

        // Handle atomic values
        if (term.type === 'atom') {
            if (term.name) {
                // Check if it's a number
                const num = parseFloat(term.name);
                if (!isNaN(num)) {
                    return TypeConstructors.Number;
                }
                
                // Check if it's a boolean
                if (['True', 'False', 'true', 'false'].includes(term.name)) {
                    return TypeConstructors.Bool;
                }
                
                // Check if it's a string (quoted)
                if (term.name.startsWith('"') && term.name.endsWith('"')) {
                    return TypeConstructors.String;
                }
                
                // Default to Atom type
                return TypeConstructors.Atom;
            }
        }

        // Handle expressions
        if (term.type === 'compound' && term.operator && term.components) {
            // Handle function application
            const operatorType = this.inferType(term.operator, context);
            const argTypes = term.components.map(arg => this.inferType(arg, context));

            // If operator type is a function type, return the result type
            if (operatorType.kind === 'Arrow') {
                // Check if argument types match function's expected input type
                if (argTypes.length === 1 && this.unifyTypes(argTypes[0], operatorType.from)) {
                    return operatorType.to;
                }
            }

            // For other expressions, return a fresh type variable
            return this.freshTypeVar();
        }

        // Default case
        return this.freshTypeVar();
    }

    /**
     * Check if a term has a specific type
     * @param {Object} term - Term to check
     * @param {Object} expectedType - Expected type
     * @param {Object} context - Type context
     * @returns {boolean} True if term has expected type
     */
    checkType(term, expectedType, context = {}) {
        const inferredType = this.inferType(term, context);
        return this.unifyTypes(inferredType, expectedType);
    }

    /**
     * Unify two types
     * @param {Object} type1 - First type
     * @param {Object} type2 - Second type
     * @returns {boolean} True if types can be unified
     */
    unifyTypes(type1, type2) {
        if (type1 === type2) return true;

        // Handle type variables
        if (type1.kind === 'TypeVar') {
            return this.bindTypeVar(type1, type2);
        }
        if (type2.kind === 'TypeVar') {
            return this.bindTypeVar(type2, type1);
        }

        // Handle base types
        if (type1.kind === 'Base' && type2.kind === 'Base') {
            return type1.name === type2.name;
        }

        // Handle function types
        if (type1.kind === 'Arrow' && type2.kind === 'Arrow') {
            return this.unifyTypes(type1.from, type2.from) && 
                   this.unifyTypes(type1.to, type2.to);
        }

        // Handle list types
        if (type1.kind === 'List' && type2.kind === 'List') {
            return this.unifyTypes(type1.element, type2.element);
        }

        // Handle other type constructors
        if (type1.kind === type2.kind) {
            if (type1.kind === 'TypeCtor') {
                if (type1.name !== type2.name) return false;
                if (type1.params.length !== type2.params.length) return false;
                
                for (let i = 0; i < type1.params.length; i++) {
                    if (!this.unifyTypes(type1.params[i], type2.params[i])) {
                        return false;
                    }
                }
                return true;
            }
        }

        return false;
    }

    /**
     * Bind a type variable to a type
     * @param {Object} varType - Type variable
     * @param {Object} type - Type to bind to
     * @returns {boolean} True if binding is successful
     */
    bindTypeVar(varType, type) {
        // Occurs check: prevent circular type definitions
        if (this.occursCheck(varType, type)) {
            return false;
        }

        // Add substitution
        this.substitution.set(varType.index, type);
        return true;
    }

    /**
     * Check if a type variable occurs in a type
     * @param {Object} varType - Type variable
     * @param {Object} type - Type to check in
     * @returns {boolean} True if variable occurs in type
     */
    occursCheck(varType, type) {
        if (type.kind === 'TypeVar' && type.index === varType.index) {
            return true;
        }

        if (type.kind === 'Arrow') {
            return this.occursCheck(varType, type.from) || 
                   this.occursCheck(varType, type.to);
        }

        if (type.kind === 'List') {
            return this.occursCheck(varType, type.element);
        }

        if (type.kind === 'TypeCtor') {
            for (const param of type.params) {
                if (this.occursCheck(varType, param)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Apply substitutions to a type
     * @param {Object} type - Type to apply substitutions to
     * @returns {Object} Type with substitutions applied
     */
    applySubstitution(type) {
        if (type.kind === 'TypeVar') {
            const subst = this.substitution.get(type.index);
            if (subst) {
                return this.applySubstitution(subst);
            }
            return type;
        }

        if (type.kind === 'Arrow') {
            return TypeConstructors.Arrow(
                this.applySubstitution(type.from),
                this.applySubstitution(type.to)
            );
        }

        if (type.kind === 'List') {
            return TypeConstructors.List(this.applySubstitution(type.element));
        }

        if (type.kind === 'TypeCtor') {
            const newParams = type.params.map(param => this.applySubstitution(param));
            return TypeConstructors.TypeCtor(type.name, newParams);
        }

        return type;
    }

    /**
     * Generate type constraints for a term
     * @param {Object} term - Term to generate constraints for
     * @param {Object} context - Type context
     * @returns {Array} Array of type constraints
     */
    generateConstraints(term, context = {}) {
        const constraints = [];

        if (term.type === 'compound' && term.operator && term.components) {
            // Function application constraint
            const funcType = this.inferType(term.operator, context);
            const resultType = this.freshTypeVar();

            for (const arg of term.components) {
                const argType = this.inferType(arg, context);
                constraints.push({
                    type1: funcType,
                    type2: TypeConstructors.Arrow(argType, resultType)
                });
            }

            // Add constraint that the overall expression has the result type
            constraints.push({
                type1: this.inferType(term, context),
                type2: resultType
            });
        }

        return constraints;
    }

    /**
     * Solve type constraints
     * @param {Array} constraints - Array of type constraints
     * @returns {boolean} True if constraints can be solved
     */
    solveConstraints(constraints) {
        for (const constraint of constraints) {
            if (!this.unifyTypes(constraint.type1, constraint.type2)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Perform type inference with constraint solving
     * @param {Object} term - Term to infer type for
     * @param {Object} context - Type context
     * @returns {Object} Inferred type
     */
    inferWithConstraints(term, context = {}) {
        const constraints = this.generateConstraints(term, context);
        if (!this.solveConstraints(constraints)) {
            throw new Error(`Type inference failed for term: ${term.toString()}`);
        }

        const inferredType = this.inferType(term, context);
        return this.applySubstitution(inferredType);
    }

    /**
     * Get string representation of a type
     * @param {Object} type - Type to convert to string
     * @returns {string} String representation of type
     */
    typeToString(type) {
        if (!type) return 'Unknown';

        switch (type.kind) {
            case 'Base':
                return type.name;
            case 'Arrow':
                return `(${this.typeToString(type.from)} -> ${this.typeToString(type.to)})`;
            case 'List':
                return `(List ${this.typeToString(type.element)})`;
            case 'Maybe':
                return `(Maybe ${this.typeToString(type.type)})`;
            case 'Either':
                return `(Either ${this.typeToString(type.left)} ${this.typeToString(type.right)})`;
            case 'Vector':
                return `(Vector ${type.length})`;
            case 'Fin':
                return `(Fin ${type.n})`;
            case 'TypeVar':
                return `t${type.index}`;
            case 'Forall':
                return `(∀ ${type.varName} ${this.typeToString(type.type)})`;
            case 'TypeCtor':
                const paramsStr = type.params.length > 0 
                    ? ` ${type.params.map(p => this.typeToString(p)).join(' ')}` 
                    : '';
                return `(${type.name}${paramsStr})`;
            default:
                return 'Unknown';
        }
    }

    /**
     * Define a custom type constructor
     * @param {string} name - Type constructor name
     * @param {Array} paramTypes - Parameter types
     * @param {Function} validator - Validation function
     */
    defineTypeConstructor(name, paramTypes, validator) {
        this.registerType(name, validator);
        return (params) => TypeConstructors.TypeCtor(name, params);
    }
}

export class TypeChecker {
    constructor(typeSystem) {
        this.typeSystem = typeSystem || new TypeSystem();
    }

    /**
     * Infer type of a term
     * @param {Object} term - Term to infer type for
     * @param {Object} context - Type context
     * @returns {Object} Inferred type
     */
    infer(term, context = {}) {
        return this.typeSystem.inferWithConstraints(term, context);
    }

    /**
     * Check if a term has a specific type
     * @param {Object} term - Term to check
     * @param {Object} expectedType - Expected type
     * @param {Object} context - Type context
     * @returns {boolean} True if term has expected type
     */
    check(term, expectedType, context = {}) {
        return this.typeSystem.checkType(term, expectedType, context);
    }

    /**
     * Unify two types
     * @param {Object} type1 - First type
     * @param {Object} type2 - Second type
     * @returns {Object} Substitution if unification succeeds, null otherwise
     */
    unify(type1, type2) {
        // Create a copy of the type system to avoid side effects
        const tempSystem = new TypeSystem();
        tempSystem.substitution = new Map(this.typeSystem.substitution);
        tempSystem.nextTypeVarId = this.typeSystem.nextTypeVarId;
        
        if (tempSystem.unifyTypes(type1, type2)) {
            return tempSystem.substitution;
        }
        return null;
    }

    /**
     * Get string representation of a type
     * @param {Object} type - Type to convert to string
     * @returns {string} String representation of type
     */
    typeToString(type) {
        return this.typeSystem.typeToString(type);
    }
}