/**
 * BaseMeTTaComponent.js - Base class for MeTTa subsystems
 * Extends SeNARS BaseComponent with MeTTa-specific functionality
 */

import { BaseComponent } from '../../util/BaseComponent.js';

/**
 * BaseMeTTaComponent - Base class for all MeTTa components
 * Provides common functionality: logging, metrics, events, lifecycle
 */
export class BaseMeTTaComponent extends BaseComponent {
    constructor(config = {}, name = 'BaseMeTTaComponent', eventBus = null, termFactory = null) {
        super(config, name, eventBus);
        this.termFactory = termFactory;
        this._mettaMetrics = new Map();
    }

    // ===== MeTTa-specific helpers =====

    /**
     * Emit MeTTa-namespaced event
     * @param {string} eventName - Event name (without 'metta:' prefix)
     * @param {Object} data - Event data
     */
    emitMeTTaEvent(eventName, data) {
        this.emitEvent(`metta:${eventName}`, {
            component: this._name,
            timestamp: Date.now(),
            ...data
        });
    }

    /**
     * Update metrics for an operation
     * @param {string} metricKey - Metric key
     * @param {number} duration - Operation duration in ms
     * @private
     */
    _updateMetrics(metricKey, duration) {
        const current = this._mettaMetrics.get(metricKey) ?? { count: 0, totalTime: 0, errors: 0 };
        this._mettaMetrics.set(metricKey, {
            count: current.count + 1,
            totalTime: current.totalTime + duration,
            avgTime: (current.totalTime + duration) / (current.count + 1),
            errors: current.errors,
            lastDuration: duration
        });
    }

    /**
     * Record operation error in metrics
     * @param {string} metricKey - Metric key
     * @private
     */
    _recordError(metricKey) {
        const current = this._mettaMetrics.get(metricKey) ?? { count: 0, totalTime: 0, errors: 0 };
        this._mettaMetrics.set(metricKey, { ...current, errors: current.errors + 1 });
    }

    /**
     * Track a MeTTa operation with timing and metrics
     * @param {string} opName - Operation name
     * @param {Function} fn - Operation function
     * @returns {*} Operation result
     */
    trackOperation(opName, fn) {
        const start = Date.now();
        const metricKey = `${this._name}.${opName}`;

        try {
            const result = fn();
            const duration = Date.now() - start;

            this._updateMetrics(metricKey, duration);

            if (duration > (this.config.slowOpThreshold ?? 100)) {
                this.emitMeTTaEvent('slow-operation', { opName, duration });
            }

            return result;
        } catch (error) {
            this._recordError(metricKey);
            this.logError(`${opName} failed`, { error: error.message, stack: error.stack });
            this.emitMeTTaEvent('operation-error', { opName, error: error.message });
            throw error;
        }
    }

    /**
     * Track async operation
     * @param {string} opName - Operation name
     * @param {Function} fn - Async operation function
     * @returns {Promise<*>} Operation result
     */
    async trackOperationAsync(opName, fn) {
        const start = Date.now();
        const metricKey = `${this._name}.${opName}`;

        try {
            const result = await fn();
            this._updateMetrics(metricKey, Date.now() - start);
            return result;
        } catch (error) {
            this._recordError(metricKey);
            this.logError(`${opName} failed`, { error: error.message });
            this.emitMeTTaEvent('operation-error', { opName, error: error.message });
            throw error;
        }
    }

    /**
     * Get MeTTa-specific metrics
     * @returns {Object} Metrics object
     */
    getMeTTaMetrics() {
        const metrics = {};
        for (const [key, value] of this._mettaMetrics) {
            metrics[key] = { ...value };
        }
        return metrics;
    }

    /**
     * Reset MeTTa metrics
     */
    resetMeTTaMetrics() {
        this._mettaMetrics.clear();
    }

    /**
     * Get comprehensive stats including base and MeTTa metrics
     * @returns {Object} Combined stats
     */
    getStats() {
        return {
            ...super.getMetrics(),
            mettaMetrics: this.getMeTTaMetrics(),
            component: this._name
        };
    }
}
