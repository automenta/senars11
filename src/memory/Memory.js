import {Concept} from './Concept.js';
import {MemoryIndex} from './MemoryIndex.js';
import {MemoryConsolidation} from './MemoryConsolidation.js';
import {Bag} from './Bag.js';
import {BaseComponent} from '../util/BaseComponent.js';
import {MemoryValidator} from '../util/MemoryValidator.js';
import {IntrospectionEvents} from '../util/IntrospectionEvents.js';
import {Statistics} from '../util/Statistics.js';
import {MemoryScorer} from './MemoryScorer.js';

export class Memory extends BaseComponent {
    static CONSOLIDATION_THRESHOLDS = Object.freeze({
        activationThreshold: 0.1,
        minTasksThreshold: 5,
        decayThreshold: 0.01,
        minTasksForDecay: 2
    });

    constructor(config = {}) {
        const defaultConfig = Object.freeze({
            priorityThreshold: 0.5,
            priorityDecayRate: 0.01,
            consolidationInterval: 10,
            maxConcepts: 1000,
            maxTasksPerConcept: 100,
            forgetPolicy: 'priority',
            resourceBudget: 10000,
            activationDecayRate: 0.005,
            memoryPressureThreshold: 0.8,
            enableAdaptiveForgetting: true,
            enableMemoryValidation: config.enableMemoryValidation !== false,
            memoryValidationInterval: config.memoryValidationInterval || 30000,
        });

        super({...defaultConfig, ...config}, 'Memory');
        this._config = {...this.config, ...config};

        this._concepts = new Map();
        this._conceptBag = new Bag(this._config.maxConcepts, this._config.forgetPolicy);
        this._focusConcepts = new Set();
        this._index = new MemoryIndex();
        this._consolidation = new MemoryConsolidation();

        this._memoryValidator = this._config.enableMemoryValidation
            ? new MemoryValidator({
                enableChecksums: true,
                validationInterval: this._config.memoryValidationInterval
            })
            : null;

        this._stats = {
            totalConcepts: 0,
            totalTasks: 0,
            focusConceptsCount: 0,
            createdAt: Date.now(),
            lastConsolidation: Date.now(),
            conceptsForgotten: 0,
            tasksForgotten: 0,
            totalResourceUsage: 0,
            peakResourceUsage: 0,
            memoryPressureEvents: 0,
            memoryCorruptionEvents: 0,
            validationFailures: 0
        };
        this._cyclesSinceConsolidation = 0;
        this._resourceTracker = new Map();
        this._lastConsolidationTime = Date.now();
    }

    static get SCORING_WEIGHTS() {
        return MemoryScorer.SCORING_WEIGHTS;
    }

    static get NORMALIZATION_LIMITS() {
        return MemoryScorer.NORMALIZATION_LIMITS;
    }

    get config() {
        return {...this._config};
    }

    get concepts() {
        return new Map(this._concepts);
    }

    get focusConcepts() {
        return new Set(this._focusConcepts);
    }

    get stats() {
        return {...this._stats};
    }

    getConfigValue(key, defaultVal) {
        return this._config[key] !== undefined ? this._config[key] : defaultVal;
    }

    addTask(task, currentTime = Date.now()) {
        if (!task?.term) return false;

        const term = task.term;
        let concept = this.getConcept(term) || this._createConcept(term);

        if (concept && concept.totalTasks >= this._config.maxTasksPerConcept) {
            concept.enforceCapacity(this._config.maxTasksPerConcept, this._config.forgetPolicy);
        }

        const added = concept.addTask(task);
        if (added) {
            this._emitIntrospectionEvent(IntrospectionEvents.MEMORY_TASK_ADDED, {task: task.serialize()});
            this._stats.totalTasks++;
            this._updateResourceUsage(concept, 1);

            if (task.budget.priority >= this._config.priorityThreshold) {
                this._focusConcepts.add(concept);
                this._updateFocusConceptsCount();
            }

            if (this._config.enableAdaptiveForgetting && this._isUnderMemoryPressure()) {
                this._applyAdaptiveForgetting();
            }
        }
        return added;
    }

