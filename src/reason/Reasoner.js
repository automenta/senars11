
import {EventEmitter} from 'eventemitter3';
import {getHeapUsed} from '../util/common.js';
import {SimpleRunner} from './runner/SimpleRunner.js';
import {PipelineRunner} from './runner/PipelineRunner.js';

/**
 * The main Reasoner class that manages the continuous reasoning pipeline.
 * It delegates the execution loop to a Runner strategy (Simple or Pipeline).
 */
export class Reasoner extends EventEmitter {
    /**
     * @param {PremiseSource} premiseSource - The source of premises
     * @param {Strategy} strategy - The strategy for premise pairing
     * @param {RuleProcessor} ruleProcessor - The processor for rules
     * @param {object} config - Configuration options
     */
    constructor(premiseSource, strategy, ruleProcessor, config = {}) {
        super();
        this.premiseSource = premiseSource;
        this.strategy = strategy;
        this.ruleProcessor = ruleProcessor;
        this.config = {
            maxDerivationDepth: config.maxDerivationDepth ?? 10,
            cpuThrottleInterval: config.cpuThrottleInterval ?? 0,
            backpressureThreshold: config.backpressureThreshold ?? 100,
            backpressureInterval: config.backpressureInterval ?? 10,
            executionMode: config.executionMode ?? 'simple',
            executionInterval: config.executionInterval ?? 100,
            ...config
        };

        if (this.config.executionMode === 'pipeline') {
             this.runner = new PipelineRunner(this, this.config);
        } else {
             this.runner = new SimpleRunner(this, this.config);
        }

        this.consumerFeedbackHandlers = [];
    }

    start() {
        if (this.runner.isRunning) {
            console.warn('Reasoner is already running');
            return;
        }
        this.runner.start();
    }

    async stop() {
        await this.runner.stop();
    }

    get isRunning() {
        return this.runner.isRunning;
    }

    async step(timeoutMs = 5000, suppressEvents = false) {
        const results = [];

        try {
            const startTime = Date.now();
            const focusTasks = this.premiseSource.focusComponent?.getTasks(1000) ?? [];

            if (focusTasks.length === 0) return results;

            // Generate unique premise pairs efficiently using a single loop with Set for deduplication
            const premisePairs = this._generateUniquePremisePairs(focusTasks);

            // Process each unique pair with timeout protection
            for (const { primaryPremise, secondaryPremise } of premisePairs) {
                if (Date.now() - startTime > timeoutMs) break;

                try {
                    const candidateRules = this.ruleProcessor.ruleExecutor.getCandidateRules(primaryPremise, secondaryPremise);

                    const forwardResults = await this._processRuleBatch(
                        candidateRules,
                        primaryPremise,
                        secondaryPremise,
                        startTime,
                        timeoutMs,
                        suppressEvents
                    );
                    results.push(...forwardResults.filter(Boolean));

                    if (Date.now() - startTime > timeoutMs) continue; // Continue for fair sampling
                } catch (error) {
                    console.debug('Error processing premise pair:', error.message);
                }
            }
        } catch (error) {
            console.debug('Error in step method:', error.message);
        }

        return results;
    }

    /**
     * Generate unique premise pairs efficiently
     * @private
     */
    _generateUniquePremisePairs(focusTasks) {
        const processedPairs = new Set();
        const premisePairs = [];

        for (let i = 0; i < focusTasks.length; i++) {
            for (let j = i + 1; j < focusTasks.length; j++) {
                const primaryPremise = focusTasks[i];
                const secondaryPremise = focusTasks[j];

                // Create a unique identifier for this premise pair to prevent duplicates
                const primaryTermId = primaryPremise.term?._id || primaryPremise.term?._name || primaryPremise.term || 'unknown';
                const secondaryTermId = secondaryPremise.term?._id || secondaryPremise.term?._name || secondaryPremise.term || 'unknown';

                // Create sorted pair ID to avoid duplicate processing
                const pairId = primaryTermId < secondaryTermId
                    ? `${primaryTermId}-${secondaryTermId}`
                    : `${secondaryTermId}-${primaryTermId}`;

                if (!processedPairs.has(pairId)) {
                    processedPairs.add(pairId);
                    premisePairs.push({ primaryPremise, secondaryPremise });
                }
            }
        }

        return premisePairs;
    }

