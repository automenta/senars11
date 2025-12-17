// Unit Test Setup
// This file sets up the environment for unit tests with real objects and minimal dependencies

import { setupCustomMatchers } from '../support/test-matchers.js';

// Set up test-specific configurations
process.env.NODE_ENV = 'test';

// Setup custom Jest matchers for flexible assertions
setupCustomMatchers();

// Helper functions
const validateTestEnvironment = () => ({
    isValid: process.env.NODE_ENV === 'test',
    environment: process.env.NODE_ENV,
    timestamp: Date.now()
});

const createTestInstanceHelper = (config = {}) => ({ config: { ...config } });

// Validate test environment
const envValidation = validateTestEnvironment();
if (!envValidation.isValid) {
    console.warn('Warning: Not running in test environment');
}

// Global console silencing for cleaner test output
if (!process.env.SHOW_LOGS_IN_TESTS) {
    const noop = () => { };
    global.console = {
        ...console,
        log: noop,
        info: noop,
        warn: noop,
        error: noop,
        debug: noop,
    };
}

// Create isolated test instances with real dependencies
global.createTestInstance = createTestInstanceHelper;

// Cleanup functions for after tests
afterEach(() => {
    // Any cleanup needed between tests
});

afterAll(() => {
    // Any cleanup needed after all tests
});