    _createConcept(term) {
        if (this._stats.totalConcepts >= this._config.maxConcepts) {
            this._applyConceptForgetting();
        }

        const concept = new Concept(term, this._config);
        this._concepts.set(term, concept);
        this._index.addConcept(concept);
        this._stats.totalConcepts++;
        this._emitIntrospectionEvent(IntrospectionEvents.MEMORY_CONCEPT_CREATED, {concept: concept.serialize()});
        return concept;
    }

    getConcept(term) {
        if (!term) return null;

        const concept = this._concepts.get(term) || this._findConceptByEquality(term);

        if (concept) {
            this._emitIntrospectionEvent(IntrospectionEvents.MEMORY_CONCEPT_ACCESSED, {concept: concept.serialize()});
        }

        return concept;
    }

    _applyConceptForgetting() {
        const strategies = {
            priority: () => this._forgetByCriteria(c => c.activation ?? 0.1, (a, b) => a < b),
            lru: () => this._forgetByCriteria(c => c.lastAccessed, (a, b) => a < b),
            fifo: () => {
                const first = this._concepts.keys().next().value;
                if (first) {
                    this.removeConcept(first);
                    this._stats.conceptsForgotten++;
                }
            }
        };

        const strategy = strategies[this._config.forgetPolicy] || strategies.priority;
        strategy();
    }

    _forgetByCriteria(metricFn, compareFn) {
        let targetTerm = null;
        let targetVal = null;

        for (const [term, concept] of this._concepts) {
            const val = metricFn(concept);
            if (targetVal === null || compareFn(val, targetVal)) {
                targetVal = val;
                targetTerm = term;
            }
        }

        if (targetTerm) {
            this.removeConcept(targetTerm);
            this._stats.conceptsForgotten++;
        }
    }

    removeConcept(term) {
        const concept = this._concepts.get(term);
        if (!concept) return false;

        if (this._focusConcepts.has(concept)) {
            this._focusConcepts.delete(concept);
            this._updateFocusConceptsCount();
        }
        this._concepts.delete(term);
        this._index.removeConcept(concept);
        this._stats.totalConcepts--;
        this._stats.totalTasks -= concept.totalTasks;

        return true;
    }

    _findConceptByEquality(term) {
        for (const [key, value] of this._concepts) {
            if (key.equals(term)) return value;
        }
        return null;
    }

    getAllConcepts() {
        return Array.from(this._concepts.values());
    }

    getConceptsByCriteria(criteria = {}) {
        return this.getAllConcepts().filter(c => this._conceptMatchesCriteria(c, criteria));
    }

    _conceptMatchesCriteria(concept, criteria) {
        return [
            () => criteria.minActivation === undefined || concept.activation >= criteria.minActivation,
            () => criteria.minTasks === undefined || concept.totalTasks >= criteria.minTasks,
            () => !criteria.taskType || concept.getTasksByType(criteria.taskType).length > 0,
            () => criteria.onlyFocus !== true || this._focusConcepts.has(concept)
        ].every(check => check());
    }

    getMostActiveConcepts(limit = 10, scoringType = 'standard') {
        const options = scoringType === 'composite' ? {
            activationWeight: 0.3,
            useCountWeight: 0.2,
            taskCountWeight: 0.2,
            qualityWeight: 0.15,
            complexityWeight: 0.15,
            diversityWeight: 0.1
        } : Memory.SCORING_WEIGHTS;

        return this._getMostActiveConceptsByScoring(
            limit,
            options,
            Memory.NORMALIZATION_LIMITS,
            scoringType
        );
    }

    _getMostActiveConceptsByScoring(limit, weights, limits, type, options = {}) {
        const concepts = this.getAllConcepts();
        const scoredConcepts = concepts.map(concept => {
            const score = MemoryScorer.calculateDetailedConceptScore(concept, {...weights, ...options}).compositeScore;
            return {concept, score};
        });

        scoredConcepts.sort((a, b) => b.score - a.score);
        return scoredConcepts.slice(0, limit).map(sc => sc.concept);
    }

