import {Logger} from './Logger.js';
import {SystemConfig} from '../nar/SystemConfig.js';

const ERROR_TYPES = Object.freeze({
    LOGIC: 'logic',
    NETWORK: 'network',
    RESOURCE: 'resource',
    SYNTAX: 'syntax',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
});

const SEVERITY_LEVELS = Object.freeze({
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
});

class ErrorClassifier {
    static classify(error) {
        // More precise error classification
        const errorTypeMap = {
            [ERROR_TYPES.LOGIC]: ['TypeError', 'ReferenceError', 'RangeError', 'EvalError'],
            [ERROR_TYPES.NETWORK]: ['NetworkError', 'TimeoutError', 'AbortError'],
            [ERROR_TYPES.RESOURCE]: ['OutOfMemoryError', 'HeapError'],
            [ERROR_TYPES.SYNTAX]: ['SyntaxError'],
            [ERROR_TYPES.VALIDATION]: ['ValidationError']
        };

        // Check by error name
        for (const [type, names] of Object.entries(errorTypeMap)) {
            if (names.includes(error.name)) return type;
        }

        // Check by message patterns
        const message = error.message?.toLowerCase() || '';
        if (/(timeout|network|connection|fetch)/.test(message)) return ERROR_TYPES.NETWORK;
        if (/(memory|heap|out of memory)/.test(message)) return ERROR_TYPES.RESOURCE;
        if (/(validation|invalid|must be|cannot be)/.test(message)) return ERROR_TYPES.VALIDATION;

        return ERROR_TYPES.UNKNOWN;
    }

    static determineSeverity(error, provided) {
        // Return provided severity if specified
        if (provided) return provided;
        
        // Map error types to default severities
        const severityMap = {
            [ERROR_TYPES.LOGIC]: SEVERITY_LEVELS.HIGH,
            [ERROR_TYPES.NETWORK]: SEVERITY_LEVELS.MEDIUM,
            [ERROR_TYPES.RESOURCE]: SEVERITY_LEVELS.HIGH,
            [ERROR_TYPES.SYNTAX]: SEVERITY_LEVELS.HIGH,
            [ERROR_TYPES.VALIDATION]: SEVERITY_LEVELS.LOW,
            [ERROR_TYPES.UNKNOWN]: SEVERITY_LEVELS.MEDIUM,
        };
        
        return severityMap[this.classify(error)] || SEVERITY_LEVELS.MEDIUM;
    }
}

class ErrorTracker {
    constructor(maxErrorRate) {
        this.errorRateWindow = [];
        this.maxErrorRate = maxErrorRate;
        this.logger = Logger;
    }

