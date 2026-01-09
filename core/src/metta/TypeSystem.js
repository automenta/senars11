/**
 * TypeSystem.js - MeTTa gradual dependent type checking
 * Optional runtime and static type checking system
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TypeMismatchError } from './helpers/MeTTaHelpers.js';

/**
 * TypeSystem - Gradual dependent type checking for MeTTa
 * Supports optional typing with runtime checks
 */
export class TypeSystem extends BaseMeTTaComponent {
    // Type hierarchy for subtype checking
    static TYPE_HIERARCHY = {
        'Number': 'Symbol',
        'String': 'Symbol',
        'Symbol': 'Atom',
        'Variable': 'Atom',
        'Grounded': 'Atom',
        'Expression': 'Atom',
        'List': 'Expression',
        'Set': 'Expression'
    };

    // Type precedence order for inference
    static TYPE_ORDER = ['Number', 'String', 'Variable', 'Grounded', 'Symbol', 'Expression', 'List', 'Set'];

    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'TypeSystem', eventBus, termFactory);
        this.typeRules = new Map();
        this.typeCache = new Map();
        this._registerBuiltinTypes();
    }

    _registerBuiltinTypes() {
        // Define all base types at once
        const baseTypes = {
            'Atom': () => true,
            'Symbol': (t) => t.isAtomic && !t.name.startsWith('$') && !t.name.startsWith('&'),
            'Variable': (t) => t.name?.startsWith('$') || t.name?.startsWith('?'),
            'Grounded': (t) => t.name?.startsWith('&'),
            'Expression': (t) => !!(t.operator && t.components),
            'Number': (t) => t.isAtomic && !isNaN(Number(t.name)),
            'String': (t) => t.isAtomic && t.name?.startsWith('"'),
            'List': (t) => t.operator === '*',
            'Set': (t) => t.operator === '{}' || t.operator === '[]',
            'Type': () => true
        };

        Object.entries(baseTypes).forEach(([name, predicate]) => {
            this.typeRules.set(name, predicate);
        });
    }

    /**
     * Define a type with a predicate function
     * @param {string} name - Type name
     * @param {Function} predicate - (term) => boolean
     */
    defineType(name, predicate) {
        this.typeRules.set(name, predicate);
        this.emitMeTTaEvent('type-defined', { typeName: name });
    }

    /**
     * Check if term has a specific type
     * @param {Term} term - Term to check
     * @param {string} typeName - Type name
     * @returns {boolean}
     */
    hasType(term, typeName) {
        const cacheKey = `${term.name}-${typeName}`;

        // Cache hit
        if (this.typeCache.has(cacheKey)) {
            return this.typeCache.get(cacheKey);
        }

        const predicate = this.typeRules.get(typeName);
        const result = predicate ? predicate(term) : false;

        this.typeCache.set(cacheKey, result);
        return result;
    }

    /**
     * Infer the type of a term
     * @param {Term} term - Term to infer type for
     * @returns {string} - Type name
     */
    inferType(term) {
        return this.trackOperation('inferType', () => {
            // Check if we have a direct cache for this term's primary type
            if (this.typeCache.has(term.name)) {
                return this.typeCache.get(term.name);
            }

            const inferredType = TypeSystem.TYPE_ORDER.find(typeName => this.hasType(term, typeName)) ?? 'Atom';
            this.typeCache.set(term.name, inferredType);
            return inferredType;
        });
    }

    /**
     * Check type annotation: (: term Type)
     * @param {Term} term - Term to check
     * @param {string} expectedType - Expected type name
     * @throws {TypeMismatchError} if types don't match
     * @returns {boolean} - true if types match
     */
    checkTypeAnnotation(term, expectedType) {
        return this.trackOperation('checkTypeAnnotation', () => {
            const actualType = this.inferType(term);

            if (actualType !== expectedType && !this._isSubtype(actualType, expectedType)) {
                this.emitMeTTaEvent('type-mismatch', {
                    term: term.toString(),
                    expected: expectedType,
                    actual: actualType
                });
                throw new TypeMismatchError(expectedType, actualType, term);
            }

            return true;
        });
    }

    /**
     * Check if one type is a subtype of another
     * @param {string} subType - Subtype name
     * @param {string} superType - Supertype name
     * @returns {boolean}
     */
    _isSubtype(subType, superType) {
        let current = subType;
        while (current) {
            if (current === superType) return true;
            current = TypeSystem.TYPE_HIERARCHY[current];
        }
        return false;
    }

    /**
     * Clear type cache
     */
    clearCache() {
        this.typeCache.clear();
    }

    /**
     * Get type statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            typeRules: this.typeRules.size,
            cacheSize: this.typeCache.size
        };
    }
}
