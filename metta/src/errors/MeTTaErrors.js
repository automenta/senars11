/**
 * MeTTaErrors.js - Custom error types for MeTTa interpreter
 */

export class MeTTaError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'MeTTaError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

export class OperationNotFoundError extends MeTTaError {
    constructor(operationName, context = {}) {
        super(`Operation ${operationName} not found`, { ...context, operationName });
        this.name = 'OperationNotFoundError';
    }
}

export class TypeError extends MeTTaError {
    constructor(message, context = {}) {
        super(message, { ...context });
        this.name = 'TypeError';
    }
}

export class ReductionError extends MeTTaError {
    constructor(message, context = {}) {
        super(message, { ...context });
        this.name = 'ReductionError';
    }
}

export class ParseError extends MeTTaError {
    constructor(message, context = {}) {
        super(message, { ...context });
        this.name = 'ParseError';
    }
}