/**
 * Common test assertions for truth values
 */
export const truthAssertions = {
    /**
     * Asserts that a truth value matches expected values within epsilon
     */
    expectTruthCloseTo: (actual, expectedF, expectedC, precision = 5) => {
        expect(actual.f).toBeCloseTo(expectedF, precision);
        expect(actual.c).toBeCloseTo(expectedC, precision);
    },

    /**
     * Asserts truth equality using the equals method
     */
    expectTruthEquals: (actual, expected) => {
        expect(actual.equals(expected)).toBe(true);
    },

    /**
     * Asserts truth expectation value
     */
    expectTruthExpectation: (truth, expectedValue, precision = 5) => {
        const calculated = truth.f * (truth.c - 0.5) + 0.5;
        expect(calculated).toBeCloseTo(expectedValue, precision);
    }
};
