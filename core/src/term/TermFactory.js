import {Term, TermType} from './Term.js';
import {CognitiveDiversity} from './CognitiveDiversity.js';
import {BaseComponent} from '../util/BaseComponent.js';
import {IntrospectionEvents} from '../util/IntrospectionEvents.js';

export {Term};

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*', '<->', '=']);
const ASSOCIATIVE_OPERATORS = new Set(['&', '|']);

const CANONICAL_NAME_PATTERNS = {
    '--': (n) => `(--, ${n[0]})`,
    '&': (n) => `(&, ${n.join(', ')})`,
    '|': (n) => `(|, ${n.join(', ')})`,
    '&/': (n) => `(&/, ${n.join(', ')})`,
    '-->': (n) => `(-->, ${n[0]}, ${n[1]})`,
    '<->': (n) => `(<->, ${n[0]}, ${n[1]})`,
    '==>': (n) => `(==>, ${n[0]}, ${n[1]})`,
    '<=>': (n) => `(<=>, ${n[0]}, ${n[1]})`,
    '=': (n) => `(=, ${n[0]}, ${n[1]})`,
    '^': (n) => `(^, ${n[0]}, ${n[1]})`,
    '{{--': (n) => `({{--, ${n[0]}, ${n[1]})`,
    '--}}': (n) => `(--}}, ${n[0]}, ${n[1]})`,
    '{}': (n) => `{${n.join(', ')}}`,
    '[]': (n) => `[${n.join(', ')}]`,
    ',': (n) => `(${n.join(', ')})`
};

export class TermFactory extends BaseComponent {
    constructor(config = {}, eventBus = null) {
        super(config, 'TermFactory', eventBus);
        this._cache = new Map();
        this._complexityCache = new Map();
        this._cognitiveDiversity = new CognitiveDiversity(this);
        this._cacheHits = 0;
        this._cacheMisses = 0;
        this._maxCacheSize = this.config.maxCacheSize || 5000;
        this._accessTime = new Map();
    }

    create(data, components = undefined) {
        if (typeof data === 'string' && Array.isArray(components)) {
            return this._createCompound(data, components);
        }

        if (!data) throw new Error('TermFactory.create: data is required');

        if (typeof data === 'string' || (data.name && !data.components && data.operator === undefined)) {
            return this._getOrCreateAtomic(typeof data === 'string' ? data : data.name);
        }

        // Handle object input {operator, components}
        const {operator, components: comps} = data;
        return this._createCompound(operator, comps);
    }

    _createCompound(operator, components) {
        const normalized = this._normalizeTermData(operator, components);
        return this._processCanonicalAndCache(normalized.operator, normalized.components);
    }

    _processCanonicalAndCache(operator, components) {
        const normalizedComponents = this._canonicalizeComponents(operator, components);
        const name = this._buildCanonicalName(operator, normalizedComponents);
        const currentTime = Date.now();

        // Check cache
        const cachedTerm = this._cache.get(name);
        if (cachedTerm) {
            this._cacheHits++;
            this._emitIntrospectionEvent(IntrospectionEvents.TERM_CACHE_HIT, {termName: name});
            this._accessTime.set(name, currentTime);
            return cachedTerm;
        }

        this._cacheMisses++;
        this._emitIntrospectionEvent(IntrospectionEvents.TERM_CACHE_MISS, {termName: name});

        const term = this._createAndCache(operator, normalizedComponents, name);
        this._accessTime.set(name, currentTime);
        this._evictLRUEntries();

        this._calculateComplexityMetrics(term, normalizedComponents);
        this._cognitiveDiversity.registerTerm(term);

        return term;
    }

    // Fluent interface
    atomic(name) { return this.create(name); }
    variable(name) { return this.create(name.startsWith('?') ? name : `?${name}`); }

    inheritance(sub, pred) { return this._createCompound('-->', [sub, pred]); }
    similarity(sub, pred) { return this._createCompound('<->', [sub, pred]); }
    implication(pre, post) { return this._createCompound('==>', [pre, post]); }
    equivalence(left, right) { return this._createCompound('<=>', [left, right]); }
    equality(left, right) { return this._createCompound('=', [left, right]); }