    getConceptsByCompositeScoring({limit = 10, minScore = 0, scoringOptions = {}, sortBy = 'composite'} = {}) {
        const concepts = this.getAllConcepts();

        return concepts
            .map(concept => ({concept, score: MemoryScorer.calculateDetailedConceptScore(concept, scoringOptions)}))
            .filter(item => item.score.compositeScore >= minScore)
            .sort((a, b) => MemoryScorer.getSorterFunction(sortBy)(a, b))
            .slice(0, limit)
            .map(item => item.concept);
    }

    consolidate(currentTime = Date.now()) {
        if (this._cyclesSinceConsolidation++ < this._config.consolidationInterval) return;

        this._cyclesSinceConsolidation = 0;
        this._stats.lastConsolidation = currentTime;
        this._lastConsolidationTime = currentTime;

        this._emitIntrospectionEvent(IntrospectionEvents.MEMORY_CONSOLIDATION_START, {timestamp: currentTime});

        const results = this._consolidation.consolidate(this, currentTime);
        this.applyActivationDecay();
        this._cleanupResourceTracker();
        this._updateFocusConceptsCount();

        this._emitIntrospectionEvent(IntrospectionEvents.MEMORY_CONSOLIDATION_END, {timestamp: Date.now(), results});

        return results;
    }

    boostConceptActivation(term, boostAmount = 0.1) {
        const concept = this._concepts.get(term);
        if (concept) {
            concept.boostActivation(boostAmount);
            if (!this._focusConcepts.has(concept)) {
                this._focusConcepts.add(concept);
                this._updateFocusConceptsCount();
            }
        }
    }

    updateConceptQuality(term, qualityChange) {
        this._concepts.get(term)?.updateQuality(qualityChange);
    }

    getDetailedStats() {
        const conceptStats = this.getAllConcepts().map(c => c.getStats());
        const hasConcepts = conceptStats.length > 0;

        const stats = hasConcepts ? this._calculateConceptStatistics(conceptStats) : this._getDefaultStats();

        return {
            ...this._stats,
            conceptStats,
            memoryUsage: {
                concepts: this._concepts.size,
                focusConcepts: this._focusConcepts.size,
                totalTasks: this._stats.totalTasks
            },
            indexStats: this._index.getStats(),
            oldestConcept: hasConcepts ? Math.min(...conceptStats.map(s => s.createdAt)) : null,
            newestConcept: hasConcepts ? Math.max(...conceptStats.map(s => s.createdAt)) : null,
            ...stats,
            conceptCount: hasConcepts ? conceptStats.length : 0
        };
    }

    _getDefaultStats() {
        return {
            averageActivation: 0,
            averageQuality: 0,
            activationStd: 0,
            qualityStd: 0,
            activationMedian: 0,
            qualityMedian: 0
        };
    }

    _calculateConceptStatistics(conceptStats) {
        const activations = conceptStats.map(s => s.activation);
        const qualities = conceptStats.map(s => s.quality);

        return {
            averageActivation: Statistics.mean(activations),
            averageQuality: Statistics.mean(qualities),
            activationStd: Statistics.stdDev(activations),
            qualityStd: Statistics.stdDev(qualities),
            activationMedian: Statistics.median(activations),
            qualityMedian: Statistics.median(qualities)
        };
    }

    getHealthMetrics() {
        return this._consolidation.calculateHealthMetrics(this);
    }

    _updateFocusConceptsCount() {
        this._stats.focusConceptsCount = this._focusConcepts.size;
    }

    clear() {
        this._concepts.clear();
        this._focusConcepts.clear();
        this._index.clear();
        this._stats = {
            totalConcepts: 0,
            totalTasks: 0,
            focusConceptsCount: 0,
            createdAt: Date.now(),
            lastConsolidation: Date.now()
        };
        this._cyclesSinceConsolidation = 0;
    }

