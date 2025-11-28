/**
 * @file testUtils.js
 * @description Common test utilities following AGENTS.md guidelines
 *
 * NOTE: This file now uses the organized test utilities from testOrganizer.js
 * for better maintainability and reduced duplication
 */

// Re-export organized test utilities for backward compatibility and ease of use
export * from './testOrganizer.js';
// Since testOrganizer.js already consolidates utilities from baseTestUtils.js and flexibleTestUtils.js,
// we don't need to additionally export * from those sources to avoid conflicts
// We can safely export the other independent modules
export * from './narTestSetup.js';
export * from './factories.js';
export * from './commonTestSuites.js';
export * from './generalTestSuites.js';
// We'll specifically export non-conflicting items from flexibleTestUtils.js
export {
    flexibleTruthUtils,
    flexibleTestConfig,
    flexibleTestWrappers,
    parameterizedTestUtils
} from './flexibleTestUtils.js';
export * from './TestTemplateFactory.js';