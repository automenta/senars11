/**
 * Error Handling Utilities: Centralized error handling patterns
 * Following AGENTS.md: Error handling with context, specific error types
 */

import {getStore} from '../utils/messageHandlers.js';

// Specific error types for better error handling
export class WebSocketError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'WebSocketError';
        this.code = code;
    }
}

export class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

export class NetworkError extends Error {
    constructor(message, status = null) {
        super(message);
        this.name = 'NetworkError';
        this.status = status;
    }
}

export class DataProcessingError extends Error {
    constructor(message, data = null) {
        super(message);
        this.name = 'DataProcessingError';
        this.data = data;
    }
}

// Centralized error logging with context
export const logError = (error, context = '', additionalInfo = {}) => {
    const errorInfo = {
        timestamp: Date.now(),
        message: error?.message || 'Unknown error',
        name: error?.name || 'UnknownError',
        stack: error?.stack,
        context,
        additionalInfo,
        url: typeof window !== 'undefined' ? window.location.href : 'N/A'
    };

    console.error('Application Error:', errorInfo);

    // Send error to store for UI notifications if available
    try {
        getStore()?.addNotification?.({
            type: 'error',
            title: `${errorInfo.name} in ${context || 'Unknown Context'}`,
            message: errorInfo.message,
            timestamp: errorInfo.timestamp,
            ...(errorInfo.additionalInfo && {details: errorInfo.additionalInfo})
        });
    } catch (notificationError) {
        // If notification fails, at least log to console
        console.warn('Failed to send error notification:', notificationError);
    }

    return errorInfo;
};

// Safe execution wrapper with error handling
export const safeExecute = async (operation, context = '', onError = null, defaultReturn = null) => {
    try {
        return await operation();
    } catch (error) {
        const errorInfo = logError(error, context);

        if (onError) {
            try {
                return await onError(error, errorInfo);
            } catch (handlerError) {
                logError(handlerError, `${context} - error handler`);
            }
        }

        return defaultReturn;
    }
};

// Safe execution wrapper for synchronous operations
export const safeExecuteSync = (operation, context = '', onError = null, defaultReturn = null) => {
    try {
        return operation();
    } catch (error) {
        const errorInfo = logError(error, context);

        if (onError) {
            try {
                return onError(error, errorInfo);
            } catch (handlerError) {
                logError(handlerError, `${context} - error handler`);
            }
        }

        return defaultReturn;
    }
};

// Enhanced error handler with retry logic
export const withRetry = async (operation, maxRetries = 3, delay = 1000, context = '') => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                logError(error, `${context} - attempt ${attempt}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
            } else {
                logError(error, `${context} - final attempt ${attempt}/${maxRetries}`);
            }
        }
    }

    throw lastError;
};

// Error boundary utility functions for components
export const handleComponentError = (error, errorInfo, componentName = 'UnknownComponent') => {
    logError(error, `${componentName} - React Error Boundary`, {componentStack: errorInfo?.componentStack});

    // Return a user-friendly error representation
    return {
        hasError: true,
        error: error,
        errorInfo: errorInfo,
        friendlyMessage: error?.message?.includes('Failed to fetch')
            ? 'Connection to server failed. Please check your network connection.'
            : 'An unexpected error occurred. Please try again.'
    };
};

// Validation utility with proper error types
export const validateWithErrors = (data, validations) => {
    const errors = [];

    for (const [field, validator] of Object.entries(validations)) {
        try {
            const isValid = typeof validator === 'function'
                ? validator(data[field], data)
                : validator.test(data[field]);

            if (!isValid) {
                errors.push(new ValidationError(`Invalid ${field}`, field));
            }
        } catch (validationError) {
            errors.push(new ValidationError(`Validation failed for ${field}: ${validationError.message}`, field));
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// API request wrapper with proper error handling
export const apiRequest = async (url, options = {}, context = '') => {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, response.status);
        }

        return await response.json();
    } catch (error) {
        if (error instanceof NetworkError) {
            throw error;
        }

        throw new NetworkError(error?.message || 'Network request failed');
    }
};

// WebSocket error handler with connection state awareness
export const handleWebSocketError = (error, wsService, context = '') => {
    const errorInfo = logError(error, `WebSocket - ${context}`);

    // Check if it's a connection error that might require reconnection
    if (error?.message?.includes('connection') || error?.message?.includes('closed')) {
        // Attempt to reconnect if service is available
        try {
            wsService?.attemptReconnect?.();
        } catch (reconnectError) {
            logError(reconnectError, 'WebSocket reconnection attempt failed');
        }
    }

    return errorInfo;
};