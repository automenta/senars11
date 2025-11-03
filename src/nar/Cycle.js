import {BaseComponent} from '../util/BaseComponent.js';
import {EvaluationEngine} from '../reasoning/EvaluationEngine.js';
import {IntrospectionEvents} from '../util/IntrospectionEvents.js';

const DEFAULT_FOCUS_TASK_LIMIT = 10;

export class Cycle extends BaseComponent {
    constructor({memory, focus, ruleEngine, taskManager, evaluator, config, reasoningStrategy, termFactory, nar}) {
        super(config, 'Cycle');
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
        
        // Enhanced cycle start event with more details
        this._emitIntrospectionEvent(IntrospectionEvents.CYCLE_START, {
            cycle: this._cycleCount,
            timestamp: cycleStartTime,
            memorySize: this._memory.getConceptCount?.() || 0,
            focusSize: this._focus.getTaskCount?.() || 0,
            taskManagerQueue: this._taskManager.getPendingTaskCount?.() || 0
        });

        try {
            // Process pending tasks and consolidate memory
            this._taskManager.processPendingTasks(cycleStartTime);
            
            // Emit memory consolidation event
            this._emitIntrospectionEvent(IntrospectionEvents.MEMORY_CONSOLIDATION_END, {
                cycle: this._cycleCount,
                timestamp: cycleStartTime,
                memorySize: this._memory.getConceptCount?.() || 0
            });

            // Get and filter tasks
            const allTasks = await this._getFilteredTasks();
            
            // Emit event about task processing
            this._eventBus?.emit('task.processing.start', {
                cycle: this._cycleCount,
                taskCount: allTasks.length,
                timestamp: Date.now()
            });

            // Execute reasoning strategy with enhanced event emission
            const newInferences = await this._reasoningStrategy.execute(
                this._memory,
                this._ruleEngine.rules,
                this._termFactory,
                allTasks
            );

            // Emit event about reasoning strategy execution
            this._eventBus?.emit('reasoning.strategy.executed', {
                cycle: this._cycleCount,
                taskCount: allTasks.length,
                inferenceCount: newInferences.length,
                timestamp: Date.now()
            });

            // Process and apply budget constraints to inferences
            const processedInferences = await this._processInferencesWithEvaluator(newInferences);
            const budgetedInferences = this._applyBudgetConstraints(processedInferences);

            // Emit detailed step event
            this._emitIntrospectionEvent(IntrospectionEvents.CYCLE_STEP, {
                cycle: this._cycleCount,
                step: 'inferences_processed',
                inferenceCount: budgetedInferences.length,
                processedTaskCount: allTasks.length,
                duration: Date.now() - cycleStartTime
            });

            // Emit detailed inference generation event
            this._eventBus?.emit('inferences.generated', {
                cycle: this._cycleCount,
                timestamp: Date.now(),
                inferenceCount: budgetedInferences.length,
                processedTaskCount: allTasks.length,
                duration: Date.now() - cycleStartTime
            });

            // Update memory and stats
            this._updateMemoryWithInferences(budgetedInferences, cycleStartTime);
            this._updateCycleStats(cycleStartTime);

            // Create and return detailed result
            const result = this._createCycleResult(budgetedInferences.length, cycleStartTime);
            
            // Emit comprehensive cycle completion event
            this._eventBus?.emit('cycle.completed', {
                cycle: this._cycleCount,
                duration: Date.now() - cycleStartTime,
                timestamp: Date.now(),
                inferenceCount: budgetedInferences.length,
                processedTaskCount: allTasks.length,
                newInferences: budgetedInferences.length,
                memoryStats: this._memory.getDetailedStats(),
                focusStats: {taskCount: this._focus.getTaskCount?.() || 0},
                isComplete: true,
                success: true
            });

            return result;

        } catch (error) {
            this.logger.error('Error in reasoning cycle:', error);
            
            // Emit detailed error event for observability
            this._eventBus?.emit('cycle.error', {
                error: error.message,
                cycle: this._cycleCount,
                timestamp: Date.now(),
                stack: error.stack,
                duration: Date.now() - cycleStartTime,
                isComplete: true,
                success: false
            });
            
            throw error;
        } finally {
            const cycleEndTime = Date.now();
            
            // Enhanced cycle end event with duration
            this._emitIntrospectionEvent(IntrospectionEvents.CYCLE_END, {
                cycle: this._cycleCount, 
                duration: cycleEndTime - cycleStartTime,
                timestamp: cycleEndTime
            });
            
            this._isRunning = false;
        }
    }

