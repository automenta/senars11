import {BaseComponent} from '../util/BaseComponent.js';
import {EvaluationEngine} from '../reason/EvaluationEngine.js';
import {IntrospectionEvents} from '../util/IntrospectionEvents.js';

const DEFAULT_FOCUS_TASK_LIMIT = 10;

export class OptimizedCycle extends BaseComponent {
    constructor({memory, focus, ruleEngine, taskManager, evaluator, config, reasoningStrategy, termFactory, nar}) {
        super(config, 'OptimizedCycle');
        this._memory = memory;
        this._focus = focus;
        this._ruleEngine = ruleEngine;
        this._taskManager = taskManager;
        this._evaluator = evaluator || new EvaluationEngine();
        this._config = config;
        this._reasoningStrategy = reasoningStrategy;
        this._termFactory = termFactory;
        this._nar = nar;

        this._cycleCount = 0;
        this._isRunning = false;
        this._stats = this._initStats();

        // Performance optimizations for Phase 5+
        this._taskCache = new Map();
        this._inferenceCache = new Map();
        this._maxTaskCacheSize = config.maxTaskCacheSize || 10000;
        this._maxInferenceCacheSize = config.maxInferenceCacheSize || 5000;
        this._batchProcessingEnabled = config.batchProcessingEnabled !== false;
        this._maxBatchSize = config.maxBatchSize || 100;

        // Performance monitoring for optimization
        this._performanceLog = [];
        this._maxPerformanceLogSize = 1000;
    }

    get evaluator() {
        return this._evaluator;
    }

    get cycleCount() {
        return this._cycleCount;
    }

    get isRunning() {
        return this._isRunning;
    }

    get stats() {
        return {...this._stats};
    }

    async execute() {
        const cycleStartTime = Date.now();
        this._isRunning = true;
        this._emitIntrospectionEvent(IntrospectionEvents.CYCLE_START, {cycle: this._cycleCount});
        let performanceEntry;

        try {
            performanceEntry = this._startPerformanceTracking(cycleStartTime);

            // Process pending tasks and consolidate memory (batch optimized)
            if (this._batchProcessingEnabled) {
                await this._processBatchedTasks(cycleStartTime);
            } else {
                this._taskManager.processPendingTasks(cycleStartTime);
                this._memory.consolidate(cycleStartTime);
            }

            // Get and filter tasks with caching
            const allTasks = await this._getFilteredTasks();
            this._updateTaskCache(allTasks);

            // Execute reasoning strategy with optimized processing
            const newInferences = await this._reasoningStrategy.execute(
                this._memory,
                this._ruleEngine.rules,
                this._termFactory,
                allTasks
            );

            // Process and apply budget constraints to inferences with batch optimization
            const processedInferences = await this._processInferencesWithEvaluator(newInferences);
            const budgetedInferences = this._applyBudgetConstraints(processedInferences);

            this._emitIntrospectionEvent(IntrospectionEvents.CYCLE_STEP, {
                cycle: this._cycleCount,
                step: 'inferences_processed',
                inferenceCount: budgetedInferences.length
            });

            // Update memory and stats
            this._updateMemoryWithInferences(budgetedInferences, cycleStartTime);
            this._updateCycleStats(cycleStartTime, performanceEntry);

            return this._createCycleResult(budgetedInferences.length, cycleStartTime, performanceEntry);

        } catch (error) {
            this.logger.error('Error in reasoning cycle:', error);
            throw error;
        } finally {
            this._isRunning = false;
            this._emitIntrospectionEvent(IntrospectionEvents.CYCLE_END, {cycle: this._cycleCount});
            this._endPerformanceTracking(performanceEntry);
        }
    }

    async _processBatchedTasks(cycleStartTime) {
        // Process tasks in batches for better performance
        const pendingTasks = this._taskManager.getPendingTasks();

        for (let i = 0; i < pendingTasks.length; i += this._maxBatchSize) {
            const batch = pendingTasks.slice(i, i + this._maxBatchSize);
            this._processTaskBatch(batch, cycleStartTime);
        }

        this._memory.consolidate(cycleStartTime);
    }

    _processTaskBatch(batch, cycleStartTime) {
        for (const task of batch) {
            this._memory.addTask(task, cycleStartTime);
        }
    }

    async _getFilteredTasks() {
        // Use cached tasks if available and still valid
        const cacheKey = this._taskCache.get('cacheKey');
        const lastTaskUpdate = this._taskManager.getLastUpdateTime?.() || 0;
        const lastMemoryUpdate = this._memory.getLastUpdateTime?.() || 0;

        if (cacheKey && cacheKey.timestamp > Math.max(lastTaskUpdate, lastMemoryUpdate)) {
            return cacheKey.tasks;
        }

        const focusTasks = this._focus.getTasks(this._config.focusTaskLimit || DEFAULT_FOCUS_TASK_LIMIT);
        const allConcepts = this._memory.getAllConcepts();
        const memoryTasks = [];

        // Optimized task collection from all concepts
        for (const concept of allConcepts) {
            if (concept.getAllTasks) {
                const conceptTasks = concept.getAllTasks();
                memoryTasks.push(...conceptTasks);
            }
        }

        const filteredTasks = this._filterTasksByBudget([...focusTasks, ...memoryTasks]);
        const taskMap = new Map();
        filteredTasks.forEach(task => taskMap.set(task.stamp?.id || task.id || Date.now() + Math.random(), task));
        let allTasks = Array.from(taskMap.values());

        if (this._nar?.termLayer) {
            allTasks = await this._enhanceTasksWithAssociativeLinks(allTasks, this._nar.termLayer);
        }

        // Cache the results
        this._updateTaskCache(allTasks);

        return allTasks;
    }

