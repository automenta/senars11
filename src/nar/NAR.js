import {NARBuilder} from './NARBuilder.js';
import {TermFactory} from '../term/TermFactory.js';
import {Memory} from '../memory/Memory.js';
import {TaskManager} from '../task/TaskManager.js';
import {Cycle} from './Cycle.js';
import {OptimizedCycle} from './OptimizedCycle.js';
import {NarseseParser} from '../parser/NarseseParser.js';
import {PRIORITY} from '../config/constants.js';
import {BaseComponent} from '../util/BaseComponent.js';
import {ComponentManager} from '../util/ComponentManager.js';
import {Focus} from '../memory/Focus.js';
import {LM} from '../lm/LM.js';
import {Task} from '../task/Task.js';
import {Truth} from '../Truth.js';
import {ToolIntegration} from '../tools/ToolIntegration.js';
import {ExplanationService} from '../tools/ExplanationService.js';
import {EvaluationEngine} from '../reason/EvaluationEngine.js';
import {MetricsMonitor} from '../reason/MetricsMonitor.js';
import {EmbeddingLayer} from '../lm/EmbeddingLayer.js';
import {TermLayer} from '../memory/TermLayer.js';
import {ReasoningAboutReasoning} from '../self/ReasoningAboutReasoning.js';
import {
    Reasoner as StreamReasoner,
    RuleExecutor as StreamRuleExecutor,
    RuleProcessor as StreamRuleProcessor,
    Strategy,
    TaskBagPremiseSource
} from '../reason/index.js';

export class NAR extends BaseComponent {
    constructor(config = {}) {
        super(config, 'NAR');
        this._config = NARBuilder.from(config);
        this._componentManager = new ComponentManager({}, this._eventBus, this);
        this._useStreamReasoner = true; // Always use stream reasoner
        this._initComponents(config);
        this._isRunning = false;
        this._cycleInterval = null;
        this._useOptimizedCycle = config.performance?.useOptimizedCycle !== false;
        this._startTime = Date.now();
        this._registerComponents();

        // Add debug mode for tracking pipeline
        this._debugMode = config.debug?.pipeline || false;

        this._initStreamReasoner();

        if (this._config.get('components')) {
            this._componentManager.loadComponentsFromConfig(this._config.get('components'));
        }
    }

    get config() {
        return this._config;
    }

    get memory() {
        return this._memory;
    }

    get isRunning() {
        return this._isRunning;
    }

    get cycleCount() {
        return this._cycle.cycleCount;
    }

    get lm() {
        return this._lm;
    }

    get tools() {
        return this._toolIntegration;
    }

    get explanationService() {
        return this._explanationService;
    }

    get componentManager() {
        return this._componentManager;
    }

    get metricsMonitor() {
        return this._metricsMonitor;
    }

    get evaluator() {
        return this._evaluator;
    }

    get ruleEngine() {
        return this._ruleEngine;
    }

    get embeddingLayer() {
        return this._embeddingLayer;
    }

    get termLayer() {
        return this._termLayer;
    }

    get reasoningAboutReasoning() {
        return this._reasoningAboutReasoning;
    }

    get streamReasoner() {
        return this._streamReasoner;
    }

    async initialize() {
        const success = await this._componentManager.initializeAll();
        if (success) {
            await this._setupDefaultRules();
        }

        // Initialize stream reasoner if it's going to be used
        if (!this._streamReasoner) {
            this._initStreamReasoner();
            await this._registerRulesWithStreamReasoner();
        }

        return success;
    }

    _initComponents(config) {
        const lmEnabled = config.lm?.enabled === true;
        this._termFactory = new TermFactory(this._config.termFactory, this._eventBus);
        this._memory = new Memory(this._config.memory);
        this._parser = new NarseseParser(this._termFactory);
        this._focus = new Focus(this._config.focus);
        this._taskManager = new TaskManager(this._memory, this._focus, this._config.taskManager);
        this._evaluator = new EvaluationEngine(null, this._termFactory);
        this._lm = lmEnabled ? new LM() : null;

        // Initialize stream reasoner components
        this._ruleEngine = null; // No old rule engine needed

        const cycleConfig = {
            memory: this._memory,
            focus: this._focus,
            ruleEngine: this._ruleEngine,
            taskManager: this._taskManager,
            evaluator: this._evaluator,
            config: this._config.get('cycle'),
            reasoningStrategy: null,  // Not used in stream mode
            termFactory: this._termFactory,
            nar: this,
            ...this._config.get('performance.cycle')
        };

        this._cycle = this._useOptimizedCycle
            ? new OptimizedCycle(cycleConfig)
            : new Cycle(cycleConfig);

        this._initOptionalComponents(config);
    }