    async _getFilteredTasks() {
        const focusTasks = this._focus.getTasks(this._config.focusTaskLimit || DEFAULT_FOCUS_TASK_LIMIT);
        const allConcepts = this._memory.getAllConcepts();
        const memoryTasks = allConcepts.flatMap(c => c.getAllTasks ? c.getAllTasks() : []);

        const filteredTasks = this._filterTasksByBudget([...focusTasks, ...memoryTasks]);
        const taskMap = new Map();
        filteredTasks.forEach(task => taskMap.set(task.stamp.id, task));
        let allTasks = Array.from(taskMap.values());

        if (this._nar?.termLayer) {
            allTasks = await this._enhanceTasksWithAssociativeLinks(allTasks, this._nar.termLayer);
        }

        return allTasks;
    }

    _createCycleResult(inferenceCount, cycleStartTime) {
        return {
            cycleNumber: this._cycleCount,
            newInferences: inferenceCount,
            cycleTime: Date.now() - cycleStartTime,
            memoryStats: this._memory.getDetailedStats()
        };
    }

    async _processInferencesWithEvaluator(inferences) {
        const processed = [];

        for (const inference of inferences) {
            try {
                processed.push(await this._processInference(inference));
            } catch (error) {
                this.logger.warn(`Evaluation failed for inference, keeping original:`, error.message);
                processed.push(inference);
            }
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
        return tasks.filter(task => {
            if (!task.budget) return true;

            const {cycles, depth} = task.budget;
            return (cycles === undefined || cycles > 0) && (depth === undefined || depth > 0);
        });
    }

    _applyBudgetConstraints(inferences) {
        return inferences.map(inference => {
            if (!inference.budget) return inference;

            const newCycles = Math.max(0, (inference.budget.cycles ?? 0) - 1);
            const newDepth = Math.max(0, (inference.budget.depth ?? 0) - 1);

            const newBudget = {
                ...inference.budget,
                cycles: newCycles,
                depth: newDepth
            };

            return inference.clone({budget: newBudget});
        });
    }

    async _enhanceTasksWithAssociativeLinks(tasks, termLayer) {
        if (!tasks?.length || !termLayer) return tasks;

        const enhancedTasks = new Set(tasks);

        for (const task of tasks) {
            const associatedTerms = termLayer.get(task.term);

            for (const assoc of associatedTerms) {
                if (assoc.target?.name) {
                    const concept = this._memory.getConcept(this._termFactory.create(assoc.target.name));
                    if (concept?.getAllTasks) {
                        concept.getAllTasks().forEach(t => enhancedTasks.add(t));
                    }
                }
            }
        }

        return Array.from(enhancedTasks);
    }

    _updateMemoryWithInferences(inferences, currentTime) {
        for (const inference of inferences) {
            this._memory.addTask(inference, currentTime);
            this._stats.totalTasksProcessed++;

            if (inference.priority >= this._config.priorityThreshold) {
                this._focus.addTaskToFocus(inference, inference.priority);
            }
        }
    }

    _updateCycleStats(cycleStartTime) {
        this._cycleCount++;
        this._stats.totalCycles++;
        const cycleTime = Date.now() - cycleStartTime;
        this._stats.averageCycleTime = this._stats.averageCycleTime === 0
            ? cycleTime
            : this._stats.averageCycleTime * 0.9 + cycleTime * 0.1;
    }

    reset() {
        this._cycleCount = 0;
        this._isRunning = false;
        this._stats = this._initStats();
    }

    _initStats() {
        return {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            createdAt: Date.now()
        };
    }

    serialize() {
        return {
            cycleCount: this._cycleCount,
            isRunning: this._isRunning,
            stats: this._stats,
            config: this._config,
            version: '1.0.0'
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
}