    /**
     * Process a batch of rules for a premise pair
     * @private
     */
    async _processRuleBatch(candidateRules, primaryPremise, secondaryPremise, startTime, maxTimeMs, suppressEvents = false) {
        const results = [];

        for (const rule of candidateRules) {
            if (Date.now() - startTime > maxTimeMs) break;

            if (this._isSynchronousRule(rule)) {
                const ruleContext = this._createRuleContext();
                const ruleResults = this.ruleProcessor.ruleExecutor.executeRule(rule, primaryPremise, secondaryPremise, ruleContext);

                for (const result of ruleResults) {
                    const processedResult = this._processDerivation(result, suppressEvents);
                    if (processedResult) results.push(processedResult);
                }
            }
        }

        return results;
    }

    /**
     * Create rule execution context
     * @private
     */
    _createRuleContext() {
        return {
            termFactory: this.ruleProcessor.config.termFactory ?? this.ruleProcessor.config.context?.termFactory ?? null
        };
    }

    _isSynchronousRule(rule) {
        return (rule.type ?? '').toLowerCase().includes('nal');
    }

    _processDerivation(derivation, suppressEvents = false) {
        // Return the derivation for centralized processing by the NAR
        // Emit event for subscribers (like NAR) to handle the derivation
        if (!suppressEvents) {
            this.emit('derivation', derivation);
        }
        return derivation;
    }

    getMetrics() {
        const runnerMetrics = this.runner.getMetrics ? this.runner.getMetrics() : {};
        return {
            ...runnerMetrics,
            ruleProcessorStats: this.ruleProcessor.getStats?.() ?? null
        };
    }

    registerConsumerFeedbackHandler(handler) {
        this.consumerFeedbackHandlers ??= [];
        this.consumerFeedbackHandlers.push(handler);
    }

    notifyConsumption(derivation, processingTime, consumerInfo = {}) {
        if (this.consumerFeedbackHandlers?.length > 0) {
            this.consumerFeedbackHandlers.forEach(handler => {
                try {
                    handler(derivation, processingTime, {
                        ...consumerInfo,
                        timestamp: Date.now(),
                        queueLength: 0 // Simplification for now
                    });
                } catch (error) {
                    console.error('Error in consumer feedback handler:', error);
                }
            });
        }
    }

    resetMetrics() {
        // Delegate reset if supported, or just ignore for simple runner
    }

    getState() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            metrics: this.getMetrics(),
            components: {
                premiseSource: this.premiseSource.constructor.name,
                strategy: this.strategy.constructor.name,
                ruleProcessor: this.ruleProcessor.constructor.name,
                runner: this.runner.constructor.name
            },
            timestamp: Date.now()
        };
    }

    getComponentStatus() {
        return {
            premiseSource: this._getComponentStatus(this.premiseSource, 'PremiseSource'),
            strategy: this._getComponentStatus(this.strategy, 'Strategy'),
            ruleProcessor: this._getComponentStatus(this.ruleProcessor, 'RuleProcessor'),
            runner: this.runner.constructor.name
        };
    }

    _getComponentStatus(component, componentName) {
        const status = {
            name: componentName,
            type: component.constructor.name
        };

        if (typeof component.getStatus === 'function') {
            try {
                return {...status, ...component.getStatus()};
            } catch (e) {
                console.warn(`Error getting ${componentName} status:`, e.message);
                return {...status, error: e.message};
            }
        }

        return status;
    }

    getDebugInfo() {
        return {
            state: this.getState(),
            config: this.config,
            metrics: this.getMetrics(),
            componentStatus: this.getComponentStatus(),
            timestamp: Date.now()
        };
    }

    // Legacy method for compatibility if needed
    getPerformanceMetrics() {
         return {
             throughput: 0,
             avgProcessingTime: 0,
             memoryUsage: getHeapUsed(),
             ...this.getMetrics()
         };
    }

    receiveConsumerFeedback(feedback) {
        // Delegate? or ignore for SimpleRunner
        if (this.runner.receiveConsumerFeedback) {
            this.runner.receiveConsumerFeedback(feedback);
        }
    }

    async cleanup() {
        await this.stop();
        this.removeAllListeners();
    }
}
