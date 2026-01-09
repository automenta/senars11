import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TypeMismatchError } from './helpers/MeTTaHelpers.js';

export class TypeSystem extends BaseMeTTaComponent {
    static TYPE_HIERARCHY = {
        'Number': 'Symbol', 'String': 'Symbol', 'Symbol': 'Atom',
        'Variable': 'Atom', 'Grounded': 'Atom', 'Expression': 'Atom',
        'List': 'Expression', 'Set': 'Expression'
    };

    static TYPE_ORDER = ['Number', 'String', 'Variable', 'Grounded', 'Symbol', 'Expression', 'List', 'Set'];

    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'TypeSystem', eventBus, termFactory);
        this.typeRules = new Map();
        this.typeCache = new Map();
        this._registerBuiltinTypes();
    }

    _registerBuiltinTypes() {
        const baseTypes = {
            'Atom': () => true,
            'Symbol': t => t.isAtomic && !t.name.startsWith('$') && !t.name.startsWith('&'),
            'Variable': t => t.name?.startsWith('$') || t.name?.startsWith('?'),
            'Grounded': t => t.name?.startsWith('&'),
            'Expression': t => !!(t.operator && t.components),
            'Number': t => t.isAtomic && !isNaN(Number(t.name)),
            'String': t => t.isAtomic && t.name?.startsWith('"'),
            'List': t => t.operator === '*',
            'Set': t => t.operator === '{}' || t.operator === '[]',
            'Type': () => true
        };
        Object.entries(baseTypes).forEach(([k, v]) => this.typeRules.set(k, v));
    }

    defineType(name, predicate) {
        this.typeRules.set(name, predicate);
        this.emitMeTTaEvent('type-defined', { typeName: name });
    }

    hasType(term, typeName) {
        const key = `${term.name}-${typeName}`;
        if (this.typeCache.has(key)) return this.typeCache.get(key);

        const predicate = this.typeRules.get(typeName);
        const result = predicate ? predicate(term) : false;
        this.typeCache.set(key, result);
        return result;
    }

    inferType(term) {
        return this.trackOperation('inferType', () => {
            if (this.typeCache.has(term.name)) return this.typeCache.get(term.name);
            const inferred = TypeSystem.TYPE_ORDER.find(t => this.hasType(term, t)) ?? 'Atom';
            this.typeCache.set(term.name, inferred);
            return inferred;
        });
    }

    checkTypeAnnotation(term, expectedType) {
        return this.trackOperation('checkTypeAnnotation', () => {
            const actual = this.inferType(term);
            if (actual !== expectedType && !this._isSubtype(actual, expectedType)) {
                this.emitMeTTaEvent('type-mismatch', { term: term.toString(), expected: expectedType, actual });
                throw new TypeMismatchError(expectedType, actual, term);
            }
            return true;
        });
    }

    _isSubtype(sub, superType) {
        let curr = sub;
        while (curr) {
            if (curr === superType) return true;
            curr = TypeSystem.TYPE_HIERARCHY[curr];
        }
        return false;
    }

    clearCache() { this.typeCache.clear(); }
    getStats() { return { ...super.getStats(), typeRules: this.typeRules.size, cacheSize: this.typeCache.size }; }
}

