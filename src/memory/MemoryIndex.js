import { IndexUtils } from './IndexUtils.js';
import { IndexConfiguration } from './IndexConfiguration.js';
import { TermCategorization } from './TermCategorization.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { ValidationUtils } from './ValidationUtils.js';

export class MemoryIndex {
    constructor() {
        this._indexes = IndexConfiguration.getDefaultIndexes();
        this._config = IndexConfiguration.getDefaultConfig();
        this._totalConcepts = 0;
        
        this._performanceMonitor = new PerformanceMonitor();
        this._validationUtils = new ValidationUtils();
    }

    addConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        this._totalConcepts++;
        IndexUtils.addToIndex(this._indexes, 'term', termId, concept);

        // Add to type-specific indexes
        if (term.isAtomic) {
            IndexUtils.addToIndex(this._indexes, 'atomic', term.name, concept);
        } else {
            this._indexCompoundTerm(term, concept);
            IndexUtils.addToIndex(this._indexes, 'compoundByOp', term.operator, concept);
        }

        // Add to complexity-based index
        this._indexByComplexity(term, concept);

        // Add to category-based index
        this._indexByCategory(term, concept);

        // Add to activation-based index
        this._indexByActivation(concept);

        // Add to temporal index
        this._indexByTemporal(concept);
    }

    removeConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        if (this._indexes.term.has(termId)) {
            this._removeFromIndex('term', termId, concept);
            this._totalConcepts--;
        }

        // Remove from type-specific indexes
        if (term.isAtomic) {
            this._removeFromIndex('atomic', term.name, concept);
        } else {
            this._removeCompoundTermIndex(term, concept);
            this._removeFromIndex('compoundByOp', term.operator, concept);
        }

        // Remove from all other indexes based on the concept/term
        this._removeFromComplexityIndex(term, concept);
        this._removeFromCategoryIndex(term, concept);
        this._removeFromActivationIndex(concept);
        this._removeFromTemporalIndex(concept);
    }

    _indexCompoundTerm(term, concept) {
        IndexUtils.addToIndex(this._indexes, 'compound', term.operator, term);

        // Index by all components (for faster subterm matching)
        if (term.components) {
            for (const comp of term.components) {
                IndexUtils.addToIndex(this._indexes, 'component', comp, concept);

                // Also index nested components
                if (comp.isCompound) {
                    this._indexCompoundTerm(comp, concept);
                }
            }
        }

        switch (term.operator) {
            case '-->':
                this._indexInheritance(term, concept);
                break;
            case '==>':
                this._indexImplication(term, concept);
                break;
            case '<->':
                this._indexSimilarity(term, concept);
                break;
        }
    }

    _indexByComplexity(term, concept) {
        const complexity = TermCategorization.getTermComplexity(term);
        const complexityLevel = TermCategorization.getComplexityLevel(complexity, this._config);

        IndexUtils.addToIndex(this._indexes, 'complexity', complexityLevel, concept);
    }

    _removeFromComplexityIndex(term, concept) {
        const complexity = TermCategorization.getTermComplexity(term);
        const complexityLevel = TermCategorization.getComplexityLevel(complexity, this._config);

        this._removeFromIndex('complexity', complexityLevel, concept);
    }

    _indexByCategory(term, concept) {
        const category = TermCategorization.getTermCategory(term);
        IndexUtils.addToIndex(this._indexes, 'category', category, concept);
    }

    _removeFromCategoryIndex(term, concept) {
        const category = TermCategorization.getTermCategory(term);
        this._removeFromIndex('category', category, concept);
    }

    _indexByActivation(concept) {
        const activationBucket = TermCategorization.getActivationBucket(concept.activation, this._config);
        IndexUtils.addToIndex(this._indexes, 'activation', activationBucket, concept);
    }

    _removeFromActivationIndex(concept) {
        const activationBucket = TermCategorization.getActivationBucket(concept.activation, this._config);
        this._removeFromIndex('activation', activationBucket, concept);
    }

    _indexByTemporal(concept) {
        // For now, we'll just index by creation time (concept should have a timestamp)
        const timestamp = concept.createdAt || Date.now();
        const temporalBucket = TermCategorization.getTemporalBucket(timestamp, this._config);
        IndexUtils.addToIndex(this._indexes, 'temporal', temporalBucket, concept);
    }

    _removeFromTemporalIndex(concept) {
        const timestamp = concept.createdAt || Date.now();
        const temporalBucket = TermCategorization.getTemporalBucket(timestamp, this._config);
        this._removeFromIndex('temporal', temporalBucket, concept);
    }

    updateConcept(concept, updates) {
        // Remove from current indexes
        this.removeConcept(concept);

        // Apply updates
        Object.assign(concept, updates);

        // Re-add to indexes with updated properties
        this.addConcept(concept);
    }

    addConcepts(concepts) {
        for (const concept of concepts) {
            this.addConcept(concept);
        }
    }

    /**
     * Find concepts with advanced filtering options
     */
    findConceptsWithFilters(filters = {}) {
        let results = this.getAllConcepts();

        // Filter by category
        if (filters.category) {
            results = results.filter(concept =>
                TermCategorization.getTermCategory(concept.term) === filters.category);
        }

        // Filter by complexity range
        if (filters.minComplexity || filters.maxComplexity) {
            results = results.filter(concept => {
                const complexity = TermCategorization.getTermComplexity(concept.term);
                return (!filters.minComplexity || complexity >= filters.minComplexity) &&
                    (!filters.maxComplexity || complexity <= filters.maxComplexity);
            });
        }

        // Filter by activation range
        if (filters.minActivation !== undefined || filters.maxActivation !== undefined) {
            results = results.filter(concept => {
                const activation = concept.activation || 0;
                return (filters.minActivation === undefined || activation >= filters.minActivation) &&
                    (filters.maxActivation === undefined || activation <= filters.maxActivation);
            });
        }

        // Filter by operator
        if (filters.operator) {
            results = results.filter(concept =>
                concept.term.operator === filters.operator);
        }

        // Filter by creation time range
        if (filters.createdAfter || filters.createdBefore) {
            results = results.filter(concept => {
                const createdAt = concept.createdAt || 0;
                return (!filters.createdAfter || createdAt >= filters.createdAfter) &&
                    (!filters.createdBefore || createdAt <= filters.createdBefore);
            });
        }

        return results;
    }

    /**
     * Get concepts ordered by relevance score for a given query term
     */
    findConceptsByRelevance(queryTerm, limit = 10) {
        const allConcepts = this.getAllConcepts();
        const scoredConcepts = allConcepts.map(concept => {
            const score = this._calculateRelevanceScore(queryTerm, concept.term);
            return {concept, score};
        });

        // Sort by score descending and limit results
        return scoredConcepts
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.concept);
    }

    /**
     * Calculate relevance score between query term and concept term
     */
    _calculateRelevanceScore(queryTerm, conceptTerm) {
        // Exact match gets highest score
        if (queryTerm.toString() === conceptTerm.toString()) {
            return 1.0;
        }

        let score = 0;

        // Operator match
        if (queryTerm.operator && conceptTerm.operator === queryTerm.operator) {
            score += 0.3;
        }

        // Component overlap
        if (queryTerm.components && conceptTerm.components) {
            const queryComponents = new Set(queryTerm.components.map(c => c.toString()));
            const conceptComponents = new Set(conceptTerm.components.map(c => c.toString()));

            const intersection = [...queryComponents].filter(x => conceptComponents.has(x)).length;
            const union = new Set([...queryComponents, ...conceptComponents]).size;

            if (union > 0) {
                score += 0.5 * (intersection / union);
            }
        }

        // Atomic term name similarity
        if (queryTerm.name && conceptTerm.name) {
            // Simple string similarity (could be enhanced with more sophisticated algorithms)
            const queryName = queryTerm.name.toLowerCase();
            const conceptName = conceptTerm.name.toLowerCase();

            if (queryName === conceptName) {
                score += 0.4;
            } else if (queryName.includes(conceptName) || conceptName.includes(queryName)) {
                score += 0.2;
            }
        }

        return Math.min(1.0, score); // Cap at 1.0
    }

    /**
     * Find related concepts using multiple relationship types
     */
    findRelatedConceptsExtended(term, options = {}) {
        const {
            relationshipTypes = ['inheritance', 'implication', 'similarity'],
            maxDepth = 3,
            includeIndirect = true
        } = options;

        const relatedConcepts = new Set();
        const visitedTerms = new Set();

        const traverseRelationships = (currentTerm, depth) => {
            if (depth > maxDepth || visitedTerms.has(currentTerm.toString())) {
                return;
            }

            visitedTerms.add(currentTerm.toString());

            // Direct relationships
            if (relationshipTypes.includes('inheritance')) {
                this._findInheritanceRelated(currentTerm, relatedConcepts);
            }

            if (relationshipTypes.includes('implication')) {
                this._findImplicationRelated(currentTerm, relatedConcepts);
            }

            if (relationshipTypes.includes('similarity')) {
                this._findSimilarityRelated(currentTerm, relatedConcepts);
            }

            // Indirect relationships (traverse deeper)
            if (includeIndirect && depth < maxDepth) {
                for (const concept of relatedConcepts) {
                    if (concept.term) {
                        traverseRelationships(concept.term, depth + 1);
                    }
                }
            }
        };

        traverseRelationships(term, 0);

        return Array.from(relatedConcepts);
    }

    _findInheritanceRelated(term, relatedConcepts) {
        // Find concepts where this term is a subject or predicate in inheritance
        const subjectConcepts = this.findInheritanceConcepts(term);
        const predicateConcepts = []; // Would need inverse index for this

        [...subjectConcepts, ...predicateConcepts].forEach(concept =>
            relatedConcepts.add(concept));
    }

    _findImplicationRelated(term, relatedConcepts) {
        // Find concepts where this term is a premise or conclusion in implication
        const premiseConcepts = this.findImplicationConcepts(term);
        const conclusionConcepts = []; // Would need inverse index for this

        [...premiseConcepts, ...conclusionConcepts].forEach(concept =>
            relatedConcepts.add(concept));
    }

    _findSimilarityRelated(term, relatedConcepts) {
        // Find concepts where this term is part of a similarity relation
        const similarConcepts = this.findSimilarityConcepts(term);
        similarConcepts.forEach(concept => relatedConcepts.add(concept));
    }

    /**
     * Search for related concepts using multiple indexing strategies
     */
    findRelatedConcepts(term, searchOptions = {}) {
        const {
            maxResults = 10,
            includeCategories = [],
            excludeCategories = [],
            minActivation = 0,
            useSemanticSimilarity = true,
            searchDepth = 2
        } = searchOptions;

        const results = new Map(); // Use Map to store concept and relevance score

        // Find by components (subterm matching) - this is the most precise
        if (term.components) {
            for (const comp of term.components) {
                const byComponent = this.findConceptsByComponent(comp);
                for (const concept of byComponent) {
                    // Filter by category if specified
                    const category = TermCategorization.getTermCategory(concept.term);
                    if (excludeCategories.includes(category)) continue;
                    if (includeCategories.length > 0 && !includeCategories.includes(category)) continue;
                    if (concept.activation < minActivation) continue;

                    // Calculate relevance based on component match
                    const relevance = this._calculateRelevance(term, concept.term, 'component');
                    results.set(concept, {relevance, method: 'component'});
                }
            }
        }

        // Find by category
        const category = TermCategorization.getTermCategory(term);
        if (!excludeCategories.includes(category) &&
            (includeCategories.length === 0 || includeCategories.includes(category))) {
            const byCategory = this.findConceptsByCategory(category);
            for (const concept of byCategory) {
                if (results.has(concept)) continue; // Skip if already found via components
                if (concept.activation < minActivation) continue;

                const relevance = this._calculateRelevance(term, concept.term, 'category');
                results.set(concept, {relevance, method: 'category'});
            }
        }

        // Semantic similarity search (if enabled)
        if (useSemanticSimilarity) {
            const semanticResults = this._findSemanticallySimilarConcepts(term, searchDepth);
            for (const [concept, relevance] of semanticResults.entries()) {
                if (results.has(concept)) continue; // Skip if already found
                if (concept.activation < minActivation) continue;

                results.set(concept, {relevance, method: 'semantic'});
            }
        }

        // Convert to array, sort by relevance, and return top results
        const sortedResults = Array.from(results.entries())
            .sort((a, b) => b[1].relevance - a[1].relevance)
            .slice(0, maxResults)
            .map(entry => entry[0]); // Return just the concepts, not the relevance scores

        return sortedResults;
    }

    /**
     * Find semantically similar concepts based on structural similarity
     */
    _findSemanticallySimilarConcepts(term, depth = 2) {
        const results = new Map();

        // Calculate similarity with all concepts of the same category
        const category = TermCategorization.getTermCategory(term);
        const sameCategoryConcepts = this.findConceptsByCategory(category);

        for (const concept of sameCategoryConcepts) {
            if (concept.term === term) continue; // Skip self

            const similarityScore = this._calculateStructuralSimilarity(term, concept.term);
            if (similarityScore > 0.1) { // Only include if somewhat similar
                results.set(concept, similarityScore);
            }
        }

        return results;
    }

    /**
     * Calculate relevance score between two terms based on the search method
     */
    _calculateRelevance(term1, term2, method) {
        switch (method) {
            case 'component':
                // Higher relevance for more component overlap
                return this._calculateStructuralSimilarity(term1, term2);
            case 'category':
                // Medium relevance for category match
                return 0.5;
            case 'semantic':
                // Use structural similarity for semantic relevance
                return this._calculateStructuralSimilarity(term1, term2);
            default:
                return 0.1; // Low default relevance
        }
    }

    /**
     * Calculate structural similarity between two terms
     */
    _calculateStructuralSimilarity(term1, term2) {
        // For atomic terms with same name, return maximum similarity
        if (!term1?.operator && !term2?.operator && term1?.name === term2?.name) {
            return 1.0;
        }

        // For compound terms, calculate similarity based on shared components
        if (term1?.components && term2?.components) {
            const components1 = new Set(term1.components.map(c => c.name));
            const components2 = new Set(term2.components.map(c => c.name));

            // Calculate Jaccard similarity coefficient
            const intersection = [...components1].filter(x => components2.has(x)).length;
            const union = new Set([...components1, ...components2]).size;

            return union > 0 ? intersection / union : 0;
        }

        // For terms with different structures, return low similarity
        return 0.1;
    }

    getConcept(termHash) {
        const concepts = Array.from(this._indexes.term.get(termHash) || []);
        return concepts.length > 0 ? concepts[concepts.length - 1] : undefined;
    }

    getAllConcepts = () => Array.from(this._indexes.term.values()).flat();

    getStats() {
        const indexSizes = {
            inheritance: this._indexes.inheritance.size,
            implication: this._indexes.implication.size,
            similarity: this._indexes.similarity.size,
            compound: this._indexes.compound.size,
            atomic: this._indexes.atomic.size,
            compoundByOp: this._indexes.compoundByOp.size,
            component: this._indexes.component.size,
            complexity: this._indexes.complexity.size,
            category: this._indexes.category.size,
            temporal: this._indexes.temporal.size,
            activation: this._indexes.activation.size
        };

        return {
            totalConcepts: this._totalConcepts,
            inheritanceEntries: indexSizes.inheritance,
            implicationEntries: indexSizes.implication,
            similarityEntries: indexSizes.similarity,
            operatorEntries: indexSizes.compound,
            atomicEntries: indexSizes.atomic,
            compoundByOpEntries: indexSizes.compoundByOp,
            componentEntries: indexSizes.component,
            complexityEntries: indexSizes.complexity,
            categoryEntries: indexSizes.category,
            temporalEntries: indexSizes.temporal,
            activationEntries: indexSizes.activation,
            compoundTermsByOperator: Object.fromEntries(
                Array.from(this._indexes.compound.entries()).map(([op, terms]) => [op, terms.size])
            ),
            indexDetails: {
                atomic: this._getMapSizes(this._indexes.atomic),
                compoundByOp: this._getMapSizes(this._indexes.compoundByOp),
                component: this._getMapSizes(this._indexes.component),
                complexity: this._getMapSizes(this._indexes.complexity),
                category: this._getMapSizes(this._indexes.category),
                temporal: this._getMapSizes(this._indexes.temporal),
                activation: this._getMapSizes(this._indexes.activation)
            }
        };
    }

    /**
     * Helper to get sizes of maps for stats
     */
    _getMapSizes(map) {
        const sizes = {};
        for (const [key, value] of map.entries()) {
            sizes[key.toString()] = value.size;
        }
        return sizes;
    }

    clear() {
        Object.values(this._indexes).forEach(index => index.clear());
        this._totalConcepts = 0;
    }

    /**
     * Rebuild indexes for a more efficient structure (e.g., after large changes)
     */
    rebuildIndex(concepts) {
        // Clear current indexes
        Object.values(this._indexes).forEach(index => index.clear());
        this._totalConcepts = 0;

        // Re-add all concepts
        for (const concept of concepts) {
            this.addConcept(concept);
        }
    }

    /**
     * Get concepts that match specific patterns or criteria
     */
    queryConcepts(query, options = {}) {
        const {limit = 50, sortBy = 'relevance', ascending = false} = options;

        // Define query handlers based on type
        const queryHandlers = {
            'function': () => this.getAllConcepts().filter(query).slice(0, limit),
            'string': () => this._searchConceptsByText(query, limit),
            'object': () => this.findConceptsWithFilters(query).slice(0, limit)
        };

        // Get handler based on query type
        const handler = queryHandlers[typeof query];
        return handler ? handler() : [];
    }

    /**
     * Search concepts by text patterns
     */
    _searchConceptsByText(searchTerm, limit) {
        const normalizedSearch = searchTerm.toLowerCase();
        const results = [];

        // Search in term names and components
        for (const concept of this.getAllConcepts()) {
            const term = concept.term;
            let relevance = 0;

            // Check term name
            if (term.name && term.name.toLowerCase().includes(normalizedSearch)) {
                relevance += 0.5;
            }

            // Check components if it's a compound term
            if (term.components) {
                for (const component of term.components) {
                    if (component.name && component.name.toLowerCase().includes(normalizedSearch)) {
                        relevance += 0.3;
                        break;
                    }
                }
            }

            // Check operator
            if (term.operator && term.operator.toLowerCase().includes(normalizedSearch)) {
                relevance += 0.2;
            }

            if (relevance > 0) {
                results.push({concept, relevance});
            }
        }

        // Sort by relevance and limit
        return results
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit)
            .map(item => item.concept);
    }

    /**
     * Get statistical summary of concept distribution
     */
    getConceptDistribution() {
        const concepts = this.getAllConcepts();
        const distribution = {
            byCategory: {},
            byComplexity: {},
            byOperator: {},
            byActivation: {},
            total: this._totalConcepts
        };

        // Collect statistics using reduce for better functional style
        concepts.reduce((dist, concept) => {
            // Category distribution
            const category = TermCategorization.getTermCategory(concept.term);
            dist.byCategory[category] = (dist.byCategory[category] || 0) + 1;

            // Complexity distribution
            const complexity = TermCategorization.getTermComplexity(concept.term);
            const complexityLevel = Math.floor(complexity);
            dist.byComplexity[complexityLevel] = (dist.byComplexity[complexityLevel] || 0) + 1;

            // Operator distribution (for compound terms)
            if (concept.term.operator) {
                const operator = concept.term.operator;
                dist.byOperator[operator] = (dist.byOperator[operator] || 0) + 1;
            }

            // Activation distribution
            const activation = concept.activation || 0;
            const activationBucket = Math.floor(activation * 10) / 10; // Bucket by 0.1 increments
            dist.byActivation[activationBucket] = (dist.byActivation[activationBucket] || 0) + 1;

            return dist;
        }, distribution);

        return distribution;
    }

    /**
     * Find concepts that are most active (have high activation values)
     */
    getMostActiveConcepts(limit = 10) {
        return this.getAllConcepts()
            .filter(concept => concept.activation > 0)
            .sort((a, b) => (b.activation || 0) - (a.activation || 0))
            .slice(0, limit);
    }

    /**
     * Find recently created concepts
     */
    getRecentConcepts(limit = 10) {
        return this.getAllConcepts()
            .filter(concept => concept.createdAt)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, limit);
    }

    /**
     * Get concepts grouped by time periods
     */
    getConceptsByTimePeriod(period = 'day') {
        const now = Date.now();
        const periodMappings = {
            'hour': 3600000,    // 1 hour in ms
            'day': 86400000,     // 1 day in ms
            'week': 604800000,   // 1 week in ms
            'month': 2592000000  // ~1 month in ms
        };

        const periodMs = periodMappings[period] || periodMappings['day'];
        const periods = {};
        const periodCount = 10; // Show last 10 periods

        // Initialize periods
        for (let i = 0; i < periodCount; i++) {
            const periodStart = now - (i * periodMs);
            const periodEnd = periodStart + periodMs;
            periods[i] = {
                start: periodStart,
                end: periodEnd,
                concepts: [],
                count: 0
            };
        }

        // Categorize concepts into periods
        for (const concept of this.getAllConcepts()) {
            const createdAt = concept.createdAt || 0;

            for (let i = 0; i < periodCount; i++) {
                if (createdAt >= periods[i].start && createdAt < periods[i].end) {
                    periods[i].concepts.push(concept);
                    periods[i].count++;
                    break;
                }
            }
        }

        return periods;
    }

    /**
     * Export index data in various formats
     */
    export(format = 'json') {
        const data = {
            concepts: this.getAllConcepts(),
            stats: this.getStats(),
            config: this._config,
            timestamp: Date.now()
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this._exportToCSV(data);
            default:
                return data;
        }
    }

    /**
     * Export to CSV format (simplified)
     */
    _exportToCSV(data) {
        // This is a simplified CSV export
        // In practice, this would need more sophisticated handling
        let csv = 'Term,Category,Complexity,Activation,CreatedAt\n';

        for (const concept of data.concepts) {
            const term = concept.term.name || concept.term.toString();
            const category = TermCategorization.getTermCategory(concept.term);
            const complexity = TermCategorization.getTermComplexity(concept.term);
            const activation = concept.activation || 0;
            const createdAt = concept.createdAt || 0;

            csv += `"${term}",${category},${complexity},${activation},${createdAt}\n`;
        }

        return csv;
    }

    // Delegate performance monitoring methods to PerformanceMonitor
    addPerformanceMonitoring() {
        // Already instantiated in constructor
    }

    startPerformanceMonitoring(interval) {
        this._performanceMonitor.startMonitoring(null, interval);
    }

    stopPerformanceMonitoring() {
        this._performanceMonitor.stopMonitoring();
    }

    getPerformanceStats() {
        return this._performanceMonitor.getPerformanceStats(this._indexes);
    }

    optimizePerformance() {
        return this._performanceMonitor.optimize();
    }

    optimize() {
        // Remove empty sets to free up memory
        for (const index of Object.values(this._indexes)) {
            for (const [key, value] of index.entries()) {
                if (value.size === 0) {
                    index.delete(key);
                }
            }
        }
    }

    // Delegate validation methods to ValidationUtils
    addValidation() {
        // Already instantiated in constructor
    }

    startAutoValidation(interval) {
        this._validationUtils.startAutoValidation(null, interval);
    }

    stopAutoValidation() {
        this._validationUtils.stopAutoValidation();
    }

    validate() {
        return this._validationUtils.validate(this._indexes, console);
    }

    repair() {
        return this._validationUtils.repair(this._indexes, console);
    }

    registerValidationRule(name, ruleFn) {
        this._validationUtils.registerValidationRule(name, ruleFn);
    }

    unregisterValidationRule(name) {
        return this._validationUtils.unregisterValidationRule(name);
    }

    getValidationStats() {
        return this._validationUtils.getValidationStats(this._indexes);
    }

    // Index-specific helper methods
    _addToIndex(index, key, value) {
        IndexUtils.addToIndex(this._indexes, index, key, value);
    }

    _removeFromIndex(index, key, value) {
        IndexUtils.removeFromIndex(this._indexes, index, key, value);
    }

    _addToMultipleIndexes(indexEntries) {
        IndexUtils.addMultipleToIndex(this._indexes, indexEntries);
    }

    _removeFromMultipleIndexes(indexEntries) {
        IndexUtils.removeMultipleFromIndex(this._indexes, indexEntries);
    }

    _indexInheritance(term, concept) {
        if (term.components.length >= 2) {
            this._addToIndex('inheritance', term.components[1], concept);
        }
    }

    _indexImplication(term, concept) {
        if (term.components.length >= 2) {
            this._addToIndex('implication', term.components[0], concept);
        }
    }

    _indexSimilarity(term, concept) {
        if (term.components.length >= 2) {
            this._addToIndex('similarity', term.components[0], concept);
            this._addToIndex('similarity', term.components[1], concept);
        }
    }

    _removeCompoundTermIndex(term, concept) {
        this._removeFromIndex('compound', term.operator, term);

        switch (term.operator) {
            case '-->':
                this._removeInheritanceIndex(term, concept);
                break;
            case '==>':
                this._removeImplicationIndex(term, concept);
                break;
            case '<->':
                this._removeSimilarityIndex(term, concept);
                break;
        }
    }

    _removeInheritanceIndex(term, concept) {
        if (term.components.length >= 2) {
            this._removeFromIndex('inheritance', term.components[1], concept);
        }
    }

    _removeImplicationIndex(term, concept) {
        if (term.components.length >= 2) {
            this._removeFromIndex('implication', term.components[0], concept);
        }
    }

    _removeSimilarityIndex(term, concept) {
        if (term.components.length >= 2) {
            this._removeFromIndex('similarity', term.components[0], concept);
            this._removeFromIndex('similarity', term.components[1], concept);
        }
    }

    findInheritanceConcepts = (predicate) => Array.from(this._indexes.inheritance.get(predicate) || []);
    findImplicationConcepts = (premise) => Array.from(this._indexes.implication.get(premise) || []);
    findSimilarityConcepts = (term) => Array.from(this._indexes.similarity.get(term) || []);

    findConceptsByOperator(operator) {
        const terms = this._indexes.compound.get(operator) || new Set();
        return Array.from(terms)
            .flatMap(term => Array.from(this._indexes.term.get(term.id) || []))
            .filter(Boolean);
    }

    /**
     * Find concepts by complexity level
     */
    findConceptsByComplexity(level) {
        const concepts = this._indexes.complexity.get(level) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by category
     */
    findConceptsByCategory(category) {
        const concepts = this._indexes.category.get(category) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by activation level
     */
    findConceptsByActivation(activationBucket) {
        const concepts = this._indexes.activation.get(activationBucket) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by component (subterm matching)
     */
    findConceptsByComponent(componentTerm) {
        const concepts = this._indexes.component.get(componentTerm) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by temporal range
     */
    findConceptsByTemporal(temporalBucket) {
        const concepts = this._indexes.temporal.get(temporalBucket) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find atomic concepts by name
     */
    findAtomicConcepts(name) {
        const concepts = this._indexes.atomic.get(name) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by operator (enhanced)
     */
    findConceptsByOperatorEnhanced(operator) {
        // Get concepts from both the basic compound index and the enhanced compoundByOp index
        const basicConcepts = this.findConceptsByOperator(operator);
        const enhancedConcepts = Array.from(this._indexes.compoundByOp.get(operator) || []);

        // Combine and deduplicate
        const allConcepts = [...basicConcepts, ...enhancedConcepts];
        return Array.from(new Set(allConcepts));
    }
}