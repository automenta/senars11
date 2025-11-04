import { IndexConfiguration } from './IndexConfiguration.js';
import { TermCategorization } from './TermCategorization.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { ValidationUtils } from './ValidationUtils.js';
import { AtomicIndex } from './indexes/AtomicIndex.js';
import { CompoundIndex } from './indexes/CompoundIndex.js';
import { ActivationIndex } from './indexes/ActivationIndex.js';
import { TemporalIndex } from './indexes/TemporalIndex.js';
import { RelationshipIndex } from './indexes/RelationshipIndex.js';

export class MemoryIndex {
    constructor() {
        this._totalConcepts = 0;
        this._config = IndexConfiguration.getDefaultConfig();
        
        // Initialize specialized indexes
        this._atomicIndex = new AtomicIndex(this._config);
        this._compoundIndex = new CompoundIndex(this._config);
        this._activationIndex = new ActivationIndex(this._config);
        this._temporalIndex = new TemporalIndex(this._config);
        this._relationshipIndex = new RelationshipIndex(this._config);
        
        // Additional index for term id to concept mapping to support getConcept method
        // Map from termId to an array of concepts (to handle multiple concepts with same term)
        this._termIdToConcepts = new Map();
        
        this._performanceMonitor = new PerformanceMonitor();
        this._validationUtils = new ValidationUtils();
    }

    addConcept(concept) {
        const { term } = concept;
        this._totalConcepts++;

        // Track term id to concept mapping - handle multiple concepts with same term
        if (term.id) {
            if (!this._termIdToConcepts.has(term.id)) {
                this._termIdToConcepts.set(term.id, []);
            }
            // Add concept to the list
            this._termIdToConcepts.get(term.id).push(concept);
        }

        if (term.isAtomic) {
            this._atomicIndex.add(concept);
        } else {
            this._compoundIndex.add(concept);
        }

        // Add to cross-cutting indexes
        this._activationIndex.add(concept);
        this._temporalIndex.add(concept);
        this._relationshipIndex.add(concept);
    }

    removeConcept(concept) {
        const { term } = concept;
        
        // Remove specific concept from term id mapping
        if (term.id && this._termIdToConcepts.has(term.id)) {
            const concepts = this._termIdToConcepts.get(term.id);
            const index = concepts.indexOf(concept);
            if (index !== -1) {
                concepts.splice(index, 1);
                // If no more concepts for this term id, remove the entry entirely
                if (concepts.length === 0) {
                    this._termIdToConcepts.delete(term.id);
                }
            }
        }
        
        if (term.isAtomic) {
            this._atomicIndex.remove(concept);
        } else {
            this._compoundIndex.remove(concept);
        }

        // Remove from cross-cutting indexes
        this._activationIndex.remove(concept);
        this._temporalIndex.remove(concept);
        this._relationshipIndex.remove(concept);
        
        this._totalConcepts = Math.max(0, this._totalConcepts - 1);
    }

    updateConcept(concept, updates) {
        this.removeConcept(concept);
        Object.assign(concept, updates);
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
        // Get concepts from the appropriate indexes based on filters
        let candidates = [];
        
        // Start with the most specific index based on filter types
        if (filters.operator) {
            candidates = this._compoundIndex.find({ operator: filters.operator });
        } else if (filters.category) {
            candidates = this._compoundIndex.find({ category: filters.category });
        } else if (filters.minComplexity !== undefined || filters.maxComplexity !== undefined) {
            candidates = this._compoundIndex.find({ 
                minComplexity: filters.minComplexity, 
                maxComplexity: filters.maxComplexity 
            });
        } else if (filters.minActivation !== undefined || filters.maxActivation !== undefined) {
            candidates = this._activationIndex.find({
                minActivation: filters.minActivation,
                maxActivation: filters.maxActivation
            });
        } else if (filters.createdAfter !== undefined || filters.createdBefore !== undefined) {
            candidates = this._temporalIndex.find({
                createdAfter: filters.createdAfter,
                createdBefore: filters.createdBefore
            });
        } else {
            // Get all concepts if no specific filters
            candidates = this.getAllConcepts();
        }

        // Apply remaining filters
        const filtersMap = {
            category: concept => TermCategorization.getTermCategory(concept.term) === filters.category,
            minComplexity: concept => TermCategorization.getTermComplexity(concept.term) >= filters.minComplexity,
            maxComplexity: concept => TermCategorization.getTermComplexity(concept.term) <= filters.maxComplexity,
            minActivation: concept => (concept.activation || 0) >= filters.minActivation,
            maxActivation: concept => (concept.activation || 0) <= filters.maxActivation,
            operator: concept => concept.term.operator === filters.operator,
            createdAfter: concept => (concept.createdAt || 0) >= filters.createdAfter,
            createdBefore: concept => (concept.createdAt || 0) <= filters.createdBefore
        };

        // Apply filters that are defined
        return candidates.filter(concept => {
            for (const [filterName, filterValue] of Object.entries(filters)) {
                if (filterValue !== undefined && filtersMap[filterName] && !filtersMap[filterName](concept)) {
                    return false;
                }
            }
            return true;
        });
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
                const concepts = this._relationshipIndex.find({ 
                    relationshipType: 'inheritance', 
                    subject: currentTerm 
                });
                concepts.forEach(c => relatedConcepts.add(c));
            }

