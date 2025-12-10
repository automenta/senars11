/**
 * @file testErrorHandling.js
 * @description Comprehensive test error handling utilities following AGENTS.md guidelines
 *
 * Error handling: Use specific error types, log with context, avoid empty catch blocks,
 * prefer early returns, handle errors at appropriate abstraction level
 */

/**
 * Specific error types for different test scenarios
 */
export class TestEnvironmentError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestEnvironmentError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

export class TestSetupError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestSetupError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

export class TestTeardownError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestTeardownError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

export class TestAssertionError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TestAssertionError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Comprehensive error handling utilities
 */
export const TestErrorHandling = {
    /**
     * Error assertion utilities
     */
    assertions: {
        /**
         * Assert that a function throws a specific error type with optional message
         */
        expectToThrow: (fn, expectedErrorType, expectedMessage = null) => {
            expect(() => fn()).toThrow(expectedErrorType);
            if (expectedMessage) {
                expect(() => fn()).toThrow(expectedMessage);
            }
        },

        /**
         * Assert that an async function rejects with specific error type
         */
        expectToThrowAsync: async (asyncFn, expectedErrorType, expectedMessage = null) => {
            await expect(asyncFn()).rejects.toThrow(expectedErrorType);
            if (expectedMessage) {
                await expect(asyncFn()).rejects.toThrow(expectedMessage);
            }
        },

        /**
         * Assert that errors contain expected context
         */
        expectErrorContext: (error, expectedContext) => {
            if (!error.context) {
                throw new TestAssertionError('Error does not contain context', {error});
            }

            Object.entries(expectedContext).forEach(([key, expectedValue]) => {
                expect(error.context[key]).toEqual(expectedValue);
            });
        },

        /**
         * Assert error name/type matches expected
         */
        expectErrorType: (error, expectedType) => {
            if (typeof expectedType === 'string') {
                expect(error.name).toBe(expectedType);
            } else {
                expect(error).toBeInstanceOf(expectedType);
            }
        }
    },

    /**
     * Error handling patterns following AGENTS.md guidelines
     */
    patterns: {
        /**
         * Try-catch with error context that includes additional debugging info
         */
        tryWithLog: (operation, context) => {
            try {
                return operation();
            } catch (error) {
                const enhancedError = new TestAssertionError(
                    `Operation failed: ${error.message}`,
                    {...context, originalError: error, operation: operation.toString()}
                );
                console.error('Test operation failed:', enhancedError);
                throw enhancedError;
            }
        },

        /**
         * Async try-catch with error context
         */
        tryWithLogAsync: async (asyncOperation, context) => {
            try {
                return await asyncOperation();
            } catch (error) {
                const enhancedError = new TestAssertionError(
                    `Async operation failed: ${error.message}`,
                    {...context, originalError: error}
                );
                console.error('Async test operation failed:', enhancedError);
                throw enhancedError;
            }
        },

        /**
         * Run operation with graceful fallback
         */
        withFallback: async (operation, fallback, context = {}) => {
            try {
                return await operation();
            } catch (error) {
                console.warn('Operation failed, using fallback:', error.message, context);
                return await fallback(error, context);
            }
        },

        /**
         * Early return pattern for error handling
         */
        earlyReturnIfError: (value, errorCondition, errorMessage) => {
            if (errorCondition(value)) {
                throw new TestAssertionError(errorMessage, {value});
            }
            return value;
        }
    },

    /**
     * Validation utilities for error scenarios
     */
    validation: {
        /**
         * Validate that inputs produce expected errors
         */
        validateErrorScenarios: (testFn, errorScenarios) => {
            errorScenarios.forEach(({input, expectedErrorType, description}) => {
                test(`should throw ${expectedErrorType?.name || expectedErrorType} for ${description}`, () => {
                    expect(() => testFn(input)).toThrow(expectedErrorType);
                });
            });
        },

        /**
         * Validate error messages contain appropriate context
         */
        validateErrorMessage: (error, requiredContext) => {
            if (typeof error.message !== 'string') {
                throw new TestAssertionError('Error message is not a string', {error});
            }

            requiredContext.forEach(contextPart => {
                expect(error.message.toLowerCase()).toContain(contextPart.toLowerCase());
            });
        }
    },

    /**
     * Utility for creating test error scenarios
     */
    createErrorScenario: (errorType, message, context = {}) => {
        switch (errorType) {
            case 'environment':
                return new TestEnvironmentError(message, context);
            case 'setup':
                return new TestSetupError(message, context);
            case 'teardown':
                return new TestTeardownError(message, context);
            case 'assertion':
            default:
                return new TestAssertionError(message, context);
        }
    }
};

// Export convenience functions
export const {
    assertions,
    patterns,
    validation
} = TestErrorHandling;

/**
 * Default export
 */
export default TestErrorHandling;