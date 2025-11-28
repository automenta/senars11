/**
 * @file generalTestSuites.js
 * @description General-purpose reusable test suites - DEPRECATED
 *
 * NOTE: This file is being deprecated. All functionality has been consolidated
 * into consolidatedTestSuites.js following AGENTS.md guidelines.
 */

// Re-export all functionality from the consolidated test suites
export * from './consolidatedTestSuites.js';
export * from './baseTestUtils.js';
export * from './testSuiteFactory.js';

// For backward compatibility, provide the original exports as aliases
import { StandardTestSuites, FlexibleTestPatterns } from './consolidatedTestSuites.js';
import { comprehensiveTestSuites, flexibleAssertions, truthAssertions, taskAssertions, memoryAssertions } from './baseTestUtils.js';

export const dataModelTestSuite = StandardTestSuites.dataModel;
export const initializationTestSuite = StandardTestSuites.lifecycleComponent; // Using similar pattern
export const equalityTestSuite = StandardTestSuites.equality;
export const errorHandlingTestSuite = StandardTestSuites.inputOutputModule; // Use similar pattern
export const truthValueTestSuite = (truthValue, expectedF, expectedC, tolerance = 0.01) => {
    describe('Truth Value Tests', () => {
        test('frequency and confidence match expected values', () => {
            flexibleAssertions.expectCloseTo(truthValue.f, expectedF, tolerance, 'frequency');
            flexibleAssertions.expectCloseTo(truthValue.c, expectedC, tolerance, 'confidence');
        });

        test('expectation calculation is correct', () => {
            const expected = expectedF * (expectedC - 0.5) + 0.5;
            truthAssertions.expectTruthExpectation(truthValue, expected, 5);
        });

        test('truth equality within tolerance', () => {
            const similarTruth = new (Object.getPrototypeOf(truthValue).constructor)(expectedF, expectedC);
            expect(truthValue.equals(similarTruth)).toBe(true);
        });
    });
};
export const taskTestSuite = (task, expectedData) => {
    describe('Task Tests', () => {
        test('task properties match expected values', () => {
            if (expectedData.term) {
                expect(task.term.toString()).toBe(expectedData.term.toString());
            }
            if (expectedData.type) {
                taskAssertions.expectTaskType(task, expectedData.type);
            }
            if (expectedData.truth) {
                truthAssertions.expectTruthEquals(task.truth, expectedData.truth);
            }
            if (expectedData.budget) {
                expect(task.budget).toEqual(expectedData.budget);
            }
        });

        test('task string representation is correct', () => {
            if (expectedData.expectedString) {
                expect(task.toString()).toBe(expectedData.expectedString);
            }
        });
    });
};
export const lifecycleComponentTestSuite = StandardTestSuites.lifecycleComponent;
export const performanceTestSuite = FlexibleTestPatterns.timeFlexibleTest; // Using pattern from consolidated
export const flexibleAssertionTestSuite = FlexibleTestPatterns.flexibleObjectTest; // Using pattern from consolidated
export const memoryTestSuite = (memory, config) => {
    describe('Memory Operations Tests', () => {
        test('memory initializes with correct default state', () => {
            expect(memory.concepts).toBeDefined();
            expect(memory.focusConcepts).toBeDefined();
            expect(memory.config).toEqual(config);
        });

        test('memory operations work correctly', () => {
            memoryAssertions.expectMemoryConcepts(memory, memory.getAllConcepts().length);
        });
    });
};
export const standardClassTestSuite = StandardTestSuites.dataModel; // Using similar pattern