/**
 * Error handling utilities for the reasoner
 */

/**
 * Custom error classes for specific reasoner errors
 */
export class ReasonerError extends Error {
    constructor(message, code = 'REASONER_ERROR', details = null) {
        super(message);
        this.name = 'ReasonerError';
        this.code = code;
        this.details = details;
        this.timestamp = Date.now();
    }
}

export class RuleExecutionError extends ReasonerError {
    constructor(message, ruleId = null, details = null) {
        super(message, 'RULE_EXECUTION_ERROR', details);
        this.name = 'RuleExecutionError';
        this.ruleId = ruleId;
    }
}

export class PremiseSourceError extends ReasonerError {
    constructor(message, sourceType = null, details = null) {
        super(message, 'PREMISE_SOURCE_ERROR', details);
        this.name = 'PremiseSourceError';
        this.sourceType = sourceType;
    }
}

export class StreamProcessingError extends ReasonerError {
    constructor(message, streamType = null, details = null) {
        super(message, 'STREAM_PROCESSING_ERROR', details);
        this.name = 'StreamProcessingError';
        this.streamType = streamType;
    }
}

/**
 * Log error with context
 * @param {Error} error - Error to log
 * @param {object} context - Context information
 * @param {string} level - Log level ('error', 'warn', 'info')
 */
export function logError(error, context = {}, level = 'error') {
    const logFunc = console[level] || console.error;

    logFunc({
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        timestamp: new Date().toISOString(),
        context
    });
}

/**
 * Try-catch wrapper that returns [error, result] tuple
 * @param {Function} fn - Function to execute
 * @param {...any} args - Arguments to pass to function
 * @returns {Array} [error, result] tuple
 */
export async function tryCatch(fn, ...args) {
    try {
        const result = await (typeof fn === 'function' ? fn(...args) : fn);
        return [null, result];
    } catch (error) {
        return [error, null];
    }
}

/**
 * Create an error handler with context
 * @param {string} context - Context for the error handler
 * @returns {Function} Error handler function
 */
export function createErrorHandler(context) {
    return (error, additionalContext = {}) => {
        logError(error, {...additionalContext, context});
        throw new ReasonerError(
            `Error in ${context}: ${error.message}`,
            'CONTEXT_ERROR',
            {originalError: error, context, ...additionalContext}
        );
    };
}

/**
 * Wrap an async function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context for error handling
 * @returns {Function} Wrapped function
 */
export function withErrorHandler(fn, context) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const errorHandler = createErrorHandler(context);
            return errorHandler(error);
        }
    };
}