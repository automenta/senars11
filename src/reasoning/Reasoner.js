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

        let allDerivedTasks = [];

        // Apply reasoning sequentially based on enabled modes
        if (enableSymbolicReasoning) {
            allDerivedTasks.push(...await this._performSymbolicInference(focusSet, maxDerivedTasks - allDerivedTasks.length));
        }
        
        if (enableTemporalReasoning && allDerivedTasks.length < maxDerivedTasks && this.temporalReasoner) {
            allDerivedTasks.push(...this._performTemporalInference(focusSet, maxDerivedTasks - allDerivedTasks.length));
        }
        
        if (enableModularReasoning && allDerivedTasks.length < maxDerivedTasks && this.systemContext) {
            allDerivedTasks.push(...await this._performModularInference(focusSet, maxDerivedTasks - allDerivedTasks.length));
        }

        const finalTasks = allDerivedTasks.slice(0, maxDerivedTasks);
        this.logger.debug(`Total inference produced ${finalTasks.length} derived tasks`);
        
        ReasoningUtils.updateMetrics(this.metrics, 'total', finalTasks.length);

        return finalTasks;
    }

    async _performSymbolicInference(focusSet, maxDerived) {
        this.logger.debug(`Starting symbolic inference with ${this.ruleEngine.rules.length} rules on ${focusSet.length} tasks`);

        const reasoningContext = this._createReasoningContext();
        const strategy = this.strategySelector.selectStrategy(reasoningContext, focusSet, this.ruleEngine.rules);
        const strategyResults = await strategy.execute(
            reasoningContext,
            this.ruleEngine.rules,
            focusSet
        );

        const derivedTasks = strategyResults.slice(0, maxDerived);
        ReasoningUtils.updateMetrics(this.metrics, 'symbolic', derivedTasks.length);
        this.logger.debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);

        return derivedTasks;
    }

    _performTemporalInference(focusSet, maxTemporalTasks) {
        if (!this.temporalReasoner) {
            this.logger.debug('Temporal reasoner not available, skipping temporal reasoning');
            return [];
        }

        this.logger.debug(`Starting temporal inference on ${focusSet.length} tasks with max ${maxTemporalTasks} derived tasks`);

        try {
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            const limitedTasks = Array.isArray(temporalTasks) ? temporalTasks.slice(0, maxTemporalTasks) : [];

            ReasoningUtils.updateMetrics(this.metrics, 'temporal', limitedTasks.length);
            this.logger.debug(`Temporal inference produced ${limitedTasks.length} derived tasks`);

            return limitedTasks;
        } catch (error) {
            this.logger.warn('Temporal reasoning failed:', error);
            return [];
        }
    }

    async _performModularInference(focusSet, maxModularTasks) {
        if (!this.systemContext) {
            this.logger.debug('System context not available, skipping modular reasoning');
            return [];
        }

        this.logger.debug(`Starting modular inference on ${focusSet.length} tasks with max ${maxModularTasks} derived tasks`);

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

        ReasoningUtils.updateMetrics(this.metrics, 'modular', derivedTasks.length);
        this.logger.debug(`Modular inference produced ${derivedTasks.length} derived tasks`);

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