    hasConcept(term) {
        return this._concepts.has(term);
    }

    getTotalTaskCount() {
        return this._stats.totalTasks;
    }

    getConceptsWithBeliefs(pattern) {
        return this.getAllConcepts().filter(concept =>
            concept.getTasksByType('BELIEF').some(task => task.term.equals(pattern))
        );
    }

    _updateResourceUsage(concept, change) {
        const conceptKey = concept.term.toString();
        const currentUsage = this._resourceTracker.get(conceptKey) || 0;
        const newUsage = Math.max(0, currentUsage + change);

        this._resourceTracker.set(conceptKey, newUsage);
        this._stats.totalResourceUsage += change;

        if (this._stats.totalResourceUsage > this._stats.peakResourceUsage) {
            this._stats.peakResourceUsage = this._stats.totalResourceUsage;
        }
    }

    _isUnderMemoryPressure() {
        const conceptPressure = this._stats.totalConcepts / this._config.maxConcepts;
        const resourcePressure = this._stats.totalResourceUsage / this._config.resourceBudget;
        const taskPressure = this._stats.totalTasks / (this._config.maxConcepts * this._config.maxTasksPerConcept);

        return Math.max(conceptPressure, resourcePressure, taskPressure) >= this._config.memoryPressureThreshold;
    }

    _applyAdaptiveForgetting() {
        this._stats.memoryPressureEvents++;

        const conceptsToForget = Math.min(
            Math.floor(this._stats.totalConcepts * 0.1),
            5
        );

        Array.from({length: conceptsToForget}, () => this._applyConceptForgetting());
    }

    getMemoryPressureStats() {
        const totalPossibleTasks = this._config.maxConcepts * this._config.maxTasksPerConcept;
        return {
            conceptPressure: this._stats.totalConcepts / this._config.maxConcepts,
            taskPressure: this._stats.totalTasks / totalPossibleTasks,
            resourcePressure: this._stats.totalResourceUsage / this._config.resourceBudget,
            memoryPressureEvents: this._stats.memoryPressureEvents,
            isUnderPressure: this._isUnderMemoryPressure(),
            resourceBudget: this._config.resourceBudget,
            currentResourceUsage: this._stats.totalResourceUsage,
            peakResourceUsage: this._stats.peakResourceUsage
        };
    }

    applyActivationDecay() {
        const decayRate = this._config.activationDecayRate;
        for (const concept of this._concepts.values()) {
            concept.applyDecay(decayRate);
        }
    }

    getConceptsByResourceUsage(ascending = false) {
        const concepts = Array.from(this._concepts.entries()).map(([term, concept]) => ({
            term,
            concept,
            resourceUsage: this._resourceTracker.get(term.toString()) || 0
        }));

        concepts.sort((a, b) => ascending ? a.resourceUsage - b.resourceUsage : b.resourceUsage - a.resourceUsage);
        return concepts;
    }

    _cleanupResourceTracker() {
        for (const [termStr, usage] of this._resourceTracker.entries()) {
            if (!this._conceptExistsWithTerm(termStr)) {
                this._resourceTracker.delete(termStr);
                this._stats.totalResourceUsage -= usage;
            }
        }
    }

    _conceptExistsWithTerm(termStr) {
        for (const key of this._concepts.keys()) {
            if (key.toString() === termStr) return true;
        }
        return false;
    }

    validateMemory() {
        if (!this._memoryValidator) {
            return {valid: true, message: 'Memory validation is disabled'};
        }

        const validations = this._getValidationTargets();
        const results = this._memoryValidator.validateBatch(validations);
        const invalidResults = results.filter(result => !result.result.valid);

        if (invalidResults.length > 0) {
            return this._handleValidationFailures(invalidResults, results.length);
        }

        return {valid: true, message: 'Memory validation passed'};
    }

