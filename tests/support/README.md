# Test Utilities Support Directory

This directory contains all the consolidated test utilities for the SeNARS project, following the AGENTS.md guidelines
for elegant, consolidated, consistent, organized, and deeply deduplicated code.

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

## Test Patterns and Best Practices

### Writing Non-Brittle Tests

**Use Custom Matchers for Flexibility:**
```javascript
// ❌ Brittle - exact match
expect(task.truth.f).toBe(0.90);

// ✅ Flexible - tolerance-based  
expect(task.truth).toHaveTruthCloseTo({f: 0.90, c: 0.85}, 0.02);
```

**Use TaskMatch for Complex Matching:**
```javascript
const matcher = new TaskMatch('<cat --> animal>')
    .withMinimumTruth(0.8, 0.7)
    .withPunctuation('.');
```

**Use Range Assertions for Probabilistic Behavior:**
```javascript
// ❌ Brittle - exact count
expect(memory.stats.totalConcepts).toBe(10);

// ✅ Flexible - range
expect(memory.stats.totalConcepts).toBeGreaterThan(8);
expect(memory.stats.totalConcepts).toBeLessThanOrEqual(10);
```

### Anti-Patterns to Avoid

- **Hardcoded exact values** for probabilistic systems
- **Timing dependencies** (use deterministic approaches)
- **Large test data** in test files (use factories)
- **Duplicated setup code** (use shared fixtures)

## Performance Optimizations

The utilities include performance optimizations such as:

- Object caching to avoid repeated creation
- Batch processing for multiple operations
- Efficient collection searching
- Asynchronous operation optimizations

All utilities follow consistent async/await patterns and provide flexible assertion methods that support tolerance-based
comparisons for more robust tests.