    _initOptionalComponents(config) {
        this._toolIntegration = config.tools?.enabled !== false ? new ToolIntegration(config.tools || {}) : null;
        if (this._toolIntegration) {
            this._toolIntegration.connectToReasoningCore(this);
            this._explanationService = new ExplanationService({lm: this._lm || null, ...config.tools?.explanation});
        }
        this._metricsMonitor = new MetricsMonitor({eventBus: this._eventBus, nar: this, ...config.metricsMonitor});
        const embeddingConfig = config.embeddingLayer || {enabled: false};
        this._embeddingLayer = embeddingConfig.enabled ? new EmbeddingLayer(embeddingConfig) : null;
        this._termLayer = new TermLayer({capacity: config.termLayer?.capacity || 1000, ...config.termLayer});
        this._reasoningAboutReasoning = new ReasoningAboutReasoning(this, {...config.reasoningAboutReasoning});
    }

    _initStreamReasoner() {
        // Create premise source using the new reasoner's approach
        this._streamPremiseSource = new TaskBagPremiseSource(this._focus, this._config.get('reasoning.streamSamplingObjectives') || {priority: true});

        // Create strategy
        this._streamStrategy = new Strategy({
            ...this._config.get('reasoning.streamStrategy'),
            focus: this._focus,
            memory: this._memory
        });

        // Create rule executor
        this._streamRuleExecutor = new StreamRuleExecutor(this._config.get('reasoning.streamRuleExecutor') || {});

        // Create rule processor
        this._streamRuleProcessor = new StreamRuleProcessor(this._streamRuleExecutor, {
            maxDerivationDepth: this._config.get('reasoning.maxDerivationDepth') || 10,
            termFactory: this._termFactory
        });

        // Create the main stream reasoner
        this._streamReasoner = new StreamReasoner(
            this._streamPremiseSource,
            this._streamStrategy,
            this._streamRuleProcessor,
            {
                maxDerivationDepth: this._config.get('reasoning.maxDerivationDepth') || 10,
                cpuThrottleInterval: this._config.get('reasoning.cpuThrottleInterval') || 0
            },
            this  // Pass the NAR instance as parent for derivation feedback
        );
    }

    _registerComponents() {
        this._componentManager.registerComponent('termFactory', {
            initialize: () => Promise.resolve(true),
            start: () => Promise.resolve(true),
            stop: () => Promise.resolve(true),
            dispose: () => Promise.resolve(true),
            isInitialized: true,
            isStarted: true,
            isDisposed: false
        });

        this._componentManager.registerComponent('memory', this._memory);
        this._componentManager.registerComponent('focus', this._focus, ['memory']);
        this._componentManager.registerComponent('taskManager', this._taskManager, ['memory', 'focus']);

        // Only register ruleEngine if it exists (for backward compatibility)
        if (this._ruleEngine) {
            this._componentManager.registerComponent('ruleEngine', this._ruleEngine);
        }

        if (this._lm) {
            this._componentManager.registerComponent('lm', this._lm);
        }

        if (this._toolIntegration) {
            this._componentManager.registerComponent('toolIntegration', this._toolIntegration);
            if (this._explanationService) {
                this._componentManager.registerComponent('explanationService', this._explanationService, ['toolIntegration']);
            }
        }

        // For cycle dependencies, only include ruleEngine if it exists
        const cycleDependencies = ['memory', 'focus', 'taskManager'];
        if (this._ruleEngine) {
            cycleDependencies.push('ruleEngine');
        }

        this._componentManager.registerComponent('cycle', this._cycle, cycleDependencies);
    }

    async _setupDefaultRules() {
        try {
            // Register rules with stream reasoner (the primary reasoner)
            await this._registerRulesWithStreamReasoner();
        } catch (error) {
            this.logWarn('Error setting up default rules:', error);
        }
    }

