import {EventEmitter} from 'eventemitter3';
import {getHeapUsed} from '../util/common.js';

/**
 * The main Reasoner class that manages the continuous reasoning pipeline.
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
            ...config
        };

        this.isRunning = false;
        this._outputStream = null;

        this.metrics = {
            totalDerivations: 0,
            startTime: null,
            lastDerivationTime: null,
            totalProcessingTime: 0,
            cpuThrottleCount: 0,
            backpressureEvents: 0,
            lastBackpressureTime: null
        };

        this.performance = {
            throughput: 0,
            avgProcessingTime: 0,
            memoryUsage: 0,
            backpressureLevel: 0
        };

        this.outputConsumerSpeed = 0;
        this.lastConsumerCheckTime = Date.now();
        this.consumerDerivationCount = 0;
    }

    get outputStream() {
        return this._outputStream ??= this._createOutputStream();
    }

    async* _createOutputStream() {
        try {
            const premiseStream = this.premiseSource.stream();
            const premisePairStream = this.strategy.generatePremisePairs(premiseStream);
            const derivationStream = this.ruleProcessor.process(premisePairStream, 30000);

            for await (const derivation of derivationStream) {
                if (this.config.cpuThrottleInterval > 0) {
                    await this._cpuThrottle();
                    this.metrics.cpuThrottleCount++;
                }

                yield derivation;
            }
        } catch (error) {
            console.debug('Error in output stream creation:', error.message);
            return;
        }
    }

    start() {
        if (this.isRunning) {
            console.warn('Reasoner is already running');
            return;
        }

        this.isRunning = true;
        this.metrics.startTime = Date.now();
        this._runPipeline();
    }

    async stop() {
        this.isRunning = false;
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    async step(timeoutMs = 5000) {
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
                        timeoutMs
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
    async _processRuleBatch(candidateRules, primaryPremise, secondaryPremise, startTime, maxTimeMs) {
        const results = [];

        for (const rule of candidateRules) {
            if (Date.now() - startTime > maxTimeMs) break;

            if (this._isSynchronousRule(rule)) {
                const ruleContext = this._createRuleContext();
                const ruleResults = this.ruleProcessor.ruleExecutor.executeRule(rule, primaryPremise, secondaryPremise, ruleContext);

                for (const result of ruleResults) {
                    const processedResult = this._processDerivation(result);
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

    async _cpuThrottle() {
        if (this.config.cpuThrottleInterval > 0) {
            return new Promise(resolve => setTimeout(resolve, this.config.cpuThrottleInterval));
        }
    }

    async _runPipeline() {
        try {
            for await (const derivation of this.outputStream) {
                if (!this.isRunning) break;

                const startTime = Date.now();
                this._processDerivation(derivation);
                this._updateMetrics(startTime);

                if (this.metrics.totalDerivations % 50 === 0) {
                    this._updatePerformanceMetrics();
                    await this._adaptProcessingRate();
                }

                await this._checkAndApplyBackpressure();
            }
        } catch (error) {
            console.error('Error in reasoning pipeline:', error);
        } finally {
            this.isRunning = false;
            this._updatePerformanceMetrics();
        }
    }

    _updateMetrics(startTime) {
        this.metrics.totalDerivations++;
        this.metrics.lastDerivationTime = Date.now();

        const processingTime = this.metrics.lastDerivationTime - startTime;
        this.metrics.totalProcessingTime += processingTime;
    }

    _updatePerformanceMetrics() {
        if (this.metrics.startTime && this.metrics.totalDerivations > 0) {
            const elapsed = (this.metrics.lastDerivationTime - this.metrics.startTime) / 1000;
            this.performance.throughput = elapsed > 0 ? this.metrics.totalDerivations / elapsed : 0;
            this.performance.avgProcessingTime = this.metrics.totalProcessingTime / this.metrics.totalDerivations;
        }

        this.performance.memoryUsage = getHeapUsed();

        const now = Date.now();
        if (this.lastConsumerCheckTime) {
            const timeDiff = (now - this.lastConsumerCheckTime) / 1000;
            if (timeDiff > 0) {
                this.outputConsumerSpeed = (this.metrics.totalDerivations - this.consumerDerivationCount) / timeDiff;
                this.performance.backpressureLevel = Math.max(0, this.outputConsumerSpeed - this.performance.throughput);
            }
        }

        this.lastConsumerCheckTime = now;
        this.consumerDerivationCount = this.metrics.totalDerivations;
    }

    async _checkAndApplyBackpressure() {
        const now = Date.now();
        const timeDiff = now - this.lastConsumerCheckTime;

        if (timeDiff > 1000) {
            this._updatePerformanceMetrics();

            if (this.performance.backpressureLevel > 10) {
                this.metrics.backpressureEvents++;
                this.metrics.lastBackpressureTime = now;
                await new Promise(resolve => setTimeout(resolve, this.config.backpressureInterval ?? 10));
            }

            this.lastConsumerCheckTime = now;
        }
    }

    async _adaptProcessingRate() {
        this._updatePerformanceMetrics();

        let adjustmentFactor = 1.0;

        if (this.performance.backpressureLevel > 20) {
            adjustmentFactor = 0.5;
        } else if (this.performance.backpressureLevel > 5) {
            adjustmentFactor = 0.8;
        } else if (this.performance.backpressureLevel < -5) {
            adjustmentFactor = 1.2;
        }

        const baseThrottle = this.config.cpuThrottleInterval ?? 0;
        const newThrottle = Math.max(0, baseThrottle / adjustmentFactor);
        const adjustedThrottle = this.config.cpuThrottleInterval * 0.9 + newThrottle * 0.1;
        this.config.cpuThrottleInterval = adjustedThrottle;

        const baseBackpressureInterval = this.config.backpressureInterval ?? 10;
        this.config.backpressureInterval = Math.max(1, baseBackpressureInterval / adjustmentFactor);
    }

    _processDerivation(derivation) {
        // Return the derivation for centralized processing by the NAR
        // Emit event for subscribers (like NAR) to handle the derivation
        this.emit('derivation', derivation);
        return derivation;
    }

    getMetrics() {
        this._updatePerformanceMetrics();
        return {
            ...this.metrics,
            ...this.performance,
            outputConsumerSpeed: this.outputConsumerSpeed,
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
                        queueLength: this.metrics.totalDerivations - (this.lastProcessedCount ?? 0)
                    });
                } catch (error) {
                    console.error('Error in consumer feedback handler:', error);
                }
            });
        }
    }

    resetMetrics() {
        this.metrics = {
            totalDerivations: 0,
            startTime: this.isRunning ? Date.now() : null,
            lastDerivationTime: null,
            totalProcessingTime: 0,
            cpuThrottleCount: 0
        };

        this.performance = {
            throughput: 0,
            avgProcessingTime: 0,
            memoryUsage: 0
        };
    }

    getState() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            metrics: this.getMetrics(),
            components: {
                premiseSource: this.premiseSource.constructor.name,
                strategy: this.strategy.constructor.name,
                ruleProcessor: this.ruleProcessor.constructor.name
            },
            timestamp: Date.now()
        };
    }

    getComponentStatus() {
        return {
            premiseSource: this._getComponentStatus(this.premiseSource, 'PremiseSource'),
            strategy: this._getComponentStatus(this.strategy, 'Strategy'),
            ruleProcessor: this._getComponentStatus(this.ruleProcessor, 'RuleProcessor')
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
            internalState: {
                hasOutputStream: !!this._outputStream,
                outputStreamType: this._outputStream?.constructor.name ?? null
            },
            timestamp: Date.now()
        };
    }

    getPerformanceMetrics() {
        this._updatePerformanceMetrics();
        return {
            ...this.performance,
            detailed: {
                throughput: this.performance.throughput,
                avgProcessingTime: this.performance.avgProcessingTime,
                memoryUsage: this.performance.memoryUsage,
                cpuThrottleCount: this.metrics.cpuThrottleCount
            },
            timestamp: Date.now()
        };
    }

    receiveConsumerFeedback(feedback) {
        if (typeof feedback.processingSpeed === 'number') {
            this.outputConsumerSpeed = feedback.processingSpeed;
        }

        if (typeof feedback.backlogSize === 'number') {
            if (feedback.backlogSize > this.config.backpressureThreshold) {
                this.config.cpuThrottleInterval = Math.min(
                    this.config.cpuThrottleInterval * 1.5,
                    this.config.cpuThrottleInterval + 5
                );
            } else if (feedback.backlogSize < this.config.backpressureThreshold / 2) {
                this.config.cpuThrottleInterval = Math.max(
                    this.config.cpuThrottleInterval * 0.9,
                    Math.max(0, this.config.cpuThrottleInterval - 1)
                );
            }
        }

        this.performance.backpressureLevel = feedback.backlogSize ?? 0;
    }

    async cleanup() {
        await this.stop();
        this._outputStream = null;
        this.resetMetrics();
        this.removeAllListeners(); // Cleanup listeners
    }
}