    _updateTaskCache(tasks) {
        // Update the task cache with a time-based invalidation
        this._taskCache.set('cacheKey', {
            tasks,
            timestamp: Date.now()
        });

        // Limit cache size to prevent memory issues
        if (this._taskCache.size > this._maxTaskCacheSize) {
            const keys = Array.from(this._taskCache.keys());
            for (let i = 0; i < keys.length / 2; i++) {
                this._taskCache.delete(keys[i]);
            }
        }
    }

    _createCycleResult(inferenceCount, cycleStartTime, performanceEntry) {
        return {
            cycleNumber: this._cycleCount,
            newInferences: inferenceCount,
            cycleTime: Date.now() - cycleStartTime,
            memoryStats: this._memory.getDetailedStats(),
            performance: performanceEntry ? {
                processingTime: performanceEntry.processingTime,
                evaluationTime: performanceEntry.evaluationTime,
                memoryUpdateTime: performanceEntry.memoryUpdateTime
            } : null
        };
    }

    async _processInferencesWithEvaluator(inferences) {
        const processed = [];
        const evaluationStartTime = Date.now();

        // Use cached evaluations when possible
        for (const inference of inferences) {
            const cacheKey = `${inference.term.toString()}_${inference.stamp?.id || Date.now()}`;
            let cachedResult = this._inferenceCache.get(cacheKey);

            if (!cachedResult) {
                try {
                    const result = await this._processInference(inference);
                    cachedResult = result;
                    this._inferenceCache.set(cacheKey, result);

                    // Limit cache size
                    if (this._inferenceCache.size > this._maxInferenceCacheSize) {
                        const firstKey = this._inferenceCache.keys().next().value;
                        this._inferenceCache.delete(firstKey);
                    }
                } catch (error) {
                    this.logger.warn(`Evaluation failed for inference, keeping original:`, error.message);
                    cachedResult = inference;
                }
            }

            processed.push(cachedResult);
        }

        return processed;
    }

    async _processInference(inference) {
        return inference.term.operator === '^'
            ? await this._processOperationTerm(inference)
            : this._processNALTerm(inference);
    }

    async _processOperationTerm(inference) {
        const evaluationResult = await this._evaluator.evaluate(inference.term, this._nar, new Map());
        return evaluationResult.success && evaluationResult.result
            ? inference.clone({term: evaluationResult.result})
            : inference;
    }

    _processNALTerm(inference) {
        const reducedTerm = this._evaluator.reduce(inference.term);
        return inference.clone({term: reducedTerm});
    }

    _filterTasksByBudget(tasks) {
        if (!Array.isArray(tasks)) return [];

        // Optimized filtering with early return
        return tasks.filter(task => {
            if (!task?.budget) return true;

            const {cycles, depth} = task.budget;
            const cyclesValid = cycles === undefined || cycles > 0;
            const depthValid = depth === undefined || depth > 0;

            return cyclesValid && depthValid;
        });
    }

    _applyBudgetConstraints(inferences) {
        if (!Array.isArray(inferences)) return [];

        return inferences.map(inference => {
            if (!inference?.budget) return inference;

            const {cycles, depth} = inference.budget;
            const newCycles = cycles !== undefined ? Math.max(0, cycles - 1) : undefined;
            const newDepth = depth !== undefined ? Math.max(0, depth - 1) : undefined;

            const newBudget = {
                ...inference.budget,
                ...(newCycles !== undefined && {cycles: newCycles}),
                ...(newDepth !== undefined && {depth: newDepth})
            };

            return inference.clone({budget: newBudget});
        });
    }

    async _enhanceTasksWithAssociativeLinks(tasks, termLayer) {
        if (!tasks?.length || !termLayer) return tasks;

        const enhancedTasks = new Set(tasks);

        // Use batch processing for associative links
        for (const task of tasks) {
            const associatedTerms = termLayer.get(task.term);

            if (associatedTerms && associatedTerms.length) {
                for (const assoc of associatedTerms) {
                    if (assoc.target?.name) {
                        const concept = this._memory.getConcept(this._termFactory.create(assoc.target.name));
                        if (concept?.getAllTasks) {
                            const conceptTasks = concept.getAllTasks();
                            for (const t of conceptTasks) {
                                enhancedTasks.add(t);
                            }
                        }
                    }
                }
            }
        }

        return Array.from(enhancedTasks);
    }