    async _registerRulesWithStreamReasoner() {
        if (!this._streamRuleExecutor) return;

        // Import and register new stream reasoner rules from the refactored structure
        const {SyllogisticRule} = await import('../reason/rules/nal/SyllogisticRule.js');
        const {ModusPonensRule} = await import('../reason/rules/nal/ModusPonensRule.js');
        const {ImplicationSyllogisticRule} = await import('../reason/rules/nal/ImplicationSyllogisticRule.js');
        const {MetacognitionRules} = await import('../reason/rules/nal/MetacognitionRules.js');

        const newSyllogisticRule = new SyllogisticRule();
        const newModusPonensRule = new ModusPonensRule();
        const newImplicationSyllogisticRule = new ImplicationSyllogisticRule();

        this._streamRuleExecutor.register(newSyllogisticRule);
        this._streamRuleExecutor.register(newModusPonensRule);
        this._streamRuleExecutor.register(newImplicationSyllogisticRule);

        // Register metacognition rules if enabled
        if (this._config.get('metacognition.selfOptimization.enabled')) {
            for (const RuleClass of MetacognitionRules) {
                const rule = new RuleClass();
                this._streamRuleExecutor.register(rule);
            }
        }

        // TODO: Add other new rules as they are implemented
        // For example:
        // const { DeductionRule } = await import('../reason/rules/nal/DeductionRule.js');
        // this._streamRuleExecutor.register(new DeductionRule());
    }

    async input(narseseString, options = {}) {
        try {
            const parsed = this._parser.parse(narseseString);
            if (!parsed?.term) throw new Error('Invalid parse result');

            const task = this._createTask(parsed);
            const added = this._taskManager.addTask(task);

            if (added) {
                this._eventBus.emit('task.input', {
                    task,
                    source: 'user',
                    originalInput: narseseString,
                    parsed
                }, {traceId: options.traceId});

                // For stream reasoner: explicitly add to focus so the stream can access it
                if (this._focus) {
                    this._focus.addTaskToFocus(task);
                }

                await this._processPendingTasks(options.traceId);
            }

            return added;
        } catch (error) {
            this._eventBus.emit('input.error', {
                error: error.message,
                input: narseseString
            }, {traceId: options.traceId});
            throw error;
        }
    }

    _createTask(parsed) {
        const {term, truthValue, punctuation} = parsed;
        const budget = {priority: this._calculateInputPriority(parsed)};
        const taskType = this._getTaskTypeFromPunctuation(punctuation);

        return new Task({
            term,
            punctuation,
            truth: this._createTaskTruth(taskType, truthValue, parsed),
            budget,
        });
    }

    _createTaskTruth(taskType, truthValue, parsed) {
        if (taskType === 'QUESTION') {
            if (truthValue) {
                throw new Error(`Questions cannot have truth values: input was ${parsed.originalInput || 'unspecified'}`);
            }
            return null;
        }

        return truthValue
            ? new Truth(truthValue.frequency, truthValue.confidence)
            : new Truth(1.0, 0.9);
    }

    _getTaskTypeFromPunctuation(punctuation) {
        return {
            '.': 'BELIEF',
            '!': 'GOAL',
            '?': 'QUESTION'
        }[punctuation] || 'BELIEF';
    }

    start(options = {}) {
        if (this._isRunning) {
            this.logWarn('NAR already running');
            return false;
        }

        this._startComponentsAsync();

        this._isRunning = true;
        this._processPendingTasks(options.traceId);

        // Start the stream-based reasoner instead of the cycle-based one
        this._streamReasoner.start();

        // Optionally, set up a monitoring process for stream reasoner metrics
        this._streamMonitoringInterval = setInterval(() => {
            if (this._streamReasoner) {
                const metrics = this._streamReasoner.getMetrics();
                this._eventBus.emit('streamReasoner.metrics', metrics, {traceId: options.traceId});
            }
        }, 5000); // Report metrics every 5 seconds

        this._eventBus.emit('system.started', {timestamp: Date.now()}, {traceId: options.traceId});
        this._emitIntrospectionEvent('system:start', {timestamp: Date.now()});
        this.logInfo(`NAR started successfully with stream-based reasoning`);
        return true;
    }

    async _startComponentsAsync() {
        try {
            const success = await this._componentManager.startAll();
            if (!success) {
                this.logError('Failed to start all components');
            }
        } catch (error) {
            this.logError('Error during component start:', error);
        }
    }

    stop(options = {}) {
        if (!this._isRunning) {
            this.logWarn('NAR not running');
            return false;
        }

        this._isRunning = false;

        if (this._useStreamReasoner) {
            // Stop the stream-based reasoner
            if (this._streamReasoner) {
                this._streamReasoner.stop();
            }
            // Clear stream monitoring interval
            this._streamMonitoringInterval && clearInterval(this._streamMonitoringInterval) && (this._streamMonitoringInterval = null);
        } else {
            // Stop the traditional cycle-based reasoner
            this._cycleInterval && clearInterval(this._cycleInterval) && (this._cycleInterval = null);
        }

        this._stopComponentsAsync();

        this._eventBus.emit('system.stopped', {timestamp: Date.now()}, {traceId: options.traceId});
        this._emitIntrospectionEvent('system:stop', {timestamp: Date.now()});
        this.logInfo(`NAR stopped successfully (stream-based reasoning)`);
        return true;
    }