    _getValidationTargets() {
        return [
            ...Array.from(this._concepts).map(([term, concept]) => [`concept_${term.toString()}`, concept]),
            ['memory_index', this._index],
            ['memory_stats', this._stats]
        ];
    }

    _handleValidationFailures(invalidResults, totalChecked) {
        this._stats.memoryCorruptionEvents++;
        this._stats.validationFailures += invalidResults.length;

        this.logger.warn('Memory corruption detected', {
            invalidCount: invalidResults.length,
            totalChecked,
            details: invalidResults.map(r => ({
                key: r.key,
                message: r.result.message
            }))
        });

        return {
            valid: false,
            message: `Memory corruption detected in ${invalidResults.length} structures`,
            details: invalidResults
        };
    }

    updateMemoryChecksum(key, obj) {
        return this._memoryValidator ? this._memoryValidator.updateChecksum(key, obj) : null;
    }

    getMemoryValidationStats() {
        if (!this._memoryValidator) {
            return {validationEnabled: false};
        }

        return {
            validationEnabled: true,
            validationStats: this._stats,
            checksumCount: this._memoryValidator.getChecksums().size
        };
    }

    enableMemoryValidation() {
        if (!this._memoryValidator) {
            this._memoryValidator = new MemoryValidator({
                enableChecksums: true,
                validationInterval: this._config.memoryValidationInterval
            });
        }
        this._memoryValidator.enable();
    }

    disableMemoryValidation() {
        if (this._memoryValidator) {
            this._memoryValidator.disable();
        }
    }

    serialize() {
        const conceptsData = Array.from(this._concepts).map(([term, concept]) => ({
            term: term.serialize ? term.serialize() : term.toString(),
            concept: concept.serialize ? concept.serialize() : null
        }));

        return {
            config: this._config,
            concepts: conceptsData,
            focusConcepts: Array.from(this._focusConcepts).map(c => c.term.toString()),
            index: this._index.serialize ? this._index.serialize() : null,
            stats: this._stats,
            resourceTracker: Object.fromEntries(this._resourceTracker),
            cyclesSinceConsolidation: this._cyclesSinceConsolidation,
            lastConsolidationTime: this._lastConsolidationTime,
            version: '1.0.0'
        };
    }

    async deserialize(data) {
        try {
            if (!data || !data.concepts) {
                throw new Error('Invalid memory data for deserialization');
            }

            this.clear();

            if (data.config) {
                this._config = {...this._config, ...data.config};
            }

            for (const conceptData of data.concepts) {
                if (conceptData.concept) {
                    const term = typeof conceptData.term === 'string' ?
                        {
                            toString: () => conceptData.term,
                            equals: (other) => other.toString && other.toString() === conceptData.term
                        } :
                        conceptData.term;

                    const concept = new Concept(term, this._config);
                    if (concept.deserialize) {
                        await concept.deserialize(conceptData.concept);
                    }

                    this._concepts.set(term, concept);
                    this._stats.totalConcepts++;
                    this._stats.totalTasks += concept.totalTasks || 0;
                    this._index.addConcept(concept);
                }
            }

            if (data.focusConcepts) {
                for (const termStr of data.focusConcepts) {
                    const concept = this._concepts.get({
                        toString: () => termStr,
                        equals: (other) => other.toString && other.toString() === termStr
                    });
                    if (concept) {
                        this._focusConcepts.add(concept);
                    }
                }
                this._updateFocusConceptsCount();
            }

            if (data.index && this._index.deserialize) {
                await this._index.deserialize(data.index);
            }

            if (data.stats) {
                this._stats = {...data.stats};
            }

            if (data.resourceTracker) {
                this._resourceTracker = new Map(Object.entries(data.resourceTracker));
            }

            this._cyclesSinceConsolidation = data.cyclesSinceConsolidation || 0;
            this._lastConsolidationTime = data.lastConsolidationTime || Date.now();

            return true;
        } catch (error) {
            this.logger.error('Error during memory deserialization:', error);
            return false;
        }
    }
}
