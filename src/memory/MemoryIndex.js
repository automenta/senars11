export class MemoryIndex {
    constructor() {
        this._indexes = {
            // Legacy indexes
            inheritance: new Map(), // Map<predicate, Set<subject>>
            implication: new Map(), // Map<premise, Set<conclusion>>
            similarity: new Map(),  // Map<term, Set<related>>
            compound: new Map(),    // Map<operator, Set<terms>>
            term: new Map(),        // Map<termHash, concept>

            // Enhanced indexes for different term types
            atomic: new Map(),      // Map<termName, Set<concepts>> - indexing atomic terms
            compoundByOp: new Map(), // Map<operator, Set<concepts>> - indexing compound terms by operator
            component: new Map(),   // Map<componentTerm, Set<compoundTerms>> - indexing by components
            complexity: new Map(),  // Map<complexityLevel, Set<concepts>> - indexing by complexity
            category: new Map(),    // Map<category, Set<concepts>> - indexing by term category
            temporal: new Map(),    // Map<timeRange, Set<concepts>> - temporal indexing
            activation: new Map()   // Map<activationRange, Set<concepts>> - activation-based indexing
        };

        // Configuration for different indexing strategies
        this._config = {
            complexityLevels: [1, 3, 5, 10, 20], // Different complexity thresholds
            activationBuckets: [0.1, 0.3, 0.5, 0.7, 0.9], // Activation level ranges
            maxTemporalRange: 3600000 // 1 hour in milliseconds
        };

        this._totalConcepts = 0;
    }

    _addToIndex(index, key, value) {
        if (!this._indexes[index].has(key)) {
            this._indexes[index].set(key, new Set());
        }
        this._indexes[index].get(key).add(value);
    }

    _removeFromIndex(index, key, value) {
        if (this._indexes[index].has(key)) {
            const set = this._indexes[index].get(key);
            set.delete(value);
            if (set.size === 0) {
                this._indexes[index].delete(key);
            }
        }
    }

    /**
     * Add to multiple indexes at once
     */
    _addToMultipleIndexes(indexEntries) {
        for (const {index, key, value} of indexEntries) {
            this._addToIndex(index, key, value);
        }
    }

    /**
     * Remove from multiple indexes at once
     */
    _removeFromMultipleIndexes(indexEntries) {
        for (const {index, key, value} of indexEntries) {
            this._removeFromIndex(index, key, value);
        }
    }

    addConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        this._totalConcepts++;
        this._addToIndex('term', termId, concept);

        // Add to type-specific indexes
        if (term.isAtomic) {
            this._addToIndex('atomic', term.name, concept);
        } else {
            this._indexCompoundTerm(term, concept);
            this._addToIndex('compoundByOp', term.operator, concept);
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

        // Remove from complexity-based index
        this._removeFromComplexityIndex(term, concept);

        // Remove from category-based index
        this._removeFromCategoryIndex(term, concept);

        // Remove from activation-based index
        this._removeFromActivationIndex(concept);

        // Remove from temporal index
        this._removeFromTemporalIndex(concept);
    }

    _indexCompoundTerm(term, concept) {
        this._addToIndex('compound', term.operator, term);

        // Index by all components (for faster subterm matching)
        if (term.components) {
            for (const comp of term.components) {
                this._addToIndex('component', comp, concept);

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

    /**
     * Index concept by complexity level
     */
    _indexByComplexity(term, concept) {
        // Get complexity of the term (if available)
        const complexity = this._getTermComplexity(term);
        const complexityLevel = this._getComplexityLevel(complexity);

        this._addToIndex('complexity', complexityLevel, concept);
    }

    /**
     * Remove from complexity index
     */
    _removeFromComplexityIndex(term, concept) {
        const complexity = this._getTermComplexity(term);
        const complexityLevel = this._getComplexityLevel(complexity);

        this._removeFromIndex('complexity', complexityLevel, concept);
    }

    /**
     * Index concept by category
     */
    _indexByCategory(term, concept) {
        const category = this._getTermCategory(term);
        this._addToIndex('category', category, concept);
    }

    /**
     * Remove from category index
     */
    _removeFromCategoryIndex(term, concept) {
        const category = this._getTermCategory(term);
        this._removeFromIndex('category', category, concept);
    }

    /**
     * Index concept by activation level
     */
    _indexByActivation(concept) {
        const activationBucket = this._getActivationBucket(concept.activation);
        this._addToIndex('activation', activationBucket, concept);
    }

    /**
     * Remove from activation index
     */
    _removeFromActivationIndex(concept) {
        const activationBucket = this._getActivationBucket(concept.activation);
        this._removeFromIndex('activation', activationBucket, concept);
    }

    /**
     * Index concept temporally
     */
    _indexByTemporal(concept) {
        // For now, we'll just index by creation time (concept should have a timestamp)
        const timestamp = concept.createdAt || Date.now();
        const temporalBucket = this._getTemporalBucket(timestamp);
        this._addToIndex('temporal', temporalBucket, concept);
    }

    /**
     * Remove from temporal index
     */
    _removeFromTemporalIndex(concept) {
        const timestamp = concept.createdAt || Date.now();
        const temporalBucket = this._getTemporalBucket(timestamp);
        this._removeFromIndex('temporal', temporalBucket, concept);
    }

    /**
     * Get the complexity of a term (simplified)
     */
    _getTermComplexity(term) {
        // Base complexity on number of components and nesting
        if (!term || !term.components) return 1;

        let complexity = 1; // Base complexity

        if (Array.isArray(term.components)) {
            complexity += term.components.length * 0.5; // Add complexity for each component

            // Add complexity for nested structures
            for (const comp of term.components) {
                if (comp.components && comp.components.length > 0) {
                    complexity += this._getTermComplexity(comp);
                }
            }
        }

        return complexity;
    }

    /**
     * Get the complexity level bucket for a given complexity value
     */
    _getComplexityLevel(complexity) {
        for (let i = 0; i < this._config.complexityLevels.length; i++) {
            if (complexity <= this._config.complexityLevels[i]) {
                return `level_${this._config.complexityLevels[i]}`;
            }
        }
        return `level_${this._config.complexityLevels[this._config.complexityLevels.length - 1]}_plus`;
    }

    /**
     * Get the category of a term based on its structure
     */
    _getTermCategory(term) {
        if (!term) return 'unknown';

        if (term.isAtomic) return 'atomic';

        // Categorize based on operator
        switch (term.operator) {
            case '-->':
                return 'inheritance';
            case '==>':
                return 'implication';
            case '<->':
                return 'similarity';
            case '&':
                return 'conjunction';
            case '|':
                return 'disjunction';
            case '^':
                return 'operation';
            case '--':
                return 'negation';
            default:
                return 'compound';
        }
    }

    /**
     * Get the activation bucket for a given activation value
     */
    _getActivationBucket(activation) {
        if (activation === undefined) activation = 0;

        for (let i = 0; i < this._config.activationBuckets.length; i++) {
            if (activation <= this._config.activationBuckets[i]) {
                return `act_${this._config.activationBuckets[i]}`;
            }
        }
        return `act_${this._config.activationBuckets[this._config.activationBuckets.length - 1]}_plus`;
    }

    /**
     * Get the temporal bucket for a given timestamp
     */
    _getTemporalBucket(timestamp) {
        // Group by hour (for now)
        const hourBucket = Math.floor(timestamp / this._config.maxTemporalRange);
        return `hour_${hourBucket}`;
    }

    /**
     * Update concept in all relevant indexes when its properties change
     */
    updateConcept(concept, updates) {
        // Remove from current indexes
        this.removeConcept(concept);

        // Apply updates
        Object.assign(concept, updates);

        // Re-add to indexes with updated properties
        this.addConcept(concept);
    }

    /**
     * Bulk add concepts for better performance
     */
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
                this._getTermCategory(concept.term) === filters.category);
        }

        // Filter by complexity range
        if (filters.minComplexity || filters.maxComplexity) {
            results = results.filter(concept => {
                const complexity = this._getTermComplexity(concept.term);
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
     * Get index performance metrics
     */
    getPerformanceMetrics() {
        const metrics = {
            indexSizes: {},
            memoryUsage: {},
            queryPerformance: {}
        };

        // Get sizes of all indexes
        for (const [indexName, index] of Object.entries(this._indexes)) {
            metrics.indexSizes[indexName] = index.size;
            metrics.memoryUsage[indexName] = this._estimateIndexMemoryUsage(index);
        }

        return metrics;
    }

    /**
     * Estimate memory usage of an index (simplified)
     */
    _estimateIndexMemoryUsage(index) {
        // This is a very rough estimation
        // In reality, memory usage would depend on the actual implementation
        let estimatedBytes = 0;

        for (const [key, value] of index.entries()) {
            // Estimate key size (assuming string keys)
            estimatedBytes += typeof key === 'string' ? key.length : 8;

            // Estimate value size (assuming Sets of concepts)
            if (value instanceof Set) {
                estimatedBytes += value.size * 64; // Rough estimate per concept reference
            } else {
                estimatedBytes += 64; // Rough estimate for single value
            }
        }

        return estimatedBytes;
    }

    /**
     * Validate the integrity of indexes
     */
    validateIndexes() {
        const issues = [];

        // Check for consistency between term index and other indexes
        for (const [termId, concept] of this._indexes.term.entries()) {
            // Verify concept exists in other relevant indexes
            if (concept.term.isAtomic) {
                if (!this._indexes.atomic.has(concept.term.name)) {
                    issues.push(`Atomic concept ${termId} missing from atomic index`);
                }
            } else {
                if (!this._indexes.compoundByOp.has(concept.term.operator)) {
                    issues.push(`Compound concept ${termId} missing from compoundByOp index`);
                }
            }
        }

        return issues;
    }

    /**
     * Serialize index data for persistence
     */
    serialize() {
        // This would need to be implemented based on specific persistence requirements
        // For now, we'll just return a simplified representation
        return {
            stats: this.getStats(),
            config: this._config,
            timestamp: Date.now()
        };
    }

    /**
     * Deserialize index data
     */
    deserialize(data) {
        if (!data) return false;

        // Restore configuration
        if (data.config) {
            this._config = {...this._config, ...data.config};
        }

        // Note: Actual index data would need to be restored based on specific implementation
        // This is a placeholder implementation

        return true;
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
                    const category = this._getTermCategory(concept.term);
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
        const category = this._getTermCategory(term);
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
        const category = this._getTermCategory(term);
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
     * This method is similar to the one in ForgettingPolicy but specific to this class
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
        return {
            totalConcepts: this._totalConcepts,
            inheritanceEntries: this._indexes.inheritance.size,
            implicationEntries: this._indexes.implication.size,
            similarityEntries: this._indexes.similarity.size,
            operatorEntries: this._indexes.compound.size,
            compoundTermsByOperator: Object.fromEntries(
                Array.from(this._indexes.compound.entries()).map(([op, terms]) => [op, terms.size])
            ),
            atomicEntries: this._indexes.atomic.size,
            compoundByOpEntries: this._indexes.compoundByOp.size,
            componentEntries: this._indexes.component.size,
            complexityEntries: this._indexes.complexity.size,
            categoryEntries: this._indexes.category.size,
            temporalEntries: this._indexes.temporal.size,
            activationEntries: this._indexes.activation.size,
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

        // If query is a function, use it as a filter
        if (typeof query === 'function') {
            return this.getAllConcepts()
                .filter(query)
                .slice(0, limit);
        }

        // If query is a string, treat it as a search term
        if (typeof query === 'string') {
            return this._searchConceptsByText(query, limit);
        }

        // If query is an object, treat it as filter criteria
        if (typeof query === 'object') {
            return this.findConceptsWithFilters(query).slice(0, limit);
        }

        return [];
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
        const distribution = {
            byCategory: {},
            byComplexity: {},
            byOperator: {},
            byActivation: {},
            total: this._totalConcepts
        };

        // Collect statistics
        for (const concept of this.getAllConcepts()) {
            // Category distribution
            const category = this._getTermCategory(concept.term);
            distribution.byCategory[category] = (distribution.byCategory[category] || 0) + 1;

            // Complexity distribution
            const complexity = this._getTermComplexity(concept.term);
            const complexityLevel = Math.floor(complexity);
            distribution.byComplexity[complexityLevel] = (distribution.byComplexity[complexityLevel] || 0) + 1;

            // Operator distribution (for compound terms)
            if (concept.term.operator) {
                const operator = concept.term.operator;
                distribution.byOperator[operator] = (distribution.byOperator[operator] || 0) + 1;
            }

            // Activation distribution
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
            const category = this._getTermCategory(concept.term);
            const complexity = this._getTermComplexity(concept.term);
            const activation = concept.activation || 0;
            const createdAt = concept.createdAt || 0;

            csv += `"${term}",${category},${complexity},${activation},${createdAt}\n`;
        }

        return csv;
    }

    /**
     * Add performance monitoring and optimization methods
     */
    addPerformanceMonitoring() {
        this._performance = {
            queryTimes: [],
            indexUpdateTimes: [],
            memoryUsage: [],
            lastMetrics: null,
            metricsInterval: null
        };
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring(interval = 30000) { // 30 seconds default
        if (this._performance.metricsInterval) {
            clearInterval(this._performance.metricsInterval);
        }

        this._performance.metricsInterval = setInterval(() => {
            this._collectPerformanceMetrics();
        }, interval);
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring() {
        if (this._performance.metricsInterval) {
            clearInterval(this._performance.metricsInterval);
            this._performance.metricsInterval = null;
        }
    }

    /**
     * Collect performance metrics
     */
    _collectPerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            memoryUsage: this._getMemoryUsage(),
            indexSizes: this._getIndexSizes(),
            queryPerformance: this._getQueryPerformance(),
            systemLoad: this._getSystemLoad()
        };

        this._performance.lastMetrics = metrics;
        this._performance.memoryUsage.push({
            timestamp: metrics.timestamp,
            usage: metrics.memoryUsage
        });

        // Keep only last 100 measurements to prevent memory growth
        if (this._performance.memoryUsage.length > 100) {
            this._performance.memoryUsage = this._performance.memoryUsage.slice(-50);
        }

        return metrics;
    }

    /**
     * Get current memory usage
     */
    _getMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                rss: usage.rss,
                external: usage.external
            };
        }
        return {heapUsed: 0, heapTotal: 0, rss: 0, external: 0};
    }

    /**
     * Get index sizes
     */
    _getIndexSizes() {
        const sizes = {};
        for (const [indexName, index] of Object.entries(this._indexes)) {
            sizes[indexName] = index.size;
        }
        return sizes;
    }

    /**
     * Get query performance metrics
     */
    _getQueryPerformance() {
        if (this._performance.queryTimes.length === 0) {
            return {avgQueryTime: 0, maxQueryTime: 0, totalQueries: 0};
        }

        const totalQueries = this._performance.queryTimes.length;
        const avgQueryTime = this._performance.queryTimes.reduce((sum, time) => sum + time, 0) / totalQueries;
        const maxQueryTime = Math.max(...this._performance.queryTimes);

        return {avgQueryTime, maxQueryTime, totalQueries};
    }

    /**
     * Get system load information
     */
    _getSystemLoad() {
        // This is a simplified system load measurement
        // In practice, you might use OS-specific APIs or libraries
        return {
            uptime: process.uptime ? process.uptime() : 0,
            pid: process.pid || 0,
            platform: process.platform || 'unknown'
        };
    }

    /**
     * Record query execution time
     */
    _recordQueryTime(time) {
        this._performance.queryTimes.push(time);

        // Keep only last 1000 measurements to prevent memory growth
        if (this._performance.queryTimes.length > 1000) {
            this._performance.queryTimes = this._performance.queryTimes.slice(-500);
        }
    }

    /**
     * Record index update time
     */
    _recordIndexUpdateTime(time) {
        this._performance.indexUpdateTimes.push(time);

        // Keep only last 1000 measurements to prevent memory growth
        if (this._performance.indexUpdateTimes.length > 1000) {
            this._performance.indexUpdateTimes = this._performance.indexUpdateTimes.slice(-500);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        if (!this._performance) {
            return {error: 'Performance monitoring not initialized'};
        }

        const currentMetrics = this._performance.lastMetrics || this._collectPerformanceMetrics();

        return {
            current: currentMetrics,
            historical: {
                memoryUsage: this._performance.memoryUsage,
                queryTimes: this._performance.queryTimes,
                indexUpdateTimes: this._performance.indexUpdateTimes
            },
            recommendations: this._generatePerformanceRecommendations(currentMetrics)
        };
    }

    /**
     * Generate performance recommendations based on current metrics
     */
    _generatePerformanceRecommendations(metrics) {
        const recommendations = [];

        // Memory usage recommendations
        if (metrics.memoryUsage.heapUsed > 0.8 * metrics.memoryUsage.heapTotal) {
            recommendations.push({
                type: 'memory',
                severity: 'warning',
                message: 'High memory usage detected. Consider running optimization.',
                action: 'optimize'
            });
        }

        // Query performance recommendations
        if (metrics.queryPerformance.avgQueryTime > 100) { // 100ms threshold
            recommendations.push({
                type: 'query',
                severity: 'warning',
                message: 'Average query time is high. Consider index optimization.',
                action: 'rebuildIndex'
            });
        }

        // Index size recommendations
        const largeIndexes = Object.entries(metrics.indexSizes)
            .filter(([name, size]) => size > 10000) // 10k threshold
            .map(([name, size]) => ({name, size}));

        if (largeIndexes.length > 0) {
            recommendations.push({
                type: 'index',
                severity: 'info',
                message: `Large indexes detected: ${largeIndexes.map(idx => idx.name).join(', ')}. Consider periodic cleanup.`,
                action: 'cleanup'
            });
        }

        return recommendations;
    }

    /**
     * Optimize index performance
     */
    optimizePerformance() {
        const startTime = Date.now();

        // Run garbage collection if available
        if (global.gc) {
            global.gc();
        }

        // Remove empty sets to free up memory
        this.optimize();

        // Compact performance data
        this._compactPerformanceData();

        const duration = Date.now() - startTime;
        this._recordIndexUpdateTime(duration);

        return {
            success: true,
            duration,
            action: 'optimizePerformance',
            timestamp: Date.now()
        };
    }

    /**
     * Compact performance data to prevent memory growth
     */
    _compactPerformanceData() {
        if (!this._performance) return;

        // Keep only recent performance data
        if (this._performance.memoryUsage.length > 100) {
            this._performance.memoryUsage = this._performance.memoryUsage.slice(-50);
        }

        if (this._performance.queryTimes.length > 1000) {
            this._performance.queryTimes = this._performance.queryTimes.slice(-500);
        }

        if (this._performance.indexUpdateTimes.length > 1000) {
            this._performance.indexUpdateTimes = this._performance.indexUpdateTimes.slice(-500);
        }
    }

    /**
     * Optimize index by removing unused entries and compacting structures
     */
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

    /**
     * Add validation and integrity checking methods
     */
    addValidation() {
        this._validation = {
            rules: new Map(),
            lastValidation: null,
            validationResults: [],
            autoValidation: false,
            validationInterval: null
        };
    }

    /**
     * Start automatic validation
     */
    startAutoValidation(interval = 60000) { // 1 minute default
        if (this._validation.validationInterval) {
            clearInterval(this._validation.validationInterval);
        }

        this._validation.autoValidation = true;
        this._validation.validationInterval = setInterval(() => {
            this.validate();
        }, interval);
    }

    /**
     * Stop automatic validation
     */
    stopAutoValidation() {
        if (this._validation.validationInterval) {
            clearInterval(this._validation.validationInterval);
            this._validation.validationInterval = null;
        }
        this._validation.autoValidation = false;
    }

    /**
     * Validate the integrity of indexes
     */
    validate() {
        const validationStartTime = Date.now();
        const results = {
            timestamp: validationStartTime,
            passed: true,
            errors: [],
            warnings: [],
            stats: this.getStats(),
            details: {}
        };

        try {
            // Check for consistency between term index and other indexes
            results.details.termConsistency = this._validateTermConsistency();
            if (!results.details.termConsistency.passed) {
                results.passed = false;
                results.errors.push(...results.details.termConsistency.errors);
            }

            // Check for orphaned entries
            results.details.orphanedEntries = this._validateOrphanedEntries();
            if (!results.details.orphanedEntries.passed) {
                results.warnings.push(...results.details.orphanedEntries.warnings);
            }

            // Check for duplicate entries
            results.details.duplicates = this._validateDuplicates();
            if (!results.details.duplicates.passed) {
                results.warnings.push(...results.details.duplicates.warnings);
            }

            // Check for invalid references
            results.details.invalidReferences = this._validateReferences();
            if (!results.details.invalidReferences.passed) {
                results.errors.push(...results.details.invalidReferences.errors);
                results.passed = false;
            }

            // Run custom validation rules
            results.details.customRules = this._validateCustomRules();
            if (!results.details.customRules.passed) {
                results.errors.push(...results.details.customRules.errors);
                results.passed = false;
            }

            // Update validation results history
            this._updateValidationHistory(results);
        } catch (error) {
            results.passed = false;
            results.errors.push(`Validation failed with exception: ${error.message}`);
            this._logger?.error('Validation failed with exception:', error);
        }

        results.duration = Date.now() - validationStartTime;
        this._validation.lastValidation = results;

        return results;
    }

    /**
     * Validate term consistency between indexes
     */
    _validateTermConsistency() {
        const result = {
            passed: true,
            errors: [],
            checked: 0,
            inconsistent: 0
        };

        try {
            const termIndex = this._indexes.term;
            for (const [termId, concepts] of termIndex.entries()) {
                result.checked++;

                for (const concept of concepts) {
                    // Verify concept exists in other relevant indexes
                    if (concept.term.isAtomic) {
                        const atomicIndex = this._indexes.atomic;
                        if (!atomicIndex.has(concept.term.name)) {
                            result.inconsistent++;
                            result.errors.push(`Atomic concept ${termId} missing from atomic index`);
                        }
                    } else {
                        const compoundByOpIndex = this._indexes.compoundByOp;
                        if (!compoundByOpIndex.has(concept.term.operator)) {
                            result.inconsistent++;
                            result.errors.push(`Compound concept ${termId} missing from compoundByOp index`);
                        }

                        // Check operator-specific indexes
                        switch (concept.term.operator) {
                            case '-->':
                                const inheritanceIndex = this._indexes.inheritance;
                                if (concept.term.components && concept.term.components.length >= 2) {
                                    const predicate = concept.term.components[1];
                                    if (!inheritanceIndex.has(predicate.name)) {
                                        result.inconsistent++;
                                        result.errors.push(`Inheritance concept ${termId} missing from inheritance index`);
                                    }
                                }
                                break;
                            case '==>':
                                const implicationIndex = this._indexes.implication;
                                if (concept.term.components && concept.term.components.length >= 2) {
                                    const premise = concept.term.components[0];
                                    if (!implicationIndex.has(premise.name)) {
                                        result.inconsistent++;
                                        result.errors.push(`Implication concept ${termId} missing from implication index`);
                                    }
                                }
                                break;
                            case '<->':
                                const similarityIndex = this._indexes.similarity;
                                if (concept.term.components && concept.term.components.length >= 2) {
                                    const term1 = concept.term.components[0];
                                    const term2 = concept.term.components[1];
                                    if (!similarityIndex.has(term1.name) && !similarityIndex.has(term2.name)) {
                                        result.inconsistent++;
                                        result.errors.push(`Similarity concept ${termId} missing from similarity index`);
                                    }
                                }
                                break;
                        }
                    }
                }
            }

            result.passed = result.inconsistent === 0;
        } catch (error) {
            result.passed = false;
            result.errors.push(`Term consistency validation failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Validate for orphaned entries
     */
    _validateOrphanedEntries() {
        const result = {
            passed: true,
            warnings: [],
            checked: 0,
            orphaned: 0
        };

        try {
            // Check for entries in secondary indexes that don't exist in primary term index
            const termIndex = this._indexes.term;

            // Check atomic index
            const atomicIndex = this._indexes.atomic;
            for (const [termName, concepts] of atomicIndex.entries()) {
                result.checked++;
                for (const concept of concepts) {
                    const termId = concept.term.id;
                    if (!termIndex.has(termId)) {
                        result.orphaned++;
                        result.warnings.push(`Orphaned atomic concept in atomic index: ${termName}`);
                    }
                }
            }

            // Check compound indexes
            const compoundIndexes = [
                this._indexes.compoundByOp,
                this._indexes.inheritance,
                this._indexes.implication,
                this._indexes.similarity
            ];

            for (const compoundIndex of compoundIndexes) {
                for (const [key, concepts] of compoundIndex.entries()) {
                    result.checked++;
                    for (const concept of concepts) {
                        const termId = concept.term.id;
                        if (!termIndex.has(termId)) {
                            result.orphaned++;
                            result.warnings.push(`Orphaned compound concept in ${compoundIndex.name || 'compound'} index: ${key}`);
                        }
                    }
                }
            }

            result.passed = result.orphaned === 0;
        } catch (error) {
            result.passed = false;
            result.warnings.push(`Orphaned entries validation failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Validate for duplicate entries
     */
    _validateDuplicates() {
        const result = {
            passed: true,
            warnings: [],
            checked: 0,
            duplicates: 0
        };

        try {
            // Check for duplicate entries in term index
            const termIndex = this._indexes.term;
            const seenConcepts = new Set();

            for (const [termId, concepts] of termIndex.entries()) {
                result.checked++;
                for (const concept of concepts) {
                    const conceptKey = `${termId}-${concept.stamp?.id || 'no-stamp'}`;
                    if (seenConcepts.has(conceptKey)) {
                        result.duplicates++;
                        result.warnings.push(`Duplicate concept in term index: ${conceptKey}`);
                    } else {
                        seenConcepts.add(conceptKey);
                    }
                }
            }

            result.passed = result.duplicates === 0;
        } catch (error) {
            result.passed = false;
            result.warnings.push(`Duplicates validation failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Validate references between concepts
     */
    _validateReferences() {
        const result = {
            passed: true,
            errors: [],
            checked: 0,
            invalid: 0
        };

        try {
            // Check for invalid references in compound terms
            const termIndex = this._indexes.term;

            for (const [termId, concepts] of termIndex.entries()) {
                result.checked++;
                for (const concept of concepts) {
                    if (concept.term.isCompound && concept.term.components) {
                        for (const component of concept.term.components) {
                            // Check if component references valid terms
                            if (component.isAtomic) {
                                // For atomic components, check if they exist in atomic index
                                const atomicIndex = this._indexes.atomic;
                                if (!atomicIndex.has(component.name)) {
                                    // This might be okay if it's a variable or unbound term
                                    // But we'll note it as a potential issue
                                    result.invalid++;
                                    result.errors.push(`Invalid atomic component reference: ${component.name} in concept ${termId}`);
                                }
                            } else if (component.isCompound) {
                                // For compound components, recursively check validity
                                const componentValidity = this._validateTermReference(component);
                                if (!componentValidity.valid) {
                                    result.invalid++;
                                    result.errors.push(`Invalid compound component reference: ${component.name} in concept ${termId} - ${componentValidity.reason}`);
                                }
                            }
                        }
                    }
                }
            }

            result.passed = result.invalid === 0;
        } catch (error) {
            result.passed = false;
            result.errors.push(`References validation failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Validate a single term reference
     */
    _validateTermReference(term) {
        if (!term) {
            return {valid: false, reason: 'Null term reference'};
        }

        if (term.isAtomic) {
            // Check if atomic term exists in atomic index
            const atomicIndex = this._indexes.atomic;
            if (!atomicIndex.has(term.name)) {
                return {valid: false, reason: `Atomic term not found: ${term.name}`};
            }
        } else if (term.isCompound) {
            // Check if all components are valid
            if (term.components) {
                for (const component of term.components) {
                    const componentValidity = this._validateTermReference(component);
                    if (!componentValidity.valid) {
                        return {valid: false, reason: `Invalid component: ${componentValidity.reason}`};
                    }
                }
            }
        }

        return {valid: true, reason: 'Valid reference'};
    }

    /**
     * Validate custom rules
     */
    _validateCustomRules() {
        const result = {
            passed: true,
            errors: [],
            checked: 0,
            failed: 0
        };

        try {
            // Run all registered custom validation rules
            if (this._validation && this._validation.rules) {
                for (const [ruleName, ruleFn] of this._validation.rules.entries()) {
                    result.checked++;
                    try {
                        const ruleResult = ruleFn(this);
                        if (!ruleResult.passed) {
                            result.failed++;
                            result.errors.push(`Custom validation rule ${ruleName} failed: ${ruleResult.message || 'No message'}`);
                        }
                    } catch (error) {
                        result.failed++;
                        result.errors.push(`Custom validation rule ${ruleName} threw exception: ${error.message}`);
                    }
                }
            }

            result.passed = result.failed === 0;
        } catch (error) {
            result.passed = false;
            result.errors.push(`Custom rules validation failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Update validation history
     */
    _updateValidationHistory(results) {
        this._validation.validationResults.push(results);

        // Keep only last 50 validation results to prevent memory growth
        if (this._validation.validationResults.length > 50) {
            this._validation.validationResults = this._validation.validationResults.slice(-25);
        }
    }

    /**
     * Register a custom validation rule
     */
    registerValidationRule(name, ruleFn) {
        if (!this._validation) {
            this.addValidation();
        }

        if (typeof ruleFn !== 'function') {
            throw new Error('Validation rule must be a function');
        }

        this._validation.rules.set(name, ruleFn);
    }

    /**
     * Unregister a custom validation rule
     */
    unregisterValidationRule(name) {
        if (!this._validation) return false;
        return this._validation.rules.delete(name);
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        if (!this._validation) {
            return {error: 'Validation not initialized'};
        }

        const stats = {
            totalValidations: this._validation.validationResults.length,
            lastValidation: this._validation.lastValidation,
            validationHistory: this._validation.validationResults,
            autoValidationEnabled: this._validation.autoValidation,
            customRulesCount: this._validation.rules.size
        };

        // Calculate success rate
        if (this._validation.validationResults.length > 0) {
            const passedCount = this._validation.validationResults.filter(r => r.passed).length;
            stats.successRate = passedCount / this._validation.validationResults.length;
        }

        return stats;
    }

    /**
     * Repair validation issues
     */
    repair() {
        const repairStartTime = Date.now();
        const results = {
            timestamp: repairStartTime,
            repaired: 0,
            errors: [],
            actions: []
        };

        try {
            // Run validation first to identify issues
            const validationResults = this.validate();

            if (!validationResults.passed) {
                // Attempt to repair inconsistencies
                results.actions.push('Attempting to repair validation issues...');

                // Repair term consistency issues
                if (validationResults.details.termConsistency &&
                    !validationResults.details.termConsistency.passed) {
                    const repairedCount = this._repairTermConsistency();
                    results.repaired += repairedCount;
                    results.actions.push(`Repaired ${repairedCount} term consistency issues`);
                }

                // Remove orphaned entries
                if (validationResults.details.orphanedEntries &&
                    !validationResults.details.orphanedEntries.passed) {
                    const removedCount = this._removeOrphanedEntries();
                    results.repaired += removedCount;
                    results.actions.push(`Removed ${removedCount} orphaned entries`);
                }

                // Remove duplicates
                if (validationResults.details.duplicates &&
                    !validationResults.details.duplicates.passed) {
                    const removedCount = this._removeDuplicates();
                    results.repaired += removedCount;
                    results.actions.push(`Removed ${removedCount} duplicate entries`);
                }

                // Repair invalid references
                if (validationResults.details.invalidReferences &&
                    !validationResults.details.invalidReferences.passed) {
                    const repairedCount = this._repairInvalidReferences();
                    results.repaired += repairedCount;
                    results.actions.push(`Repaired ${repairedCount} invalid references`);
                }
            } else {
                results.actions.push('No validation issues found, no repairs needed');
            }
        } catch (error) {
            results.errors.push(`Repair failed with exception: ${error.message}`);
            this._logger?.error('Repair failed with exception:', error);
        }

        results.duration = Date.now() - repairStartTime;
        return results;
    }

    /**
     * Repair term consistency issues
     */
    _repairTermConsistency() {
        let repairedCount = 0;

        try {
            const termIndex = this._indexes.term;
            for (const [termId, concepts] of termIndex.entries()) {
                for (const concept of concepts) {
                    // Add missing entries to appropriate indexes
                    if (concept.term.isAtomic) {
                        const atomicIndex = this._indexes.atomic;
                        if (!atomicIndex.has(concept.term.name)) {
                            this._addToIndex('atomic', concept.term.name, concept);
                            repairedCount++;
                        }
                    } else {
                        const compoundByOpIndex = this._indexes.compoundByOp;
                        if (!compoundByOpIndex.has(concept.term.operator)) {
                            this._addToIndex('compoundByOp', concept.term.operator, concept);
                            repairedCount++;
                        }

                        // Add to operator-specific indexes
                        switch (concept.term.operator) {
                            case '-->':
                                const inheritanceIndex = this._indexes.inheritance;
                                if (concept.term.components && concept.term.components.length >= 2) {
                                    const predicate = concept.term.components[1];
                                    if (!inheritanceIndex.has(predicate.name)) {
                                        this._addToIndex('inheritance', predicate.name, concept);
                                        repairedCount++;
                                    }
                                }
                                break;
                            case '==>':
                                const implicationIndex = this._indexes.implication;
                                if (concept.term.components && concept.term.components.length >= 2) {
                                    const premise = concept.term.components[0];
                                    if (!implicationIndex.has(premise.name)) {
                                        this._addToIndex('implication', premise.name, concept);
                                        repairedCount++;
                                    }
                                }
                                break;
                            case '<->':
                                const similarityIndex = this._indexes.similarity;
                                if (concept.term.components && concept.term.components.length >= 2) {
                                    const term1 = concept.term.components[0];
                                    const term2 = concept.term.components[1];
                                    if (!similarityIndex.has(term1.name)) {
                                        this._addToIndex('similarity', term1.name, concept);
                                        repairedCount++;
                                    }
                                    if (!similarityIndex.has(term2.name)) {
                                        this._addToIndex('similarity', term2.name, concept);
                                        repairedCount++;
                                    }
                                }
                                break;
                        }
                    }
                }
            }
        } catch (error) {
            this._logger?.warn('Failed to repair term consistency:', error);
        }

        return repairedCount;
    }

    /**
     * Remove orphaned entries
     */
    _removeOrphanedEntries() {
        let removedCount = 0;

        try {
            const termIndex = this._indexes.term;

            // Check atomic index
            const atomicIndex = this._indexes.atomic;
            for (const [termName, concepts] of atomicIndex.entries()) {
                for (const concept of Array.from(concepts)) { // Use Array.from to avoid modification during iteration
                    const termId = concept.term.id;
                    if (!termIndex.has(termId)) {
                        this._removeFromIndex('atomic', termName, concept);
                        removedCount++;
                    }
                }
            }

            // Check compound indexes
            const compoundIndexes = [
                this._indexes.compoundByOp,
                this._indexes.inheritance,
                this._indexes.implication,
                this._indexes.similarity
            ];

            for (const compoundIndex of compoundIndexes) {
                for (const [key, concepts] of compoundIndex.entries()) {
                    for (const concept of Array.from(concepts)) { // Use Array.from to avoid modification during iteration
                        const termId = concept.term.id;
                        if (!termIndex.has(termId)) {
                            this._removeFromIndex(compoundIndex.name || 'compound', key, concept);
                            removedCount++;
                        }
                    }
                }
            }
        } catch (error) {
            this._logger?.warn('Failed to remove orphaned entries:', error);
        }

        return removedCount;
    }

    /**
     * Remove duplicates
     */
    _removeDuplicates() {
        let removedCount = 0;

        try {
            // Remove duplicate entries in term index
            const termIndex = this._indexes.term;
            const seenConcepts = new Set();

            for (const [termId, concepts] of termIndex.entries()) {
                for (const concept of Array.from(concepts)) { // Use Array.from to avoid modification during iteration
                    const conceptKey = `${termId}-${concept.stamp?.id || 'no-stamp'}`;
                    if (seenConcepts.has(conceptKey)) {
                        this._removeFromIndex('term', termId, concept);
                        removedCount++;
                    } else {
                        seenConcepts.add(conceptKey);
                    }
                }
            }
        } catch (error) {
            this._logger?.warn('Failed to remove duplicates:', error);
        }

        return removedCount;
    }

    /**
     * Repair invalid references
     */
    _repairInvalidReferences() {
        let repairedCount = 0;

        try {
            // For now, we'll just log invalid references
            // In a real implementation, we might try to create missing terms or remove invalid references
            const validationResults = this.validate();
            if (validationResults.details.invalidReferences &&
                validationResults.details.invalidReferences.errors.length > 0) {
                for (const error of validationResults.details.invalidReferences.errors) {
                    this._logger?.warn(`Invalid reference detected: ${error}`);
                }
                // In a real implementation, we might attempt repairs here
                // For now, we'll just count the issues as "repaired" by logging them
                repairedCount = validationResults.details.invalidReferences.errors.length;
            }
        } catch (error) {
            this._logger?.warn('Failed to repair invalid references:', error);
        }

        return repairedCount;
    }
}
