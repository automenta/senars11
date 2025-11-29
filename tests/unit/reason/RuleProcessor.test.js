import {jest} from '@jest/globals';
import {RuleProcessor} from '../../../src/reason/RuleProcessor.js';
import {RuleExecutor} from '../../../src/reason/RuleExecutor.js';
import {Rule} from '../../../src/reason/Rule.js';
import {createTestTask} from '../../support/baseTestUtils.js';

// Define proper rule classes for testing
class TestSyncRule extends Rule {
    constructor(id) {
        super(id, 'nal', 1.0);
    }

    apply(primaryPremise, secondaryPremise) {
        return [{
            id: `sync-derived-${this.id}`,
            ruleId: this.id,
            primary: primaryPremise.id,
            secondary: secondaryPremise.id
        }];
    }
}

class TestAsyncRule extends Rule {
    constructor(id) {
        super(id, 'lm', 1.0);
    }

    async applyAsync(primaryPremise, secondaryPremise) {
        return [{
            id: `async-derived-${this.id}`,
            ruleId: this.id,
            primary: primaryPremise.id,
            secondary: secondaryPremise.id
        }];
    }
}

describe('RuleProcessor', () => {
    let ruleProcessor;
    let ruleExecutor;

    beforeEach(() => {
        ruleExecutor = new RuleExecutor();
        ruleProcessor = new RuleProcessor(ruleExecutor);
    });

    describe('constructor', () => {
        test('should initialize with default config', () => {
            expect(ruleProcessor.config.maxDerivationDepth).toBe(10);
            expect(ruleProcessor.config.backpressureThreshold).toBe(50);
            expect(ruleProcessor.asyncResultsQueue.size).toBe(0);
            expect(ruleProcessor.syncRuleExecutions).toBe(0);
            expect(ruleProcessor.asyncRuleExecutions).toBe(0);
        });

        test('should initialize with custom config', () => {
            ruleProcessor = new RuleProcessor(ruleExecutor, {
                maxDerivationDepth: 5,
                backpressureThreshold: 25,
                backpressureInterval: 5
            });

            expect(ruleProcessor.config.maxDerivationDepth).toBe(5);
            expect(ruleProcessor.config.backpressureThreshold).toBe(25);
            expect(ruleProcessor.config.backpressureInterval).toBe(5);
        });
    });

    describe('_isSynchronousRule', () => {
        test('should identify synchronous rules', () => {
            const nalRule = {type: 'nal'};
            const lmRule = {type: 'lm'};

            expect(ruleProcessor._isSynchronousRule(nalRule)).toBe(true);
            expect(ruleProcessor._isSynchronousRule(lmRule)).toBe(false);
        });
    });

    describe('getStats', () => {
        test('should return execution statistics', () => {
            ruleProcessor.syncRuleExecutions = 5;
            ruleProcessor.asyncRuleExecutions = 3;

            const stats = ruleProcessor.getStats();

            expect(stats.syncRuleExecutions).toBe(5);
            expect(stats.asyncRuleExecutions).toBe(3);
        });
    });

    describe('resetStats', () => {
        test('should reset execution statistics', () => {
            ruleProcessor.syncRuleExecutions = 5;
            ruleProcessor.asyncRuleExecutions = 3;

            ruleProcessor.resetStats();

            const stats = ruleProcessor.getStats();
            expect(stats.syncRuleExecutions).toBe(0);
            expect(stats.asyncRuleExecutions).toBe(0);
        });
    });

    describe('_processDerivation', () => {
        test('should process derivations with depth limits', () => {
            // Mock console.debug to prevent test output pollution when depth limit is exceeded
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
            });

            try {
                const validDerivation = {id: 'valid', stamp: {depth: 5}};
                const invalidDerivation = {id: 'invalid', stamp: {depth: 15}}; // Exceeds default max depth of 10

                const result1 = ruleProcessor._processDerivation(validDerivation);
                const result2 = ruleProcessor._processDerivation(invalidDerivation);

                expect(result1).toBe(validDerivation);
                expect(result2).toBeNull();
            } finally {
                consoleSpy.mockRestore();
            }
        });

        test('should handle derivations without stamps', () => {
            const derivation = {id: 'no-stamp'};

            const result = ruleProcessor._processDerivation(derivation);

            expect(result).toBe(derivation);
        });
    });

    describe('_checkAndApplyBackpressure', () => {
        test('should apply backpressure when queue is above threshold', async () => {
            // Set up a queue above the threshold
            ruleProcessor.asyncResultsQueue = { size: 60 }; // Mock Queue with size property

            const start = Date.now();
            await ruleProcessor._checkAndApplyBackpressure();
            const end = Date.now();

            // Should have waited for backpressure interval
            const expectedWait = ruleProcessor.config.backpressureInterval || 5;
            expect(end - start).toBeGreaterThanOrEqual(expectedWait - 1); // -1 to account for timing precision
        });

        test('should not apply backpressure when queue is below threshold', async () => {
            // Set up a queue below the threshold
            ruleProcessor.asyncResultsQueue = { size: 10 }; // Mock Queue with size property

            const start = Date.now();
            await ruleProcessor._checkAndApplyBackpressure();
            const end = Date.now();

            // Should have waited for minimal time
            expect(end - start).toBeLessThan(5); // Should be much less than backpressure interval
        });
    });

    describe('getStatus', () => {
        test('should return status information', () => {
            ruleProcessor.asyncResultsQueue = { size: 5 }; // Mock Queue with size property
            ruleProcessor.maxQueueSize = 10;
            ruleProcessor.syncRuleExecutions = 15;
            ruleProcessor.asyncRuleExecutions = 8;

            const status = ruleProcessor.getStatus();

            expect(status.config).toBeDefined();
            expect(status.stats).toBeDefined();
            expect(status.internalState.asyncResultsQueueLength).toBe(5);
            expect(status.internalState.maxQueueSize).toBe(10);
            expect(status.internalState.syncRuleExecutions).toBe(15);
            expect(status.internalState.asyncRuleExecutions).toBe(8);
            expect(status.backpressure).toBeDefined();
            expect(status.backpressure.queueLength).toBe(5);
            expect(status.backpressure.threshold).toBe(50);
        });
    });

    describe('process', () => {
        test('should process premise pairs and yield results', async () => {
            // Add test rules to the rule executor
            const syncRule = new TestSyncRule('sync-rule');
            const asyncRule = new TestAsyncRule('async-rule');
            ruleExecutor.register(syncRule);
            ruleExecutor.register(asyncRule);

            // Create a simple premise pair stream
            async function* premisePairStream() {
                yield [createTestTask({id: 'primary'}), createTestTask({id: 'secondary'})];
            }

            const results = [];
            for await (const result of ruleProcessor.process(premisePairStream())) {
                results.push(result);
                if (results.length >= 1) break; // We expect at least one result
            }

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].ruleId).toBeDefined();
        });

        test('should handle errors during rule processing', async () => {
            // Mock console.error to prevent test output pollution
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
            });

            try {
                // Create a rule that throws an error
                const errorRule = {
                    id: 'error-rule',
                    type: 'nal',
                    apply: () => {
                        throw new Error('Rule execution failed');
                    },
                    canApply: () => true
                };

                ruleExecutor.register(errorRule);

                // Create a simple premise pair stream
                async function* premisePairStream() {
                    yield [createTestTask({id: 'primary'}), createTestTask({id: 'secondary'})];
                }

                const results = [];
                const processPromise = (async () => {
                    for await (const result of ruleProcessor.process(premisePairStream())) {
                        results.push(result);
                    }
                })();

                await expect(processPromise).resolves.not.toThrow();

                // Should continue processing despite the error
                expect(results.length).toBe(0);
            } finally {
                consoleSpy.mockRestore();
            }
        });
    });
});
