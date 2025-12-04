/**
 * @file StandardTestTemplates.js
 * @description Standardized test templates for flexible, agile testing
 * These templates provide consistent patterns for creating resilient tests
 */

import {TaskMatch, TestNAR} from '../../core/src/testing/TestNAR.js';
import {flexible} from './testOrganizer.js';

/**
 * Template for basic inference tests using flexible truth matching
 * @param {string} testName - Name of the test
 * @param {Array} inputs - Array of [statement, freq, conf] tuples to input
 * @param {Object} expected - Expected result with term and truth values
 * @param {number} tolerance - Tolerance for truth value matching
 * @param {number} cycles - Number of reasoning cycles to run
 */
export const createInferenceTest = (testName, inputs, expected, tolerance = 0.05, cycles = 2) => {
    it(testName, async () => {
        const testNAR = inputs.reduce(
            (nar, [statement, freq, conf]) => nar.input(statement, freq, conf),
            new TestNAR()
        ).run(cycles).expect(
            new TaskMatch(expected.term)
                .withFlexibleTruth(expected.freq, expected.conf, tolerance)
        );

        const result = await testNAR.execute();
        expect(result).toBe(true);
    });
};

/**
 * Template for structural reasoning tests (e.g., Modus Ponens, Syllogism)
 * @param {string} testName - Name of the test
 * @param {Array} premises - Array of premise statements
 * @param {Object} conclusion - Expected conclusion
 * @param {number} tolerance - Tolerance for truth value matching
 */
export const createStructuralReasoningTest = (testName, premises, conclusion, tolerance = 0.05) => {
    it(testName, async () => {
        const testNAR = premises.reduce(
            (nar, {statement, freq, conf}) => nar.input(statement, freq, conf),
            new TestNAR()
        );

        const result = await testNAR
            .run(3)
            .expect(
                new TaskMatch(conclusion.term)
                    .withFlexibleTruth(conclusion.freq, conclusion.conf, tolerance)
            )
            .execute();

        expect(result).toBe(true);
    });
};

/**
 * Template for negative reasoning tests (expecting no derivation)
 * @param {string} testName - Name of the test
 * @param {Array} inputs - Array of inputs that should NOT lead to conclusion
 * @param {string} conclusionTerm - Term that should NOT be derived
 */
export const createNegativeReasoningTest = (testName, inputs, conclusionTerm) => {
    it(testName, async () => {
        const testNAR = inputs.reduce(
            (nar, [statement, freq, conf]) => nar.input(statement, freq, conf),
            new TestNAR()
        );

        // Expect the conclusion NOT to be derived
        const result = await testNAR
            .run(3)
            .expectNot(conclusionTerm)
            .execute();

        expect(result).toBe(true);
    });
};

/**
 * Template for truth operation tests with flexible matching
 * @param {string} operationName - Name of the truth operation
 * @param {Function} operationFunc - The truth operation function to test
 * @param {Object} inputs - Input truth values
 * @param {Object} expected - Expected results
 * @param {number} tolerance - Tolerance for matching
 */
export const createTruthOperationTest = (operationName, operationFunc, inputs, expected, tolerance = 0.05) => {
    it(`${operationName} operation produces expected results`, () => {
        const result = operationFunc(...inputs);

        if (typeof expected === 'object' && expected.f !== undefined && expected.c !== undefined) {
            flexible.assertions.expectCloseTo(result.f, expected.f, tolerance, `${operationName} frequency`);
            flexible.assertions.expectCloseTo(result.c, expected.c, tolerance, `${operationName} confidence`);
        } else {
            flexible.assertions.expectCloseTo(result, expected, tolerance, operationName);
        }
    });
};

/**
 * Template for property-based reasoning tests
 * @param {string} testName - Name of the test
 * @param {Function} reasoningSetup - Function to set up reasoning scenario
 * @param {Function} validation - Function to validate result with flexible checks
 */
export const createPropertyBasedTest = (testName, reasoningSetup, validation) => {
    it(testName, async () => {
        const testNAR = await reasoningSetup();
        const result = await testNAR.execute();
        expect(result).toBe(true);

        // Run additional validation if provided
        if (validation) {
            validation();
        }
    });
};

/**
 * Template for complex reasoning chain tests
 * @param {string} testName - Name of the test
 * @param {Array} sequence - Sequence of operations to perform
 * @param {Array} expectedResults - Array of expected results
 * @param {number} tolerance - Tolerance for flexible matching
 */
export const createReasoningChainTest = (testName, sequence, expectedResults, tolerance = 0.05) => {
    it(testName, async () => {
        const testNAR = sequence.reduce((nar, step) => {
            if (step.type === 'input') {
                return nar.input(step.statement, step.freq, step.conf);
            } else if (step.type === 'run') {
                return nar.run(step.cycles || 1);
            }
            return nar;
        }, new TestNAR());

        const finalNAR = expectedResults.reduce(
            (nar, expected) => nar.expect(
                new TaskMatch(expected.term)
                    .withFlexibleTruth(expected.freq, expected.conf, tolerance)
            ),
            testNAR
        );

        const result = await finalNAR.execute();
        expect(result).toBe(true);
    });
};

/**
 * Template for performance-sensitive tests with flexible timing
 */
export const createFlexiblePerformanceTest = (testName, testFn, maxDurationMs = 5000) => {
    it(testName, async () => {
        const startTime = Date.now();
        const result = await testFn();
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThanOrEqual(maxDurationMs);
        expect(result).toBeDefined();
    });
};

/**
 * Helper function to create a TestNAR with inputs applied
 * @param {Array} inputs - Array of [statement, freq, conf] tuples
 * @returns {TestNAR} - TestNAR instance with inputs applied
 */
export const createNARWithInputs = (inputs) => {
    return inputs.reduce(
        (nar, [statement, freq, conf]) => nar.input(statement, freq, conf),
        new TestNAR()
    );
};

/**
 * Helper function to chain expectations on a TestNAR
 * @param {TestNAR} testNAR - TestNAR instance
 * @param {Array} expectations - Array of expectation objects
 * @param {number} tolerance - Tolerance for truth value matching
 * @returns {TestNAR} - TestNAR instance with expectations applied
 */
export const addExpectations = (testNAR, expectations, tolerance = 0.05) => {
    return expectations.reduce(
        (nar, expected) => nar.expect(
            new TaskMatch(expected.term)
                .withFlexibleTruth(expected.freq, expected.conf, tolerance)
        ),
        testNAR
    );
};

/**
 * Helper function to build a TestNAR through a sequence of operations
 * @param {Array} sequence - Array of operation objects
 * @returns {TestNAR} - TestNAR instance after applying all operations
 */
export const buildNARFromSequence = (sequence) => {
    return sequence.reduce((nar, step) => {
        switch (step.type) {
            case 'input':
                return nar.input(step.statement, step.freq, step.conf);
            case 'run':
                return nar.run(step.cycles || 1);
            case 'expect':
                return nar.expect(new TaskMatch(step.term));
            default:
                return nar;
        }
    }, new TestNAR());
};

/**
 * Export a comprehensive test suite factory
 */
export const TestTemplateFactory = {
    createInferenceTest,
    createStructuralReasoningTest,
    createNegativeReasoningTest,
    createTruthOperationTest,
    createPropertyBasedTest,
    createReasoningChainTest,
    createFlexiblePerformanceTest,
    createNARWithInputs,
    addExpectations,
    buildNARFromSequence
};

export default TestTemplateFactory;