    _updateMemoryWithInferences(inferences, currentTime) {
        const updateStartTime = Date.now();

        for (const inference of inferences) {
            this._memory.addTask(inference, currentTime);
            this._stats.totalTasksProcessed++;

            if (inference.priority >= this._config.priorityThreshold) {
                this._focus.addTaskToFocus(inference, inference.priority);
            }
        }

        // Update performance tracking
        if (this._stats.memoryUpdateTime) {
            this._stats.memoryUpdateTime = (this._stats.memoryUpdateTime + (Date.now() - updateStartTime)) / 2;
        } else {
            this._stats.memoryUpdateTime = Date.now() - updateStartTime;
        }
    }

    _updateCycleStats(cycleStartTime, performanceEntry) {
        this._cycleCount++;
        this._stats.totalCycles++;

        const cycleTime = Date.now() - cycleStartTime;

        // Exponential moving average for performance metrics
        this._stats.averageCycleTime = this._stats.averageCycleTime === 0
            ? cycleTime
            : this._stats.averageCycleTime * 0.9 + cycleTime * 0.1;

        if (performanceEntry) {
            this._stats.averageProcessingTime = this._stats.averageProcessingTime === 0
                ? performanceEntry.processingTime
                : this._stats.averageProcessingTime * 0.9 + performanceEntry.processingTime * 0.1;
        }
    }

    _startPerformanceTracking(startTime) {
        return {
            startTime,
            processingTime: 0,
            evaluationTime: 0,
            memoryUpdateTime: 0
        };
    }

    _endPerformanceTracking(entry) {
        if (entry) {
            entry.processingTime = Date.now() - entry.startTime;

            // Add to performance log with size limiting
            this._performanceLog.push(entry);
            if (this._performanceLog.length > this._maxPerformanceLogSize) {
                this._performanceLog.shift();
            }
        }
    }

    reset() {
        this._cycleCount = 0;
        this._isRunning = false;
        this._stats = this._initStats();
        this._taskCache.clear();
        this._inferenceCache.clear();
        this._performanceLog = [];
    }

    _initStats() {
        return {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            averageProcessingTime: 0,
            memoryUpdateTime: 0,
            cacheHitRate: 0,
            createdAt: Date.now()
        };
    }

    serialize() {
        return {
            cycleCount: this._cycleCount,
            isRunning: this._isRunning,
            stats: this._stats,
            config: this._config,
            version: '2.0.0'
        };
    }

    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid cycle data for deserialization');
            }

            this._cycleCount = data.cycleCount || 0;
            this._isRunning = data.isRunning || false;
            this._stats = data.stats || this._initStats();
            this._config = data.config || this._config;

            return true;
        } catch (error) {
            console.error('Error during cycle deserialization:', error);
            return false;
        }
    }

    // Performance monitoring methods for Phase 5+
    getPerformanceMetrics() {
        return {
            cycleCount: this._cycleCount,
            averageCycleTime: this._stats.averageCycleTime,
            averageProcessingTime: this._stats.averageProcessingTime,
            memoryUpdateTime: this._stats.memoryUpdateTime,
            totalTasksProcessed: this._stats.totalTasksProcessed,
            totalCycles: this._stats.totalCycles,
            cacheSize: {
                taskCache: this._taskCache.size,
                inferenceCache: this._inferenceCache.size
            },
            performanceLogSize: this._performanceLog.length,
            cacheHitRate: this._stats.cacheHitRate
        };
    }

    // Get performance insights for optimization
    getPerformanceInsights() {
        if (this._performanceLog.length === 0) {
            return {message: 'No performance data available yet'};
        }

        const processingTimes = this._performanceLog.map(entry => entry.processingTime);
        const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
        const maxProcessingTime = Math.max(...processingTimes);
        const minProcessingTime = Math.min(...processingTimes);

        return {
            averageProcessingTime: avgProcessingTime,
            maxProcessingTime: maxProcessingTime,
            minProcessingTime: minProcessingTime,
            recentPerformanceTrend: this._analyzePerformanceTrend(),
            optimizationRecommendations: this._getOptimizationRecommendations()
        };
    }

    _analyzePerformanceTrend() {
        if (this._performanceLog.length < 10) {
            return 'Insufficient data for trend analysis';
        }

        const recent = this._performanceLog.slice(-10).map(e => e.processingTime);
        const older = this._performanceLog.slice(-20, -10).map(e => e.processingTime);

        if (recent.length === 0 || older.length === 0) return 'No data';

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (changePercent > 10) {
            return 'Performance degrading';
        } else if (changePercent < -10) {
            return 'Performance improving';
        } else {
            return 'Performance stable';
        }
    }

    _getOptimizationRecommendations() {
        const recommendations = [];

        if (this._stats.averageCycleTime > 100) {
            recommendations.push('Consider increasing batch sizes for task processing');
        }

        if (this._taskCache.size > this._maxTaskCacheSize * 0.8) {
            recommendations.push('Task cache approaching maximum size, consider increasing cache size or implementing LRU eviction');
        }

        return recommendations;
    }
}