    conjunction(...terms) { return this._createCompound('&', this._flattenArgs(terms)); }
    disjunction(...terms) { return this._createCompound('|', this._flattenArgs(terms)); }
    parallel(...terms) { return this._createCompound('||', this._flattenArgs(terms)); }
    sequence(...terms) { return this._createCompound('&/', this._flattenArgs(terms)); }
    product(...terms) { return this._createCompound('*', this._flattenArgs(terms)); }
    setExt(...terms) { return this._createCompound('{}', this._flattenArgs(terms)); }
    setInt(...terms) { return this._createCompound('[]', this._flattenArgs(terms)); }
    tuple(...terms) { return this._createCompound(',', this._flattenArgs(terms)); }

    negation(term) { return this._createCompound('--', [term]); }
    extImage(relation, ...terms) { return this._createCompound('/', [relation, ...this._flattenArgs(terms)]); }
    intImage(relation, ...terms) { return this._createCompound('\\', [relation, ...this._flattenArgs(terms)]); }
    predicate(pred, args) { return this._createCompound('^', [pred, args]); }

    _flattenArgs(args) {
        return (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
    }

    _getOrCreateAtomic(name) {
        let term = this._cache.get(name);
        const currentTime = Date.now();

        if (term) {
            this._accessTime.set(name, currentTime);
            return term;
        }

        term = this._createAndCache(null, [], name);
        this._complexityCache.set(name, 1);
        this._accessTime.set(name, currentTime);
        this._evictLRUEntries();

        return term;
    }

    _createAndCache(operator, components, name) {
        // Double check to avoid race conditions or redundant creation
        const existing = this._cache.get(name);
        if (existing) return existing;

        const term = new Term(
            operator ? TermType.COMPOUND : TermType.ATOM,
            name,
            components,
            operator
        );
        this._cache.set(name, term);
        this._emitIntrospectionEvent(IntrospectionEvents.TERM_CREATED, {term: term.serialize()});
        return term;
    }

    _normalizeTermData(operator, components) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory._normalizeTermData: components must be an array');
        }

        let normalizedComponents = components.map(comp => {
            if (comp instanceof Term) return comp;
            return this.create(comp);
        });

