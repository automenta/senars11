import {Runner} from './Runner.js';
import {getHeapUsed} from '../../util/common.js';
import {Logger} from '../../util/Logger.js';

export class PipelineRunner extends Runner {
    constructor(reasoner, config = {}) {
        super(reasoner, config);
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

        this._outputStream = null;
        this.abortController = null;
        this.isRunning = false;
    }

    get outputStream() {
        return this._outputStream ??= this._createOutputStream();
    }

    start() {
        if (this.isRunning) {
            Logger.warn('PipelineRunner is already running');
            return;
        }

        this.isRunning = true;
        this.abortController = new AbortController();
        this.metrics.startTime = Date.now();
        this._runPipeline();
    }

    async stop() {
        this.isRunning = false;
        this.abortController?.abort();
        this.abortController = null;
        this._outputStream = null;
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    async* _createOutputStream() {
        try {
            const premiseStream = this.reasoner.premiseSource.stream(this.abortController?.signal);
            const premisePairStream = this.reasoner.strategy.generatePremisePairs(premiseStream);
            const derivationStream = this.reasoner.ruleProcessor.process(premisePairStream, 1000, this.abortController?.signal);

            for await (const derivation of derivationStream) {
                if (this.config.cpuThrottleInterval > 0) {
                    await this._cpuThrottle();
                    this.metrics.cpuThrottleCount++;
                }

                yield derivation;
            }
        } catch (error) {
            console.debug('Error in output stream creation:', error.message);

        }
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
                // Call back to reasoner to handle the derivation (emit events etc)
                this.reasoner._processDerivation(derivation);
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

    getMetrics() {
        this._updatePerformanceMetrics();
        return {
            ...this.metrics,
            ...this.performance,
            outputConsumerSpeed: this.outputConsumerSpeed
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
}
