import {RuleEngine} from './RuleEngine.js';
import {StrategySelector} from './StrategySelector.js';
import {ReasoningContext} from './ReasoningContext.js';
import {Logger} from '../util/Logger.js';
import {ReasoningUtils} from './ReasoningUtils.js';

export class Reasoner {
    constructor(config = {}) {
        this.config = ReasoningUtils.createDefaultConfig(config, {
            enableSymbolicReasoning: true,
            enableTemporalReasoning: true,
            enableModularReasoning: true,
            maxDerivedTasks: Infinity
        });

        // Initialize core components
        this.ruleEngine = config.ruleEngine || new RuleEngine(config.ruleEngine || {});
        this.strategySelector = config.strategySelector || new StrategySelector(config.strategySelector || {});
        this.temporalReasoner = config.temporalReasoner ?? null;
        this.systemContext = null;

        // Initialize metrics and tracking
        this.metrics = {
            totalInferences: 0,
            symbolicInferences: 0,
            temporalInferences: 0,
            modularInferences: 0,
            startTime: Date.now()
        };

        this.logger = Logger;
    }

    setSystemContext(systemContext) {
        this.systemContext = systemContext;
        return this;
    }

    async performInference(focusSet, options = {}) {
        ReasoningUtils.validateFocusSet(focusSet);

        if (focusSet.length === 0) return [];

        return await this._executeInference(focusSet, options);
    }

    async _executeInference(focusSet, options = {}) {
        const {
            maxDerivedTasks = this.config.maxDerivedTasks,
            enableSymbolicReasoning = this.config.enableSymbolicReasoning,
            enableTemporalReasoning = this.config.enableTemporalReasoning,
            enableModularReasoning = this.config.enableModularReasoning
        } = options;

        this.logger.debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        // Define reasoning modes with their respective functions
        const reasoningModes = [
            { enabled: enableSymbolicReasoning, type: 'symbolic', fn: this._executeSymbolicInference.bind(this) },
            { enabled: enableTemporalReasoning && this.temporalReasoner, type: 'temporal', fn: this._executeTemporalInference.bind(this) },
            { enabled: enableModularReasoning && this.systemContext, type: 'modular', fn: this._executeModularInference.bind(this) }
        ];

        let allDerivedTasks = [];

        // Apply reasoning sequentially based on enabled modes
        for (const { enabled, type, fn } of reasoningModes) {
            if (!enabled || allDerivedTasks.length >= maxDerivedTasks) continue;
            
            const remainingTasks = maxDerivedTasks - allDerivedTasks.length;
            const results = await this._performInference(type, focusSet, remainingTasks, fn);
            allDerivedTasks = allDerivedTasks.concat(results);
            
            if (allDerivedTasks.length >= maxDerivedTasks) break;
        }

        const finalTasks = allDerivedTasks.slice(0, maxDerivedTasks);
        this.logger.debug(`Total inference produced ${finalTasks.length} derived tasks`);
        
        ReasoningUtils.updateMetrics(this.metrics, 'total', finalTasks.length);

        return finalTasks;
    }

    async _performInference(type, focusSet, maxTasks, executionFn) {
        // Check if the required component is available
        const isAvailable = type === 'temporal' ? !!this.temporalReasoner : type === 'modular' ? !!this.systemContext : true;
        
        if (!isAvailable) {
            this.logger.debug(`${type} reasoner not available, skipping ${type} reasoning`);
            return [];
        }

        this.logger.debug(`Starting ${type} inference on ${focusSet.length} tasks with max ${maxTasks} derived tasks`);

        try {
            const results = await executionFn(focusSet, maxTasks);
            const limitedResults = Array.isArray(results) ? results.slice(0, maxTasks) : results || [];
            ReasoningUtils.updateMetrics(this.metrics, type, limitedResults.length);
            this.logger.debug(`${type} inference produced ${limitedResults.length} derived tasks`);

            return limitedResults;
        } catch (error) {
            this.logger.warn(`${type} reasoning failed:`, error);
            return [];
        }
    }
    
    async _executeSymbolicInference(focusSet) {
        const reasoningContext = this._createReasoningContext();
        const strategy = this.strategySelector.selectStrategy(reasoningContext, focusSet, this.ruleEngine.rules);
        return await strategy.execute(
            reasoningContext,
            this.ruleEngine.rules,
            focusSet
        );
    }
    
    _executeTemporalInference(focusSet) {
        return this.temporalReasoner.infer(focusSet);
    }
    
    async _executeModularInference(focusSet, maxModularTasks) {
        const derivedTasks = [];
        
        for (const task of focusSet) {
            if (derivedTasks.length >= maxModularTasks) break;

            try {
                const strategy = this.strategySelector.selectStrategy(
                    {ruleEngine: this.ruleEngine, systemContext: this.systemContext},
                    [task],
                    []
                );

                const result = await strategy.execute(
                    this.systemContext.memory,
                    [],
                    this.systemContext.termFactory
                );

                for (const inferredTask of result) {
                    if (derivedTasks.length >= maxModularTasks) break;
                    derivedTasks.push(inferredTask);
                }
            } catch (error) {
                this.logger.error(`Error executing modular reasoning for task:`, error);
            }
        }
        return derivedTasks;
    }

    _createReasoningContext() {
        return new ReasoningContext({
            memory: this.systemContext?.memory || null,
            termFactory: this.systemContext?.termFactory || null,
            ruleEngine: this.ruleEngine,
            systemContext: this.systemContext,
            config: this.config
        });
    }

    async processTask(task) {
        return await this.performInference([task]);
    }

    getPerformanceStats() {
        return ReasoningUtils.createPerformanceStats(this.metrics, this.ruleEngine, this.strategySelector);
    }

    getRuleStatistics() {
        return ReasoningUtils.createRuleStats(this.ruleEngine);
    }

    setReasoningMode(mode, enabled) {
        const validModes = {
            'symbolic': 'enableSymbolicReasoning',
            'temporal': 'enableTemporalReasoning', 
            'modular': 'enableModularReasoning'
        };
        
        const configKey = validModes[mode];
        if (!configKey) throw new Error(`Unknown reasoning mode: ${mode}`);
        
        this.config[configKey] = enabled;
        return this;
    }
}