    async _stopComponentsAsync() {
        try {
            const success = await this._componentManager.stopAll();
            if (!success) {
                this.logError('Failed to stop all components');
            }
        } catch (error) {
            this.logError('Error during component stop:', error);
        }
    }

    async step(options = {}) {
        try {
            await this._processPendingTasks(options.traceId);

            //console.log(`[NAR STEP] Executing stream reasoner step...`);
            // Execute a single step of the stream reasoner (now returns array of derivations)
            const results = await this._streamReasoner.step();

            //console.log(`[NAR STEP] Stream reasoner generated ${results.length} results:`);
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result && result.term) {
                    const termName = result.term._name || result.term || 'unknown';
                    const truth = result.truth ? `f:${result.truth.frequency}, c:${result.truth.confidence}` : 'no truth';
                    console.log(`  [${i}] ${termName} ${truth ? `(${truth})` : ''}`);
                }
            }

            // Add all derivations back to the system
            for (const result of results) {
                if (result) {
                    this._taskManager.addTask(result);
                    if (this._focus) {
                        this._focus.addTaskToFocus(result);
                    }

                    // Emit event for each derivation
                    this._eventBus.emit('reasoning.derivation', {
                        derivedTask: result,
                        source: 'streamReasoner.step',
                        timestamp: Date.now()
                    }, {traceId: options.traceId});
                }
            }

