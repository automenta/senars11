// Integration Test Setup
// This file sets up the environment for integration tests with real services

// Set up test-specific configurations for integration tests
process.env.NODE_ENV = 'test';

// Helper functions
const validateTestEnvironment = () => ({
    isValid: process.env.NODE_ENV === 'test',
    environment: process.env.NODE_ENV,
    timestamp: Date.now()
});

const generateTestId = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
const getIsolatedPort = () => Math.floor(Math.random() * 1000) + 8000;

// Validate test environment
const envValidation = validateTestEnvironment();
if (!envValidation.isValid) {
    console.warn('Warning: Not running in test environment');
}

// Global console silencing for cleaner test output
if (!process.env.SHOW_LOGS_IN_TESTS) {
    const noop = () => {
    };
    global.console = {
        ...console,
        log: noop,
        info: noop,
        warn: noop,
        error: noop,
        debug: noop,
    };
}

// Initialize any shared resources needed for integration tests
beforeAll(async () => {
    // Generate unique test ID for isolation
    global.testId = generateTestId();
    global.testPort = getIsolatedPort();
});

// Clean up resources after all tests
afterAll(async () => {
    // Clean up globals
    global.testId = undefined;
    global.testPort = undefined;
});

// Reset state between tests if needed
beforeEach(() => {
});

afterEach(() => {
});