    track(errorInfo) {
        this.errorRateWindow.push({timestamp: errorInfo.timestamp, severity: errorInfo.severity});
        this._cleanup();
        
        const errorRate = this.getErrorRate();
        if (errorRate > this.maxErrorRate) {
            this.logger.warn(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
        }
    }

    getErrorRate() {
        if (!this.errorRateWindow.length) return 0;
        
        const recentErrors = this.errorRateWindow.filter(err =>
            [SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.MEDIUM].includes(err.severity));
        return recentErrors.length / this.errorRateWindow.length;
    }

    _cleanup() {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        this.errorRateWindow = this.errorRateWindow.filter(err => err.timestamp > fiveMinutesAgo);
    }
    
    // Added method to get error counts by type
    getErrorCounts() {
        const counts = {};
        this.errorRateWindow.forEach(err => {
            const type = err.type || 'unknown';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }
}

class ErrorRecovery {
    constructor(recoveryAttemptsLimit, logger) {
        this.recoveryAttempts = new Map();
        this.recoveryAttemptsLimit = recoveryAttemptsLimit;
        this.logger = logger;
    }

    async attemptRecovery(errorInfo, options) {
        const errorKey = `${errorInfo.type}:${errorInfo.message.substring(0, 30)}`;
        const attempts = this.recoveryAttempts.get(errorKey) || 0;

        if (attempts >= this.recoveryAttemptsLimit) {
            this.logger.error(`Recovery failed after ${attempts} attempts: ${errorInfo.message}`);
            return {success: false, degraded: true, error: errorInfo};
        }

        this.recoveryAttempts.set(errorKey, attempts + 1);

        try {
            const recoveryResult = await this._executeRecovery(errorInfo, options);
            if (recoveryResult.success) {
                this.recoveryAttempts.delete(errorKey);
                this.logger.info(`Recovery successful: ${errorInfo.message}`);
                return recoveryResult;
            }
        } catch (recoveryError) {
            this.logger.error('Recovery process failed:', recoveryError);
        }

        return {success: false, degraded: true, error: errorInfo};
    }

    async _executeRecovery(errorInfo, options) {
        // Simplified recovery strategy mapping
        const strategies = new Map([
            [ERROR_TYPES.NETWORK, () => ({success: false, needsRetry: true})],
            [ERROR_TYPES.RESOURCE, () => ({success: false, degraded: true})],
            [ERROR_TYPES.VALIDATION, (err, opts) =>
                opts.defaultValue !== undefined
                    ? {success: true, value: opts.defaultValue}
                    : {success: false, skip: true}
            ],
            // Generic fallback for all other error types
            ['default', () => ({success: false, degraded: true})]
        ]);

        const strategy = strategies.get(errorInfo.type) || strategies.get('default');
        return await strategy(errorInfo, options);
    }
    
    // Added method to reset recovery attempts for a specific error
    resetRecoveryAttempts(errorType, message) {
        const errorKey = `${errorType}:${message.substring(0, 30)}`;
        this.recoveryAttempts.delete(errorKey);
    }
    
    // Added method to get current recovery attempts
    getRecoveryAttempts() {
        return new Map(this.recoveryAttempts);
    }
}

export class ErrorHandling {
    constructor(config = {}) {
        this.config = SystemConfig.from(config);
        this.logger = Logger;
        this.errorRegistry = new Map();
        this.degradationLevel = 0;

        const errorConfig = this.config.get('errorHandling') || {};
        this.tracker = new ErrorTracker(errorConfig.maxErrorRate || 0.1);
        this.recovery = new ErrorRecovery(errorConfig.recoveryAttempts || 3, this.logger);
        this.enableRecovery = errorConfig.enableRecovery ?? true;
    }

    async handleError(error, context = {}, options = {}) {
        const errorInfo = this._createErrorInfo(error, context, options);

        this._logError(errorInfo);
        this.tracker.track(errorInfo);
        this._registerError(errorInfo);
        this._assessDegradation();

        if (this.enableRecovery && options.attemptRecovery !== false) {
            return await this.recovery.attemptRecovery(errorInfo, options);
        }

        if (this.config.get('errorHandling.enableGracefulDegradation')) {
            return {success: false, degraded: true, error: errorInfo};
        }

        throw error;
    }

    _createErrorInfo(error, context, options) {
        return {
            error,
            message: error.message || 'Unknown error',
            stack: error.stack,
            context,
            timestamp: Date.now(),
            type: ErrorClassifier.classify(error),
            severity: ErrorClassifier.determineSeverity(error, options.severity)
        };
    }

    _logError(errorInfo) {
        const level = {high: 'error', medium: 'warn', low: 'info'}[errorInfo.severity] || 'error';
        this.logger[level](`Error [${errorInfo.type}][${errorInfo.severity}]: ${errorInfo.message}`, {
            context: errorInfo.context, stack: errorInfo.stack, timestamp: errorInfo.timestamp
        });
    }

    _registerError(errorInfo) {
        const key = `${errorInfo.type}:${errorInfo.message.substring(0, 50)}`;
        const entry = this.errorRegistry.get(key) || {count: 0, lastSeen: 0, instances: []};

        entry.count++;
        entry.lastSeen = errorInfo.timestamp;
        entry.instances = [...entry.instances.slice(-9), {
            timestamp: errorInfo.timestamp,
            context: errorInfo.context,
            severity: errorInfo.severity
        }];

        this.errorRegistry.set(key, entry);
    }

    _assessDegradation() {
        const currentErrorRate = this.tracker.getErrorRate();
        const maxErrorRate = this.config.get('errorHandling.maxErrorRate') || 0.1;

        if (currentErrorRate > maxErrorRate) {
            this.degradationLevel = Math.min(1, this.degradationLevel + 0.1);
            this.logger.warn(`System degrading: ${(currentErrorRate * 100).toFixed(2)}%`, {degradationLevel: this.degradationLevel});
        } else if (this.degradationLevel > 0 && currentErrorRate < maxErrorRate * 0.5) {
            this.degradationLevel = Math.max(0, this.degradationLevel - 0.05);
        }
    }

    getDegradationLevel() {
        return this.degradationLevel;
    }
    
    isDegraded() {
        return this.degradationLevel > 0.5;
    }
    
    getStats() {
        return {
            degradationLevel: this.degradationLevel,
            errorRate: this.tracker.getErrorRate(),
            totalErrors: this.tracker.errorRateWindow.length,
            errorRegistrySize: this.errorRegistry.size,
            recoveryAttempts: this.recovery.getRecoveryAttempts(),
            registeredErrors: Array.from(this.errorRegistry.entries()).map(([key, value]) => ({
                key, count: value.count, lastSeen: value.lastSeen, instances: value.instances.length
            })),
            errorCountsByType: this.tracker.getErrorCounts()
        };
    }
    
    resetStats() {
        this.errorRegistry.clear();
        this.tracker.errorRateWindow = [];
        this.recovery.recoveryAttempts.clear();
        this.degradationLevel = 0;
    }
    
    getErrorTypes() {
        return Object.values(ERROR_TYPES);
    }
    
    // Added utility methods
    resetRecoveryAttempts(errorType, message) {
        this.recovery.resetRecoveryAttempts(errorType, message);
    }
    
    clearErrorRegistry() {
        this.errorRegistry.clear();
    }
}

// Export singleton instance
export const GlobalErrorHandler = new ErrorHandling();