        if (operator) {
            this._validateOperator(operator);

            if (ASSOCIATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._flatten(operator, normalizedComponents);
            }

            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents = operator === '='
                    ? normalizedComponents.sort((a, b) => this._compareTermsAlphabetically(a, b))
                    : this._normalizeCommutative(normalizedComponents);
            }
        }

        return {operator, components: normalizedComponents};
    }

    _validateOperator(op) {
        if (typeof op !== 'string') throw new Error('TermFactory._validateOperator: operator must be a string');
    }

    _flatten(op, comps) {
        return comps.flatMap(c => c?.operator === op ? c.components : [c]);
    }

    _normalizeCommutative(comps) {
        const sorted = comps.sort((a, b) => this._compareTermsAlphabetically(a, b));
        return this._removeRedundancy(sorted);
    }

    _compareTermsAlphabetically(termA, termB) {
        return termA.name.localeCompare(termB.name);
    }

    _getStructuralComplexity(term) {
        if (!term?.components?.length) return 1;
        return 1 + Math.max(...term.components.map(comp =>
            comp?.components?.length ? this._getStructuralComplexity(comp) : 1
        ));
    }

    _canonicalizeComponents(operator, components) {
        if (!operator) return components;

        if (['<->', '<=>', '='].includes(operator)) {
            return this._canonicalizeEquivalence(components);
        }
        if (operator === '-->') {
            return this._canonicalizeImplication(components);
        }

        // Commutative check
        if (COMMUTATIVE_OPERATORS.has(operator)) {
             return operator === '='
                ? [...components].sort((a, b) => this._compareTermsAlphabetically(a, b))
                : this._removeRedundancy(this._normalizeCommutative([...components]));
        }

        return [...components];
    }

    _canonicalizeEquivalence(components) {
        if (components.length < 2) return components;

        const validComponents = components.length > 2 ? components.slice(0, 2) : components;

        return validComponents.sort((a, b) => {
            const complexityA = this._getStructuralComplexity(a);
            const complexityB = this._getStructuralComplexity(b);
            return complexityA !== complexityB ? complexityB - complexityA : a.name.localeCompare(b.name);
        });
    }

    _canonicalizeImplication(components) {
        return components.length < 2 ? components : components.slice(0, 2);
    }

    _removeRedundancy(comps) {
        const seen = new Set();
        return comps.filter(c => {
            if (!c || typeof c.name !== 'string') {
                throw new Error('TermFactory._removeRedundancy: component must have a name property');
            }
            const uniqueId = this._getTermUniqueId(c);
            if (seen.has(uniqueId)) return false;
            seen.add(uniqueId);
            return true;
        });
    }

    _getTermUniqueId(term) {
        if (!term.operator) return term.name;

        // FIX: Only sort components if the operator is commutative!
        const isCommutative = COMMUTATIVE_OPERATORS.has(term.operator);

        let componentIds = term.components.map(c => this._getTermUniqueId(c));

        if (isCommutative) {
            componentIds.sort();
        }

        return `${term.operator}_${componentIds.join('|')}`;
    }

    _buildCanonicalName(op, comps) {
        if (!op) return comps[0].toString();
        const names = comps.map(c => c.name);
        return CANONICAL_NAME_PATTERNS[op]?.(names) || `(${op}, ${names.join(', ')})`;
    }

    _calculateComplexityMetrics(term, components) {
        if (!term) return 0;
        let complexity = 1;
        if (components?.length > 0) {
            complexity += components.length;
            complexity += components.reduce((sum, comp) => sum + (this.getComplexity(comp) || 0), 0);
        }
        this._complexityCache.set(term.name, complexity);
        return complexity;
    }

    _evictLRUEntries() {
        if (this._cache.size <= this._maxCacheSize) return;
        const entriesToRemove = this._cache.size - this._maxCacheSize;
        const sortedEntries = Array.from(this._accessTime.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, entriesToRemove);

        for (const [key] of sortedEntries) {
            this._cache.delete(key);
            this._accessTime.delete(key);
            this._complexityCache.delete(key);
            this._cognitiveDiversity.unregisterTerm(key);
        }
    }

    getComplexity(term) {
        const key = typeof term === 'string' ? term : (term?.name);
        return this._complexityCache.get(key) ?? 1;
    }

    getCacheSize() { return this._cache.size; }

    clearCache() {
        this._cache.clear();
        this._complexityCache.clear();
        this._accessTime.clear();
        this._cognitiveDiversity.clear();
    }

    getStats() {
        const totalRequests = this._cacheMisses + this._cacheHits;
        const cacheHitRate = totalRequests > 0 ? this._cacheHits / totalRequests : 0;
        return {
            cacheSize: this._cache.size,
            complexityCacheSize: this._complexityCache.size,
            cognitiveDiversityStats: this._cognitiveDiversity.getMetrics(),
            cacheHits: this._cacheHits,
            cacheMisses: this._cacheMisses,
            cacheHitRate: cacheHitRate,
            efficiency: cacheHitRate,
            maxCacheSize: this._maxCacheSize
        };
    }

    createWithDiversity(data, diversityFactor = 0.1) {
        const term = this.create(data);
        const complexity = this.getComplexity(term);
        const diversityMetrics = this._cognitiveDiversity.evaluateDiversity(term);
        const diversityScore = complexity * (1 + diversityFactor) * diversityMetrics.normalizationFactor;
        return {
            term,
            diversityScore,
            complexity,
            cognitiveDiversity: diversityMetrics
        };
    }

    getMostComplexTerms(limit = 10) {
        return Array.from(this._complexityCache.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, complexity]) => ({name, complexity}));
    }

    getSimplestTerms(limit = 10) {
        return Array.from(this._complexityCache.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, limit)
            .map(([name, complexity]) => ({name, complexity}));
    }

    getAverageComplexity() {
        if (this._complexityCache.size === 0) return 0;
        const totalComplexity = Array.from(this._complexityCache.values())
            .reduce((sum, complexity) => sum + complexity, 0);
        return totalComplexity / this._complexityCache.size;
    }

    getCognitiveDiversityMetrics() { return this._cognitiveDiversity.getMetrics(); }
    calculateCognitiveDiversity() { return this._cognitiveDiversity.calculateDiversity(); }

    createTrue() { return this._getOrCreateAtomic('True'); }
    createFalse() { return this._getOrCreateAtomic('False'); }
    createNull() { return this._getOrCreateAtomic('Null'); }

    isSystemAtom(term) {
        return term?.isAtomic && ['True', 'False', 'Null'].includes(term.name);
    }
}
