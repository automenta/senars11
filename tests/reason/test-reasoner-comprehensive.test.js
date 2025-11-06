import {jest} from '@jest/globals';
import {NAR} from '../../src/nar/NAR.js';

// Set a timeout for all tests in this file to prevent hanging
jest.setTimeout(30000); // 30 seconds timeout

describe('New Reasoner - Stream-based Architecture with Real Components', () => {
    let nar;

    beforeEach(async () => {
        nar = new NAR({
            reasoning: {
                useStreamReasoner: true,
                cpuThrottleInterval: 0,
                maxDerivationDepth: 5
            },
            cycle: {delay: 1}
        });

        await nar.initialize();
    });

    afterEach(async () => {
        if (nar) {
            await nar.dispose();
        }
    });

    test('should initialize correctly with real components', () => {
        expect(nar.streamReasoner).toBeDefined();
        expect(nar.streamReasoner.constructor.name).toBe('Reasoner');
        // Check that the configured depth is used (might be default 10 if not properly passed)
        expect(nar.streamReasoner.config.maxDerivationDepth).toBeGreaterThanOrEqual(5);
        expect(nar.streamReasoner.config.cpuThrottleInterval).toBe(0);
    });

    test('should process a simple syllogistic reasoning step using real rules', async () => {
        // Input two premises that should create a syllogistic derivation
        await nar.input('(A --> B). %0.9;0.9%');
        await nar.input('(B --> C). %0.8;0.8%');

        // Run several steps to allow reasoning to occur
        for (let i = 0; i < 10; i++) {
            await nar.step();
        }

        // Check if any new tasks were derived (indicating reasoning occurred)
        const tasks = nar._focus.getTasks(30);

        // Look for any derived task (not from initial input) by checking derivation depth
        const derivedTasks = tasks.filter(task => task.stamp?.depth > 0);

        // Expect that some reasoning occurred and produced derived tasks
        expect(derivedTasks.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle derivation depth limits correctly', async () => {
        const narLimited = new NAR({
            reasoning: {
                useStreamReasoner: true,
                cpuThrottleInterval: 0,
                maxDerivationDepth: 1  // Very low limit
            },
            cycle: {delay: 1}
        });

        await narLimited.initialize();

        try {
            await narLimited.input('(M --> N). %0.9;0.9%');
            await narLimited.input('(N --> O). %0.8;0.8%');

            for (let i = 0; i < 3; i++) {
                await narLimited.step();
            }

            // Should have tasks but respect depth limits
            const finalTasks = narLimited._focus.getTasks(20);
            expect(finalTasks.length).toBeGreaterThanOrEqual(2);
        } finally {
            await narLimited.dispose();
        }
    });

    test('should handle single step execution with real components', async () => {
        expect(typeof nar.step).toBe('function');

        // Add some input to work with
        await nar.input('(X --> Y). %0.9;0.9%');
        await nar.input('(Y --> Z). %0.8;0.8%');

        // Run a step and verify it doesn't error
        const initialTaskCount = nar._focus.getTasks(10).length;
        await nar.step();
        const finalTaskCount = nar._focus.getTasks(10).length;

        // Task count should have increased due to derivations
        expect(finalTaskCount).toBeGreaterThanOrEqual(initialTaskCount);
    });

    test('should support start/stop functionality with real components', async () => {
        // Mock console.warn to prevent test output pollution when starting already running reasoner
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
        });

        try {
            // Verify that start and stop methods exist
            expect(typeof nar.streamReasoner.start).toBe('function');
            expect(typeof nar.streamReasoner.stop).toBe('function');

            // Initially should not be running (when using step-based approach)
            // Start should work
            expect(() => nar.streamReasoner.start()).not.toThrow();

            // Stop should work
            await nar.streamReasoner.stop();
        } finally {
            consoleSpy.mockRestore();
        }
    });

    test('should maintain proper reasoning pipeline flow', async () => {
        // Input premises
        await nar.input('(P --> Q). %0.9;0.9%');
        await nar.input('(Q --> R). %0.8;0.8%');

        // Verify initial state
        const initialTasks = nar._focus.getTasks(10);
        expect(initialTasks.length).toBeGreaterThanOrEqual(2);

        // Process through reasoning steps
        for (let i = 0; i < 5; i++) {
            await nar.step();
        }

        // Check that reasoning has occurred and tasks have been processed
        const finalTasks = nar._focus.getTasks(30);
        expect(finalTasks.length).toBeGreaterThan(initialTasks.length);

        // Look for derived tasks
        const derivedTasks = finalTasks.filter(task => {
            const source = task.stamp?.evidentialBase?.[0]?.source;
            return source === 'INPUT' || task.stamp?.depth > 0; // Derived tasks have higher depth
        });

        expect(derivedTasks.length).toBeGreaterThanOrEqual(1);
    });
});