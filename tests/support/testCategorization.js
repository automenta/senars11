/**
 * @file testCategorization.js
 * @description Utilities for organizing, categorizing, and tagging tests for better structure
 * Following AGENTS.md guidelines for organized and structured code
 */

/**
 * Test categorization and organization utilities
 */
export const TestCategorization = {
    /**
     * Tags for test categorization
     */
    Tags: {
        // Performance related tests
        PERFORMANCE: 'performance',
        BENCHMARK: 'benchmark',
        STRESS: 'stress',
        LOAD: 'load',
        
        // Functionality categories
        UNIT: 'unit',
        INTEGRATION: 'integration',
        E2E: 'e2e',
        REGRESSION: 'regression',
        
        // Quality attributes
        CORRECTNESS: 'correctness',
        RELIABILITY: 'reliability',
        ROBUSTNESS: 'robustness',
        ERROR_HANDLING: 'errorHandling',
        
        // Feature categories
        CORE: 'core',
        MEMORY: 'memory',
        REASONING: 'reasoning',
        PARSING: 'parsing',
        COMMUNICATION: 'communication',
        
        // Test methodology
        PARAMETERIZED: 'parameterized',
        PROPERTY_BASED: 'propertyBased',
        MOCK_FREE: 'mockFree',
        DETERMINISTIC: 'deterministic',
        FLAKY_PRONE: 'flakyProne'
    },

    /**
     * Organizes tests by feature and type
     */
    organizeByFeature: (feature, testFn) => {
        describe(`[${feature}]`, () => {
            testFn();
        });
    },

    /**
     * Tags a test with specific categories
     */
    taggedTest: (tags, name, testFn) => {
        const tagString = tags.map(tag => `[${tag}]`).join(' ');
        test(`${tagString} ${name}`, testFn);
    },

    /**
     * Creates a categorized test suite
     */
    createCategorizedSuite: (config) => {
        const {
            name,
            category,
            tests,
            tags = [],
            setupFn,
            teardownFn
        } = config;

        describe(`${category ? `[${category}] ` : ''}${name}`, () => {
            if (setupFn) {
                beforeEach(setupFn);
            }

            if (teardownFn) {
                afterEach(teardownFn);
            }

            tests.forEach(({name, testFn, tags: testTags = []}) => {
                const allTags = [...tags, ...testTags];
                if (allTags.length > 0) {
                    TestCategorization.taggedTest(allTags, name, testFn);
                } else {
                    test(name, testFn);
                }
            });
        });
    },

    /**
     * Skips tests based on environment or conditions
     */
    conditionalTest: (condition, name, testFn) => {
        if (condition) {
            test(name, testFn);
        } else {
            test.skip(name, testFn);
        }
    },

    /**
     * Creates performance-focused test suites
     */
    createPerformanceSuite: (config) => {
        const {
            name,
            tests,
            maxDurationMs = 1000
        } = config;

        TestCategorization.createCategorizedSuite({
            name: `${name} [PERFORMANCE]`,
            category: 'performance',
            tests: tests.map(testConfig => ({
                ...testConfig,
                testFn: async () => {
                    const start = Date.now();
                    await testConfig.testFn();
                    const duration = Date.now() - start;
                    expect(duration).toBeLessThan(maxDurationMs);
                }
            })),
            tags: [TestCategorization.Tags.PERFORMANCE, TestCategorization.Tags.BENCHMARK]
        });
    },

    /**
     * Test suite builder for complex hierarchical organization
     */
    SuiteBuilder: class {
        constructor(name) {
            this.name = name;
            this.tests = [];
            this.setup = null;
            this.teardown = null;
            this.tags = [];
        }

        addTest(name, testFn, tags = []) {
            this.tests.push({name, testFn, tags});
            return this;
        }

        addSetup(setupFn) {
            this.setup = setupFn;
            return this;
        }

        addTeardown(teardownFn) {
            this.teardown = teardownFn;
            return this;
        }

        addTags(tags) {
            this.tags = [...this.tags, ...tags];
            return this;
        }

        build() {
            return TestCategorization.createCategorizedSuite({
                name: this.name,
                category: this.tags.includes(TestCategorization.Tags.UNIT) ? 'unit' : 'general',
                tests: this.tests,
                tags: this.tags,
                setupFn: this.setup,
                teardownFn: this.teardown
            });
        }
    }
};

/**
 * Fluent API for test organization
 */
export const withTags = (tags) => ({
    test: (name, testFn) => TestCategorization.taggedTest(tags, name, testFn),
    suite: (config) => TestCategorization.createCategorizedSuite({...config, tags})
});

/**
 * Export convenience functions
 */
export const {
    taggedTest,
    createCategorizedSuite,
    conditionalTest,
    createPerformanceSuite
} = TestCategorization;

/**
 * Default export
 */
export default TestCategorization;