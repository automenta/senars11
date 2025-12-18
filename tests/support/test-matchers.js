/**
 * @file test-matchers.js
 * @description Custom Jest matchers for flexible, non-brittle assertions
 */

export const customMatchers = {
    toMatchTask(received, expectedTerm, options = {}) {
        const {
            tolerance = 0.01,
            checkPunctuation = true,
            minTruth = null
        } = options;

        const termMatches = received.term?.toString() === expectedTerm ||
            received.term?.equals?.(expectedTerm);

        if (!termMatches) {
            return {
                pass: false,
                message: () => `Expected task term to be ${expectedTerm}, but got ${received.term?.toString()}`
            };
        }

        if (checkPunctuation && options.punctuation && received.punctuation !== options.punctuation) {
            return {
                pass: false,
                message: () => `Expected punctuation ${options.punctuation}, but got ${received.punctuation}`
            };
        }

        if (minTruth && received.truth) {
            const {f: minF = 0, c: minC = 0} = minTruth;
            if (received.truth.f < minF || received.truth.c < minC) {
                return {
                    pass: false,
                    message: () => `Expected truth >= {f:${minF}, c:${minC}}, but got {f:${received.truth.f}, c:${received.truth.c}}`
                };
            }
        }

        return {pass: true};
    },

    toHaveTruthCloseTo(received, expected, tolerance = 0.01) {
        if (!received || typeof received.f !== 'number' || typeof received.c !== 'number') {
            return {
                pass: false,
                message: () => `Expected truth object with f and c properties, got ${JSON.stringify(received)}`
            };
        }

        const freqDiff = Math.abs(received.f - expected.f);
        const confDiff = Math.abs(received.c - expected.c);

        if (freqDiff > tolerance || confDiff > tolerance) {
            return {
                pass: false,
                message: () => `Expected truth {f:${expected.f}, c:${expected.c}} ± ${tolerance}, but got {f:${received.f}, c:${received.c}}`
            };
        }

        return {
            pass: true,
            message: () => `Truth values are within tolerance ${tolerance}`
        };
    },

    toHaveTaskCount(received, expected, tolerance = 0) {
        const actualCount = received.totalTasks ?? received.tasks?.length ?? received;

        if (tolerance === 0) {
            const pass = actualCount === expected;
            return {
                pass,
                message: () => pass
                    ? `Expected task count not to be ${expected}`
                    : `Expected task count to be ${expected}, but got ${actualCount}`
            };
        }

        const pass = Math.abs(actualCount - expected) <= tolerance;
        return {
            pass,
            message: () => pass
                ? `Expected task count not to be ${expected} ± ${tolerance}`
                : `Expected task count to be ${expected} ± ${tolerance}, but got ${actualCount}`
        };
    },

    toBeWithinRange(received, min, max) {
        const value = typeof received === 'number' ? received : received.value;
        const pass = value >= min && value <= max;

        return {
            pass,
            message: () => pass
                ? `Expected ${value} not to be within range [${min}, ${max}]`
                : `Expected ${value} to be within range [${min}, ${max}]`
        };
    }
};

/**
 * Register custom matchers with Jest
 */
export function setupCustomMatchers() {
    if (typeof expect !== 'undefined' && expect.extend) {
        expect.extend(customMatchers);
    }
}
