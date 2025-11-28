/**
 * @file enhancedTestSuites.js
 * @description Enhanced test suites - DEPRECATED
 *
 * NOTE: This file is being deprecated. All functionality has been consolidated
 * into consolidatedTestSuites.js following AGENTS.md guidelines.
 */

// Re-export all functionality from the consolidated test suites
export * from './consolidatedTestSuites.js';
export * from './baseTestUtils.js';
export * from './factories.js';
export * from './testSuiteFactory.js';

// For backward compatibility, provide the original exports as aliases
import { FlexibleTestPatterns, StandardTestSuites, NARTestSuites } from './consolidatedTestSuites.js';
import { errorHandlingTests, flexibleAssertions, truthAssertions } from './baseTestUtils.js';
import { createTask, createTerm, createTruth } from './factories.js';

export const EnhancedTestSuites = {
    dataModel: (config) => {
        const {
            className,
            Constructor,
            testCases = [],
            options = {}
        } = config;

        describe(`${className} Tests`, () => {
            // Run all test cases with flexible assertions
            testCases.forEach(({name, input, expected, assertion}) => {
                FlexibleTestPatterns.flexibleObjectTest(
                    name,
                    () => new Constructor(input),
                    expected
                );
            });

            // Run standard data model tests if options provided
            if (options.validInput) {
                StandardTestSuites.dataModel(className, Constructor, options);
            }
        });
    },

    narIntegration: (config) => {
        const {narProvider, testScenarios = [], options = {}} = config;

        describe('NAR Integration Tests', () => {
            // Apply standard NAR test suites
            NARTestSuites.completeNARIntegration(narProvider);

            // Apply performance tests with flexible timing
            if (options.testPerformance !== false) {
                NARTestSuites.narPerformance(narProvider);
            }

            // Run custom test scenarios with flexible expectations
            testScenarios.forEach(({name, operation, expected}) => {
                FlexibleTestPatterns.timeFlexibleTest(
                    name,
                    async () => await operation(narProvider()),
                    expected?.maxDuration || 5000
                );
            });
        });
    },

    lifecycle: (config) => {
        const {
            componentName,
            createComponent,
            lifecycleTests = [],
            config: testConfig = {}
        } = config;

        describe(`${componentName} Lifecycle`, () => {
            let component;

            beforeEach(() => {
                component = createComponent(testConfig);
            });

            afterEach(() => {
                if (component?.destroy) component.destroy();
            });

            // Run standard lifecycle tests
            StandardTestSuites.lifecycleComponent(componentName, createComponent, testConfig);

            // Run custom lifecycle tests
            lifecycleTests.forEach(({name, testFn}) => {
                test(name, () => testFn(component));
            });
        });
    },

    errorHandling: (config) => {
        const {
            className,
            testFunction,
            invalidInputs = [],
            options = {}
        } = config;

        describe(`${className} Error Handling`, () => {
            if (options.useStandard !== false) {
                errorHandlingTests.standardErrorHandling(
                    testFunction,
                    invalidInputs,
                    options.errorType || Error
                );
            }

            // Additional flexible error handling tests
            invalidInputs.forEach((input, idx) => {
                FlexibleTestPatterns.retryableTest(
                    `handles error case ${idx} gracefully`,
                    () => {
                        try {
                            testFunction(input);
                            throw new Error('Should have thrown error');
                        } catch (e) {
                            expect(e).toBeInstanceOf(options.errorType || Error);
                        }
                    }
                );
            });
        });
    }
};

export const TestFactories = {
    createTruthTestSuite: (f, c) => ({
        className: 'Truth',
        Constructor: (args) => new Truth(args?.f ?? f, args?.c ?? c),
        testCases: [
            {
                name: 'frequency and confidence within tolerance',
                input: {f, c},
                expected: {f, c},
                assertion: (actual, expected) =>
                    flexibleAssertions.expectCloseTo(actual.f, expected.f, 0.01) &&
                    flexibleAssertions.expectCloseTo(actual.c, expected.c, 0.01)
            }
        ],
        options: {
            validInput: {f, c},
            expectedProperties: {f, c},
            expectedString: `%${f.toFixed(2)};${c.toFixed(2)}%`,
            immutable: true,
            testEquality: true
        }
    }),

    createTaskTestSuite: (term, punctuation = '.') => ({
        className: 'Task',
        Constructor: (args) => createTask({
            term: args?.term || term,
            punctuation: args?.punctuation || punctuation
        }),
        testCases: [
            {
                name: 'task has correct term and punctuation',
                input: {term, punctuation},
                expected: {punctuation},
                assertion: (actual, expected) => {
                    expect(actual.punctuation).toBe(expected.punctuation);
                    expect(actual.term.toString()).toBe(term.toString());
                }
            }
        ],
        options: {
            validInput: {term, punctuation},
            expectedProperties: {punctuation},
            immutable: true,
            testEquality: true
        }
    })
};

export class AbstractTestSuite {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.setupFn = config.setup || (() => {
        });
        this.teardownFn = config.teardown || (() => {
        });
    }

    async setup() {
        await this.setupFn();
    }

    async teardown() {
        await this.teardownFn();
    }

    run() {
        describe(this.name, () => {
            beforeAll(async () => await this.setup());
            afterAll(async () => await this.teardown());
            this.defineTests();
        });
    }

    defineTests() {
        // To be implemented by subclasses
        throw new Error('defineTests must be implemented by subclass');
    }
}

export class TruthTestSuite extends AbstractTestSuite {
    constructor(config = {}) {
        super('Truth Tests', config);
        this.truth = config.truth || new Truth(0.9, 0.8);
    }

    defineTests() {
        test('should have correct frequency and confidence', () => {
            flexibleAssertions.expectCloseTo(this.truth.f, 0.9, 0.01, 'frequency');
            flexibleAssertions.expectCloseTo(this.truth.c, 0.8, 0.01, 'confidence');
        });

        test('should calculate expectation correctly', () => {
            const expected = 0.9 * (0.8 - 0.5) + 0.5;
            truthAssertions.expectTruthExpectation(this.truth, expected, 5);
        });

        test('should be immutable', () => {
            expect(() => this.truth.f = 0.5).toThrow();
        });
    }
}

export class TaskTestSuite extends AbstractTestSuite {
    constructor(config = {}) {
        super('Task Tests', config);
        this.task = config.task || createTask();
    }

    defineTests() {
        test('should have valid term', () => {
            expect(this.task.term).toBeDefined();
        });

        test('should have correct punctuation', () => {
            expect(['.', '!', '?'].includes(this.task.punctuation)).toBe(true);
        });
    }
}

export const T = {
    truth: (f, c) => new TruthTestSuite({truth: createTruth(f, c)}),
    task: (term, punct) => new TaskTestSuite({task: createTask({term: term || createTerm('A'), punctuation: punct})}),
    flex: (actual, expected, tolerance = 0.01) =>
        flexibleAssertions.expectCloseTo(actual, expected, tolerance),
    suite: (type, ...args) => {
        switch (type) {
            case 'truth':
                return EnhancedTestSuites.dataModel(TestFactories.createTruthTestSuite(...args));
            case 'task':
                return EnhancedTestSuites.dataModel(TestFactories.createTaskTestSuite(...args));
            case 'lifecycle':
                return EnhancedTestSuites.lifecycle(args[0]);
            case 'nar':
                return EnhancedTestSuites.narIntegration(args[0]);
            case 'error':
                return EnhancedTestSuites.errorHandling(args[0]);
            default:
                throw new Error(`Unknown suite type: ${type}`);
        }
    }
};

export const {truth, task, flex, suite} = T;
export default EnhancedTestSuites;