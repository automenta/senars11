import {jest} from '@jest/globals';
import {RuleProcessor} from '../../src/reason/RuleProcessor.js';
import {RuleExecutor} from '../../src/reason/RuleExecutor.js';
import {Rule} from '../../src/reason/Rule.js';
import {createTestTask} from './testUtils.js';

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
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

            try {
                const validDerivation = {id: 'valid', stamp: {depth: 5}};
                const invalidDerivation = {id: 'invalid', stamp: {depth: 15}};

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
            jest.spyOn(ruleProcessor, '_getAsyncResultsCount').mockReturnValue(60);

            const start = Date.now();
            await ruleProcessor._checkAndApplyBackpressure();
            const end = Date.now();

            const expectedWait = ruleProcessor.config.backpressureInterval || 5;
            expect(end - start).toBeGreaterThanOrEqual(expectedWait - 2);
        });

        test('should not apply backpressure when queue is below threshold', async () => {
            jest.spyOn(ruleProcessor, '_getAsyncResultsCount').mockReturnValue(10);

            const start = Date.now();
            await ruleProcessor._checkAndApplyBackpressure();
            const end = Date.now();

            expect(end - start).toBeLessThan(5);
        });
    });

    describe('getStatus', () => {
        test('should return status information', () => {
            jest.spyOn(ruleProcessor, '_getAsyncResultsCount').mockReturnValue(5);
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
            const syncRule = new TestSyncRule('sync-rule');
            const asyncRule = new TestAsyncRule('async-rule');
            ruleExecutor.register(syncRule);
            ruleExecutor.register(asyncRule);

            async function* premisePairStream() {
                yield [createTestTask({id: 'primary'}), createTestTask({id: 'secondary'})];
            }

            const results = [];
            for await (const result of ruleProcessor.process(premisePairStream())) {
                results.push(result);
                if (results.length >= 1) break;
            }

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].ruleId).toBeDefined();
        });

        test('should handle errors during rule processing', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            try {
                const errorRule = {
                    id: 'error-rule',
                    type: 'nal',
                    apply: () => {
                        throw new Error('Rule execution failed');
                    },
                    canApply: () => true
                };

                ruleExecutor.register(errorRule);

                async function* premisePairStream() {
                    yield [createTestTask({id: 'primary'}), createTestTask({id: 'secondary'})];
                }

                const results = [];
                const processing = async () => {
                    for await (const result of ruleProcessor.process(premisePairStream())) {
                        results.push(result);
                    }
                };

                await expect(processing()).resolves.not.toThrow();

                expect(results.length).toBe(0);
            } finally {
                consoleSpy.mockRestore();
            }
        });
    });
});
