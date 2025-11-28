/**
 * @file tests/utils/test-errors.js
 * @description Custom error types for test-specific error handling
 *
 * NOTE: This file is being deprecated. All error types should be consolidated
 * in the support directory following AGENTS.md guidelines.
 */

// Re-export organized test utilities to maintain backward compatibility
export * from '../support/testUtils.js';
import { createTestTask } from '../support/baseTestUtils.js';

/**
 * Custom error for test environment issues
 */
export class TestEnvironmentError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestEnvironmentError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Custom error for test setup issues
 */
export class TestSetupError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestSetupError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Custom error for test teardown issues
 */
export class TestTeardownError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestTeardownError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Custom error for test assertion failures with additional context
 */
export class TestAssertionError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestAssertionError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Error handling utilities that follow AGENTS.md guidelines
 */
export const testErrorHandling = {
    /**
     * Assert that a function throws a specific error type with context
     */
    expectToThrow: (fn, expectedErrorType, expectedMessage) => {
        expect(() => fn()).toThrow(expectedErrorType);
        if (expectedMessage) {
            expect(() => fn()).toThrow(expectedMessage);
        }
    },

    /**
     * Assert that an async function throws a specific error type
     */
    expectToThrowAsync: async (asyncFn, expectedErrorType, expectedMessage) => {
        await expect(asyncFn()).rejects.toThrow(expectedErrorType);
        if (expectedMessage) {
            await expect(asyncFn()).rejects.toThrow(expectedMessage);
        }
    },

    /**
     * Validate error context information
     */
    validateErrorContext: (error, expectedContext) => {
        if (error.context) {
            Object.entries(expectedContext).forEach(([key, value]) => {
                expect(error.context[key]).toEqual(value);
            });
        }
    },

    /**
     * Catch and log errors with context for better debugging
     */
    catchWithContext: async (asyncOperation, context) => {
        try {
            return await asyncOperation();
        } catch (error) {
            const enhancedError = new TestAssertionError(
                `Error in ${context.operation}: ${error.message}`,
                { ...context, originalError: error }
            );
            console.error('Test error with context:', enhancedError);
            throw enhancedError;
        }
    },

    /**
     * Run operation with fallback in case of error
     */
    withFallback: async (operation, fallback, context = {}) => {
        try {
            return await operation();
        } catch (error) {
            console.warn(`Operation failed, using fallback: ${error.message}`, context);
            return await fallback(error);
        }
    }
};

export default {
    TestEnvironmentError,
    TestSetupError,
    TestTeardownError,
    TestAssertionError,
    testErrorHandling
};