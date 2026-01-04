// Unit Test Setup
// This file sets up the environment for unit tests with real objects and minimal dependencies

import {setupCustomMatchers} from '../support/test-matchers.js';
import {commonTestSetup, commonTestCleanup} from '../support/commonTestSetup.js';

// Setup custom Jest matchers for flexible assertions
setupCustomMatchers();

// Use common test setup
commonTestSetup({
    silenceConsole: true,
    setupGlobals: true,
    customGlobals: {}
});

// Cleanup functions for after tests
afterEach(() => {
    // Any cleanup needed between tests
});

afterAll(() => {
    // Clean up globals specific to unit tests
    commonTestCleanup(['createTestInstance']);
});
