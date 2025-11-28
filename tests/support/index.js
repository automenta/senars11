/**
 * @file tests/support/index.js
 * @description Main entry point for all test utilities following AGENTS.md guidelines
 *
 * This file provides a clean, organized import interface for all test utilities
 */

// Export the main organized test utilities
export * from './testOrganizer.js';

// For convenience, also provide direct access to the most commonly used utilities
export {
  // Assertion utilities
  truthAssertions,
  taskAssertions,
  memoryAssertions,
  flexibleAssertions,

  // Factory functions
  createTask,
  createTerm,
  createTruth,
  createMemory,
  createTestTask,
  createTestMemory,
  createTestTaskBag,

  // Test patterns
  initializationTests,
  equalityTests,
  stringRepresentationTests,
  errorHandlingTests,
  asyncTests,
  parameterizedTests,

  // Comprehensive test suites
  comprehensiveTestSuites,

  // Utilities
  waitForCondition,
  runPerformanceTest,
  testImmutability
} from './testOrganizer.js';

// Export test constants
export { TEST_CONSTANTS, COMMON_TRUTH_VALUES, COMMON_BUDGET_VALUES } from './factories.js';

// Default export of the main organizer
export { default } from './testOrganizer.js';