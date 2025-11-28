/**
 * @file testOrganizer.js
 * @description Consolidated, organized test utilities following AGENTS.md guidelines
 *
 * This file organizes core test utilities for consistency and maintainability.
 */

// Import core utilities
import * as baseUtils from './baseTestUtils.js';
import * as factories from './factories.js';

// Import specific utilities only when needed to avoid unnecessary complexity
import {
    flexibleAssertions as _flexibleAssertions,
    flexibleTruthUtils as _flexibleTruthUtils,
    flexibleTestConfig as _flexibleTestConfig,
    flexibleTestWrappers as _flexibleTestWrappers,
    parameterizedTestUtils as _parameterizedTestUtils
} from './flexibleTestUtils.js';

import {
    TestEnvironmentError as _TestEnvironmentError,
    TestSetupError as _TestSetupError,
    TestTeardownError as _TestTeardownError,
    TestAssertionError as _TestAssertionError
} from './testErrorHandling.js';

import { TestSuiteFactory as _TestSuiteFactory } from './testSuiteFactory.js';

/**
 * Consolidated test utilities organized by functionality
 */
const TestOrganizer = {
    // Core assertions
    assertions: {
        flexible: _flexibleAssertions,
        truth: baseUtils.truthAssertions,
        task: baseUtils.taskAssertions,
        memory: baseUtils.memoryAssertions,
        stringRepresentation: baseUtils.stringRepresentationTests
    },

    // Test patterns
    patterns: {
        initialization: baseUtils.initializationTests,
        equality: baseUtils.equalityTests,
        errorHandling: baseUtils.errorHandlingTests,
        async: baseUtils.asyncTests,
        parameterized: baseUtils.parameterizedTests
    },

    // Factories and test data
    factories: {
        ...factories,
        testData: baseUtils.testData,
        commonTruthValues: baseUtils.COMMON_TRUTH_VALUES,
        commonBudgetValues: baseUtils.COMMON_BUDGET_VALUES
    },

    // Test suites
    suites: {
        comprehensive: baseUtils.comprehensiveTestSuites,
        factory: _TestSuiteFactory
    },

    // Flexible utilities
    flexible: {
        assertions: _flexibleAssertions,
        truth: _flexibleTruthUtils,
        config: _flexibleTestConfig,
        wrappers: _flexibleTestWrappers,
        parameterized: _parameterizedTestUtils
    },

    // Error handling
    errorHandling: {
        TestEnvironmentError: _TestEnvironmentError,
        TestSetupError: _TestSetupError,
        TestTeardownError: _TestTeardownError,
        TestAssertionError: _TestAssertionError
    },

    // Helper functions
    helpers: {
        waitForCondition: baseUtils.waitForCondition,
        runPerformanceTest: baseUtils.runPerformanceTest,
        testImmutability: baseUtils.testImmutability
    }
};

// Export named exports for easy access
export const {
    assertions,
    patterns,
    factories: testFactories,
    suites,
    flexible,
    errorHandling,
    helpers
} = TestOrganizer;

// Export the organizer itself
export { TestOrganizer };

// Default export
export default TestOrganizer;