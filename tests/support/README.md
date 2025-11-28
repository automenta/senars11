# Test Utilities Support Directory

This directory contains all the consolidated test utilities for the SeNARS project, following the AGENTS.md guidelines for elegant, consolidated, consistent, organized, and deeply deduplicated code.

## Structure

The test utilities are organized as follows:

### Core Utilities
- `baseTestUtils.js` - Core assertion and testing utilities
- `factories.js` - Test data factories for creating consistent test objects
- `narTestSetup.js` - NAR-specific test setup and patterns

### Consolidated Test Suites
- `consolidatedTestSuites.js` - Main collection of reusable test suites
- `testSuiteFactory.js` - Factory functions for creating comprehensive test suites
- `testOrganizer.js` - Centralized organization of all test utilities

### Specialized Utilities
- `flexibleTestUtils.js` - Flexible assertions and parameterized tests
- `testCategorization.js` - Test organization, tagging, and categorization
- `testErrorHandling.js` - Comprehensive error handling utilities

### Convenience Files
- `testUtils.js` - Main entry point that re-exports all utilities
- `index.js` - Alternative entry point for importing test utilities
- `TestTemplateFactory.js` - Template-based test creation utilities

## Usage

### For New Tests
Use the main entry point:
```javascript
import { createTestTask, flexibleAssertions, StandardTestSuites } from './testUtils.js';
```

Or use the index file:
```javascript
import { TestSuiteFactory, taggedTest } from './support/index.js';
```

### Recommended Patterns

1. **For NAR Integration Tests**:
   ```javascript
   import { createNARIntegrationSuite } from './support/testSuiteFactory.js';
   createNARIntegrationSuite(config);
   ```

2. **For Data Model Tests**:
   ```javascript
   import { StandardTestSuites } from './support/consolidatedTestSuites.js';
   StandardTestSuites.dataModel(className, Constructor, options);
   ```

3. **For Parameterized Tests**:
   ```javascript
   import { parameterizedTestUtils } from './support/flexibleTestUtils.js';
   parameterizedTestUtils.runWithParams(testCases, testFn);
   ```

4. **For Test Categorization**:
   ```javascript
   import { taggedTest, TestCategorization } from './support/testCategorization.js';
   taggedTest([TestCategorization.Tags.UNIT, TestCategorization.Tags.CORE], 'test name', testFn);
   ```

## Deprecation Notice

Some older test utility files (generalTestSuites.js, commonTestSuites.js, enhancedTestSuites.js) have been deprecated and now re-export functionality from the consolidated files. All new tests should use the consolidated utilities.

## Performance Optimizations

The utilities include performance optimizations such as:
- Object caching to avoid repeated creation
- Batch processing for multiple operations
- Efficient collection searching
- Asynchronous operation optimizations

All utilities follow consistent async/await patterns and provide flexible assertion methods that support tolerance-based comparisons for more robust tests.