            if (relationshipTypes.includes('implication')) {
                const concepts = this._relationshipIndex.find({ 
                    relationshipType: 'implication', 
                    premise: currentTerm 
                });
                concepts.forEach(c => relatedConcepts.add(c));
            }

            if (relationshipTypes.includes('similarity')) {
                // Add logic for similarity relationships
                const concepts = this._relationshipIndex.find({ 
                    relationshipType: 'similarity' 
                });
                concepts.forEach(c => relatedConcepts.add(c));
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
        const concepts = this._relationshipIndex.find({ 
            relationshipType: 'inheritance', 
            subject: term 
        });
        concepts.forEach(c => relatedConcepts.add(c));
    }

    _findImplicationRelated(term, relatedConcepts) {
        const concepts = this._relationshipIndex.find({ 
            relationshipType: 'implication', 
            premise: term 
        });
        concepts.forEach(c => relatedConcepts.add(c));
    }

    _findSimilarityRelated(term, relatedConcepts) {
        const concepts = this._relationshipIndex.find({ 
            relationshipType: 'similarity' 
        });
        concepts.forEach(c => relatedConcepts.add(c));
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

        // Find by components - use compound index
        if (term.components) {
            for (const comp of term.components) {
                // Since component indexing is in CompoundIndex, we need to search there
                // This requires extending CompoundIndex to support component-based searches
                const byComponent = this._compoundIndex.find({ component: comp });
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
            const byCategory = this._compoundIndex.find({ category: category });
            for (const concept of byCategory) {
                if (results.has(concept)) continue; // Skip if already found via components
                if (concept.activation < minActivation) continue;

                // Calculate relevance based on category match
                const relevance = this._calculateRelevance(term, concept.term, 'category');
                results.set(concept, {relevance, method: 'category'});
            }
        }

        // Apply semantic similarity if enabled
        if (useSemanticSimilarity) {
            const semanticallySimilar = this._findSemanticallySimilarConcepts(term, searchDepth);
            for (const [concept, score] of semanticallySimilar.entries()) {
                if (results.has(concept)) continue;
                if (concept.activation < minActivation) continue;

                // Filter by categories
                const category = TermCategorization.getTermCategory(concept.term);
                if (excludeCategories.includes(category)) continue;
                if (includeCategories.length > 0 && !includeCategories.includes(category)) continue;

                results.set(concept, {relevance: score, method: 'semantic'});
            }
        }

        // Sort by relevance and limit results
        const sortedConcepts = Array.from(results.entries())
            .sort((a, b) => b[1].relevance - a[1].relevance)
            .slice(0, maxResults)
            .map(item => item[0]);

        return sortedConcepts;
    }

    /**
     * Find semantically similar concepts based on structural similarity
     */
    _findSemanticallySimilarConcepts(term, depth = 2) {
        const results = new Map();

        // Calculate similarity with all concepts of the same category
        const category = TermCategorization.getTermCategory(term);
        const sameCategoryConcepts = this._compoundIndex.find({ category: category });

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
        const concepts = this._termIdToConcepts.get(termHash);
        if (concepts && concepts.length > 0) {
            // Return the last concept in the list (most recently added)
            return concepts[concepts.length - 1];
        }
        return undefined;
    }

    getAllConcepts() {
        const allConcepts = new Set();
        
        // Combine concepts from all indexes
        [...this._atomicIndex.getAll(), 
         ...this._compoundIndex.getAll(),
         ...this._activationIndex.getAll(),
         ...this._temporalIndex.getAll(),
         ...this._relationshipIndex.getAll()].forEach(c => allConcepts.add(c));
        
        return Array.from(allConcepts);
    }

    getStats() {
        // Collect detailed statistics across all indexes
        const allConcepts = this.getAllConcepts();
        const stats = {
            totalConcepts: this._totalConcepts,
            inheritanceEntries: 0,
            implicationEntries: 0,
            similarityEntries: 0, // This might need to be the count of concepts involved in similarity relationships
            operatorEntries: 0,
            atomicEntries: 0,
            compoundByOpEntries: 0,
            componentEntries: 0,
            complexityEntries: 0,
            categoryEntries: 0,
            temporalEntries: this._temporalIndex.getAll().length,
            activationEntries: this._activationIndex.getAll().length,
            compoundTermsByOperator: {},
            indexDetails: {
                atomic: this._atomicIndex.constructor.name,
                compound: this._compoundIndex.constructor.name,
                activation: this._activationIndex.constructor.name,
                temporal: this._temporalIndex.constructor.name,
                relationship: this._relationshipIndex.constructor.name
            }
        };
        
        // Count by operator types
        for (const concept of allConcepts) {
            if (concept.term) {
                if (concept.term.isAtomic) {
                    stats.atomicEntries++;
                } else {
                    stats.operatorEntries++;
                    
                    if (concept.term.operator) {
                        // Count by operator
                        stats.compoundTermsByOperator[concept.term.operator] = 
                            (stats.compoundTermsByOperator[concept.term.operator] || 0) + 1;
                        
                        // Count by relationship type
                        switch (concept.term.operator) {
                            case '-->':
                                stats.inheritanceEntries++;
                                break;
                            case '==>':
                                stats.implicationEntries++;
                                break;
                            case '<->':
                                // For similarity, each concept counts as 2 entries (bidirectional)
                                // A <-> B means both A and B participate in similarity relationships
                                stats.similarityEntries += 2;
                                break;
                        }
                    }
                    
                    // Count nested operators for compound terms
                    if (concept.term.components) {
                        for (const component of concept.term.components) {
                            if (component.operator) {
                                stats.operatorEntries++; // Increment for each nested operator
                            }
                        }
                    }
                }
            }
        }
        
        // For compoundByOpEntries, count unique operators
        stats.compoundByOpEntries = Object.keys(stats.compoundTermsByOperator).length;
        
        // For component entries, we count concepts that have components (subterms)
        stats.componentEntries = this._compoundIndex.getAll().filter(c => c.term && c.term.components).length;
        
        return stats;
    }

    clear() {
        this._atomicIndex.clear();
        this._compoundIndex.clear();
        this._activationIndex.clear();
        this._temporalIndex.clear();
        this._relationshipIndex.clear();
        this._totalConcepts = 0;
    }

    /**
     * Rebuild indexes for a more efficient structure (e.g., after large changes)
     */
    rebuildIndex(concepts) {
        // Clear current indexes
        this.clear();

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

        for (const concept of this.getAllConcepts()) {
            const term = concept.term;
            let relevance = 0;

            // Compute relevance based on different matches
            if (term.name && term.name.toLowerCase().includes(normalizedSearch)) {
                relevance += 0.5;
            }

            if (term.components) {
                for (const component of term.components) {
                    if (component.name && component.name.toLowerCase().includes(normalizedSearch)) {
                        relevance += 0.3;
                        break;
                    }
                }
            }

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

        // Collect statistics
        for (const concept of concepts) {
            const category = TermCategorization.getTermCategory(concept.term);
            distribution.byCategory[category] = (distribution.byCategory[category] || 0) + 1;

            const complexity = TermCategorization.getTermComplexity(concept.term);
            const complexityLevel = Math.floor(complexity);
            distribution.byComplexity[complexityLevel] = (distribution.byComplexity[complexLevel] || 0) + 1;

            if (concept.term.operator) {
                const operator = concept.term.operator;
                distribution.byOperator[operator] = (distribution.byOperator[operator] || 0) + 1;
            }

            const activation = concept.activation || 0;
            const activationBucket = Math.floor(activation * 10) / 10; // Bucket by 0.1 increments
            distribution.byActivation[activationBucket] = (distribution.byActivation[activationBucket] || 0) + 1;
        }

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
        const periodCount = 10; // Show last 10 periods

        // Initialize periods
        const periods = {};
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

        // Categorize concepts into periods using optimized approach
        const concepts = this.getAllConcepts();
        for (const concept of concepts) {
            const createdAt = concept.createdAt || 0;
            const timeDiff = now - createdAt;
            
            // Find the right period index based on time difference
            const periodIndex = Math.floor(timeDiff / periodMs);
            if (periodIndex >= 0 && periodIndex < periodCount) {
                const period = periods[periodIndex];
                if (createdAt >= period.start && createdAt < period.end) {
                    period.concepts.push(concept);
                    period.count++;
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
        return this._performanceMonitor.getPerformanceStats({
            atomic: { size: this._atomicIndex.getAll().length },
            compound: { size: this._compoundIndex.getAll().length },
            activation: { size: this._activationIndex.getAll().length },
            temporal: { size: this._temporalIndex.getAll().length },
            relationship: { size: this._relationshipIndex.getAll().length }
        });
    }

    optimizePerformance() {
        return this._performanceMonitor.optimize();
    }

    optimize() {
        // In the new implementation, each index can optimize itself
        // For now, just return
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
        return this._validationUtils.validate({
            atomic: { size: this._atomicIndex.getAll().length },
            compound: { size: this._compoundIndex.getAll().length },
            activation: { size: this._activationIndex.getAll().length },
            temporal: { size: this._temporalIndex.getAll().length },
            relationship: { size: this._relationshipIndex.getAll().length }
        }, console);
    }

    repair() {
        return this._validationUtils.repair({
            atomic: { size: this._atomicIndex.getAll().length },
            compound: { size: this._compoundIndex.getAll().length },
            activation: { size: this._activationIndex.getAll().length },
            temporal: { size: this._temporalIndex.getAll().length },
            relationship: { size: this._relationshipIndex.getAll().length }
        }, console);
    }

    registerValidationRule(name, ruleFn) {
        this._validationUtils.registerValidationRule(name, ruleFn);
    }

    unregisterValidationRule(name) {
        return this._validationUtils.unregisterValidationRule(name);
    }

    getValidationStats() {
        return this._validationUtils.getValidationStats({
            atomic: { size: this._atomicIndex.getAll().length },
            compound: { size: this._compoundIndex.getAll().length },
            activation: { size: this._activationIndex.getAll().length },
            temporal: { size: this._temporalIndex.getAll().length },
            relationship: { size: this._relationshipIndex.getAll().length }
        });
    }

    findInheritanceConcepts(term) {
        return this._relationshipIndex.find({ 
            relationshipType: 'inheritance', 
            subject: term 
        });
    }

    findImplicationConcepts(term) {
        return this._relationshipIndex.find({ 
            relationshipType: 'implication', 
            premise: term 
        });
    }

    findSimilarityConcepts(term) {
        return this._relationshipIndex.find({ 
            relationshipType: 'similarity' 
        });
    }

    findConceptsByOperator(operator) {
        return this._compoundIndex.find({ operator });
    }

    /**
     * Find concepts by complexity level
     */
    findConceptsByComplexity(level) {
        return this._compoundIndex.find({ minComplexity: level, maxComplexity: level });
    }

    /**
     * Find concepts by category
     */
    findConceptsByCategory(category) {
        return this._compoundIndex.find({ category });
    }

    /**
     * Find concepts by activation level
     */
    findConceptsByActivation(minActivation, maxActivation) {
        return this._activationIndex.find({
            minActivation,
            maxActivation
        });
    }

    /**
     * Find concepts by component (subterm matching)
     */
    findConceptsByComponent(componentTerm) {
        return this._compoundIndex.find({ component: componentTerm });
    }

    /**
     * Find concepts by temporal range
     */
    findConceptsByTemporal(createdAfter, createdBefore) {
        return this._temporalIndex.find({
            createdAfter,
            createdBefore
        });
    }

    /**
     * Find atomic concepts by name
     */
    findAtomicConcepts(name) {
        return this._atomicIndex.find({ termName: name });
    }

    /**
     * Find concepts by operator (enhanced)
     */
    findConceptsByOperatorEnhanced(operator) {
        return this.findConceptsByOperator(operator);
    }
}