/**
 * Standardized error handling utilities for SeNARS
 */

// Specific error types for better error categorization
export class SeNARSError extends Error {
    constructor(message, type = 'General') {
        super(message);
        this.name = `SeNARSError.${type}`;
        this.type = type;
    }
}

export class ConnectionError extends SeNARSError {
    constructor(message) {
        super(message, 'Connection');
    }
}

export class ModelNotFoundError extends SeNARSError {
    constructor(modelName) {
        super(`Model '${modelName}' not found. Please make sure the model is available.`, 'ModelNotFound');
        this.modelName = modelName;
    }
}

export class ParseError extends SeNARSError {
    constructor(message) {
        super(message, 'Parse');
    }
}

export class ConfigurationError extends SeNARSError {
    constructor(message) {
        super(message, 'Configuration');
    }
}

// Standard error handler with consistent formatting
export const handleError = (error, context = '', fallbackMessage = 'An error occurred') => {
    // Check for specific error types
    if (error instanceof ModelNotFoundError) {
        return `❌ Model Error: ${error.message}`;
    } else if (error instanceof ConnectionError) {
        return `❌ Connection Error: ${error.message}`;
    } else if (error instanceof ParseError) {
        return `❌ Parse Error: ${error.message}`;
    } else if (error instanceof ConfigurationError) {
        return `❌ Configuration Error: ${error.message}`;
    }

    // Check for specific error patterns
    if (error.message.includes('model') && error.message.includes('not found')) {
        return `❌ Model Error: ${error.message}`;
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return `❌ Connection Error: ${error.message}`;
    } else if (error.message.includes('Expected end of input')) {
        return `❌ Parse Error: Input may not be valid Narsese syntax`;
    }

    // Return formatted error with context
    return context
        ? `❌ ${context}: ${error.message || fallbackMessage}`
        : `❌ Error: ${error.message || fallbackMessage}`;
};

// Safe execution wrapper with error handling
export const safeExecute = async (operation, context = '', defaultValue = null) => {
    try {
        return await operation();
    } catch (error) {
        console.error(`[${context}] Error:`, error);
        return defaultValue;
    }
};

// Error logger with consistent format
export const logError = (error, context = '') => {
    const errorMessage = handleError(error, context);
    console.error(`[ERROR] ${new Date().toISOString()} - ${errorMessage}`);
    return errorMessage;
};