            this._eventBus.emit('streamReasoner.step', {
                results,
                count: results.length
            }, {traceId: options.traceId});
            return results;  // Return the array of results
        } catch (error) {
            this._eventBus.emit('streamReasoner.error', {error: error.message}, {traceId: options.traceId});
            this.logError('Error in reasoning step:', error);
            throw error;
        }
    }

    async runCycles(count, options = {}) {
        const results = [];
        for (let i = 0; i < count; i++) {
            try {
                results.push(await this.step({...options, cycleNumber: i + 1}));
            } catch (error) {
                results.push({error: error.message, cycleNumber: i + 1});
            }
        }
        return results;
    }

    async dispose() {
        // Stop reasoner if it's running
        if (this._isRunning) {
            this.stop();
        }

        // Clean up stream reasoner if it exists
        if (this._streamReasoner) {
            await this._streamReasoner.cleanup();
        }

        const success = await this._componentManager.disposeAll();
        await super.dispose();
        return success;
    }

    serialize() {
        return {
            config: this._config.toJSON(),
            memory: this._memory.serialize ? this._memory.serialize() : null,
            taskManager: this._taskManager.serialize ? this._taskManager.serialize() : null,
            cycle: this._cycle.serialize ? this._cycle.serialize() : null,
            focus: this._focus.serialize ? this._focus.serialize() : null,
            cycleCount: this._cycle.cycleCount,
            isRunning: this._isRunning,
            timestamp: Date.now(),
            version: '10.0.0'
        };
    }

    getConcepts() {
        if (this._memory) {
            return this._memory.getAllConcepts();
        }
        return [];
    }

    getConceptByName(termString) {
        if (this._memory) {
            for (const concept of this._memory.getAllConcepts()) {
                if (concept.term.toString() === termString) {
                    return concept;
                }
            }
        }
        return null;
    }

    getConceptPriorities() {
        if (this._memory) {
            return this._memory.getAllConcepts().map(concept => ({
                term: concept.term.toString(),
                priority: concept.priority || concept.activation || 0,
                activation: concept.activation || 0,
                useCount: concept.useCount || 0,
                quality: concept.quality || 0,
                totalTasks: concept.totalTasks || 0
            }));
        }
        return [];
    }

    async deserialize(state) {
        try {
            if (this._isRunning) {
                this.stop();
            }

            if (state.config) {
                this._config = NARBuilder.from(state.config);
            }

            if (state.memory && this._memory.deserialize) {
                await this._memory.deserialize(state.memory);
            }

            if (state.taskManager && this._taskManager.deserialize) {
                await this._taskManager.deserialize(state.taskManager);
            }

            if (state.focus && this._focus.deserialize) {
                await this._focus.deserialize(state.focus);
            }

            if (state.cycle && this._cycle.deserialize) {
                await this._cycle.deserialize(state.cycle);
            }

            if (state.cycleCount !== undefined) {
                this._cycle.cycleCount = state.cycleCount;
            }

            if (state.isRunning !== undefined) {
                this._isRunning = state.isRunning;
            }

            await this._componentManager.disposeAll();
            this._initComponents(this._config.toJSON());
            await this._componentManager.initializeAll();
            await this._setupDefaultRules();

            this._eventBus.emit('system.loaded', {
                timestamp: Date.now(),
                stateVersion: state.version,
                fromFile: state.sourceFile || 'serialized'
            });

            return true;
        } catch (error) {
            this.logError('Error during NAR deserialization:', error);
            return false;
        }
    }

    query(queryTerm) {
        return this._memory.getConcept(queryTerm)?.getTasksByType('BELIEF') || [];
    }

    getBeliefs(queryTerm = null) {
        return queryTerm ? this.query(queryTerm)
            : this._memory.getAllConcepts().flatMap(c => c.getTasksByType('BELIEF'));
    }

    getGoals() {
        return this._taskManager.findTasksByType('GOAL');
    }

    getQuestions() {
        return this._taskManager.findTasksByType('QUESTION');
    }

    reset(options = {}) {
        this.stop();
        this._memory.clear();
        this._taskManager.clearPendingTasks();
        this._cycle.reset();
        this._eventBus.emit('system.reset', {timestamp: Date.now()}, {traceId: options.traceId});
        this.logInfo('NAR reset completed');
    }

    on(eventName, callback) {
        this._eventBus.on(eventName, callback);
    }

    off(eventName, callback) {
        this._eventBus.off(eventName, callback);
    }

    getStats() {
        const baseStats = {
            isRunning: this._isRunning,
            cycleCount: this._streamReasoner?.getMetrics?.()?.totalDerivations || 0,
            memoryStats: this._memory.getDetailedStats(),
            taskManagerStats: this._taskManager.getTaskStats?.() ?? this._taskManager.stats,
            config: this._config.toJSON(),
            lmStats: this._lm?.getMetrics?.()
        };

        baseStats.streamReasonerStats = this._streamReasoner?.getMetrics?.() || null;

        return baseStats;
    }

    _withComponentCheck(component, message, operation) {
        if (!component) throw new Error(message);
        return operation(component);
    }

    _ensureLMEnabled() {
        if (!this._lm) throw new Error('Language Model is not enabled in this NAR instance');
    }

    _ensureToolIntegration() {
        if (!this._toolIntegration) throw new Error('Tool integration is not enabled');
    }

    _ensureExplanationService() {
        if (!this._explanationService) throw new Error('Explanation service is not enabled');
    }

    registerLMProvider(id, provider) {
        this._ensureLMEnabled();
        this._lm.registerProvider(id, provider);
        return this;
    }

    async generateWithLM(prompt, options = {}) {
        return this._withComponentCheck(this._lm, 'Language Model is not enabled in this NAR instance',
            lm => lm.generateText(prompt, options));
    }

    translateToNarsese(text) {
        return this._withComponentCheck(this._lm, 'Language Model is not enabled in this NAR instance',
            lm => lm.translateToNarsese(text));
    }

    translateFromNarsese(narsese) {
        return this._withComponentCheck(this._lm, 'Language Model is not enabled in this NAR instance',
            lm => lm.translateFromNarsese(narsese));
    }

    _calculateInputPriority(parsed) {
        const {truthValue, taskType} = parsed;
        const basePriority = this.config.taskManager?.defaultPriority || PRIORITY.DEFAULT;

        if (!truthValue) return basePriority;

        const priorityConfig = this.config.taskManager?.priority || {};
        const {confidenceMultiplier = 0.3, goalBoost = 0.2, questionBoost = 0.1} = priorityConfig;

        const confidenceBoost = (truthValue.confidence || 0) * confidenceMultiplier;
        const typeBoost = {GOAL: goalBoost, QUESTION: questionBoost}[taskType] || 0;

        return Math.min(PRIORITY.MAX_PRIORITY, basePriority + confidenceBoost + typeBoost);
    }

    async _processPendingTasks(traceId) {
        for (const task of this._taskManager.processPendingTasks(Date.now())) {
            this._eventBus.emit('task.added', {task}, {traceId});
        }
    }

    connectToWebSocketMonitor(monitor) {
        if (!monitor || typeof monitor.listenToNAR !== 'function') {
            throw new Error('Invalid WebSocket monitor provided');
        }

        monitor.listenToNAR(this);
        this.logInfo('Connected to WebSocket monitor for real-time monitoring');

        if (this._reasoningAboutReasoning) {
            this._reasoningStateInterval = setInterval(() => {
                this._emitPeriodicReasoningState();
            }, 5000);
        }
    }

    _emitPeriodicReasoningState() {
        try {
            if (this._reasoningAboutReasoning?.getReasoningState) {
                const state = this._reasoningAboutReasoning.getReasoningState();
                this._eventBus.emit('reasoningState', state, {source: 'periodic'});
            }
        } catch (error) {
            this.logError('Error in reasoning state update:', error);
        }
    }

    disconnectFromWebSocketMonitor() {
        if (this._reasoningStateInterval) {
            clearInterval(this._reasoningStateInterval);
            this._reasoningStateInterval = null;
        }
    }

    getReasoningState() {
        return this._reasoningAboutReasoning?.getReasoningState?.() ?? null;
    }

    async initializeTools() {
        if (this._toolIntegration) {
            await this._toolIntegration.initializeTools(this);
            this.logger.info('Tools initialized successfully');
            return true;
        }
        return false;
    }

    getMetrics() {
        return this._metricsMonitor ? this._metricsMonitor.getMetricsSnapshot() : null;
    }

    performSelfOptimization() {
        if (this._metricsMonitor) {
            this._metricsMonitor._performSelfOptimization();
        }
    }

    async solveEquation(leftTerm, rightTerm, variableName, context = null) {
        const evaluationContext = context || {
            memory: this._memory,
            termFactory: this._termFactory
        };

        // Use the evaluator that's available
        if (this._evaluator) {
            return await this._evaluator.solveEquation(
                leftTerm,
                rightTerm,
                variableName,
                evaluationContext
            );
        }

        return {
            result: null,
            success: false,
            message: 'No operation evaluation engine available'
        };
    }

    async performMetaCognitiveReasoning() {
        return this._reasoningAboutReasoning ? await this._reasoningAboutReasoning.performMetaCognitiveReasoning() : null;
    }

    async performSelfCorrection() {
        return this._reasoningAboutReasoning ? await this._reasoningAboutReasoning.performSelfCorrection() : null;
    }

    querySystemState(query) {
        return this._reasoningAboutReasoning?.querySystemState(query) ?? null;
    }

    getReasoningTrace() {
        return this._reasoningAboutReasoning?.getReasoningTrace() ?? [];
    }

    async executeTool(toolId, params, context = {}) {
        const startTime = Date.now();
        try {
            const result = await this._withComponentCheck(this._toolIntegration, 'Tool integration is not enabled',
                toolIntegration => toolIntegration.executeTool(toolId, params, this._createToolContext(context)));
            const duration = Date.now() - startTime;
            duration > 1000 && this.logger.warn(`Slow tool execution: ${toolId} took ${duration}ms`, {
                toolId,
                duration,
                paramsSize: JSON.stringify(params).length
            });
            return result;
        } catch (error) {
            this.logger.error(`Tool execution failed: ${toolId}`, {
                toolId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    async executeTools(toolCalls, context = {}) {
        return await this._withComponentCheck(this._toolIntegration, 'Tool integration is not enabled',
            toolIntegration => toolIntegration.executeTools(toolCalls, this._createToolContext(context)));
    }

    getAvailableTools() {
        return this._toolIntegration?.getAvailableTools() ?? [];
    }

    async explainToolResult(toolResult, context = {}) {
        return await this._withComponentCheck(this._explanationService, 'Explanation service is not enabled',
            service => service.explainToolResult(toolResult, this._createToolContext(context)));
    }

    async explainToolResults(toolResults, context = {}) {
        return await this._withComponentCheck(this._explanationService, 'Explanation service is not enabled',
            service => service.explainToolResults(toolResults, this._createToolContext(context)));
    }

    async summarizeToolExecution(toolResults, context = {}) {
        return await this._withComponentCheck(this._explanationService, 'Explanation service is not enabled',
            service => service.summarizeToolExecution(toolResults, this._createToolContext(context)));
    }

    async assessToolResults(toolResults, context = {}) {
        return await this._withComponentCheck(this._explanationService, 'Explanation service is not enabled',
            service => service.assessToolResults(toolResults, this._createToolContext(context)));
    }

    _createToolContext(context = {}) {
        return {
            nar: this,
            memory: this._memory,
            timestamp: Date.now(),
            ...context
        };
    }
}
