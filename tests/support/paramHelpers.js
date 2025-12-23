/**
 * Shared test configuration helpers for parameterized integration tests.
 */

export const memoryConfigs = {
    minimal: { maxConcepts: 20, priorityThreshold: 0.5, consolidationInterval: 3 },
    standard: { maxConcepts: 50, priorityThreshold: 0.3, consolidationInterval: 5 },
    large: { maxConcepts: 100, priorityThreshold: 0.2, consolidationInterval: 8 }
};

export const reasoningDepths = {
    shallow: 1,
    standard: 5,
    deep: 10
};

export const createNARConfig = (overrides = {}) => ({
    debug: { enabled: false },
    cycle: { delay: 5, maxTasksPerCycle: 10 },
    ...overrides
});

export const createMemoryConfig = (level = 'standard') => ({
    ...createNARConfig(),
    memory: memoryConfigs[level]
});

export const createReasoningConfig = (depth = 'standard') => ({
    ...createNARConfig(),
    reasoning: {
        type: 'stream',
        useStreamReasoner: true,
        maxDerivationDepth: reasoningDepths[depth]
    }
});
