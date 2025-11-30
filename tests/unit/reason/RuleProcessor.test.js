import {jest} from '@jest/globals';
import {RuleProcessor} from '../../../src/reason/RuleProcessor.js';
import {RuleExecutor} from '../../../src/reason/RuleExecutor.js';
import {Rule} from '../../../src/reason/Rule.js';
import {createTestTask} from '../../support/baseTestUtils.js';

class TestRule extends Rule {
    constructor(id, type, delay = false) { super(id, type, 1.0); this.delay = delay; }
    apply(p1, p2) { return [{id: `derived-${this.id}`, ruleId: this.id, primary: p1.id, secondary: p2.id}]; }
    async applyAsync(p1, p2) { return this.apply(p1, p2); }
}

describe('RuleProcessor', () => {
    let ruleProcessor, ruleExecutor;

    beforeEach(() => {
        ruleExecutor = new RuleExecutor();
        ruleProcessor = new RuleProcessor(ruleExecutor);
    });

    describe('Configuration & Initialization', () => {
        test('defaults', () => {
            expect(ruleProcessor.config).toMatchObject({ maxDerivationDepth: 10, backpressureThreshold: 50 });
            expect(ruleProcessor.asyncResultsQueue.size).toBe(0);
        });

        test('custom config', () => {
            const rp = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 5, backpressureThreshold: 25 });
            expect(rp.config).toMatchObject({ maxDerivationDepth: 5, backpressureThreshold: 25 });
        });
    });

    describe('Utilities', () => {
        test('_isSynchronousRule', () => {
            expect(ruleProcessor._isSynchronousRule({type: 'nal'})).toBe(true);
            expect(ruleProcessor._isSynchronousRule({type: 'lm'})).toBe(false);
        });

        test('getStats & resetStats', () => {
            Object.assign(ruleProcessor, { syncRuleExecutions: 5, asyncRuleExecutions: 3 });
            expect(ruleProcessor.getStats()).toMatchObject({ syncRuleExecutions: 5, asyncRuleExecutions: 3 });

            ruleProcessor.resetStats();
            expect(ruleProcessor.getStats()).toMatchObject({ syncRuleExecutions: 0, asyncRuleExecutions: 0 });
        });

        test('getStatus', () => {
             Object.assign(ruleProcessor, { asyncResultsQueue: {size: 5}, maxQueueSize: 10, syncRuleExecutions: 15 });
             const status = ruleProcessor.getStatus();
             expect(status.internalState).toMatchObject({ asyncResultsQueueLength: 5, maxQueueSize: 10, syncRuleExecutions: 15 });
             expect(status.backpressure).toBeDefined();
        });
    });

    describe('Processing Logic', () => {
        test('_processDerivation respects depth limits', () => {
            const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
            expect(ruleProcessor._processDerivation({id: 'valid', stamp: {depth: 5}})).toBeDefined();
            expect(ruleProcessor._processDerivation({id: 'invalid', stamp: {depth: 15}})).toBeNull();
            spy.mockRestore();
        });

        test('_processDerivation handles missing stamps', () => {
            expect(ruleProcessor._processDerivation({id: 'no-stamp'})).toBeDefined();
        });
    });

    describe('Backpressure', () => {
        test('applies backpressure when queue full', async () => {
            ruleProcessor.asyncResultsQueue = { size: 60 };
            const start = Date.now();
            await ruleProcessor._checkAndApplyBackpressure();
            expect(Date.now() - start).toBeGreaterThanOrEqual((ruleProcessor.config.backpressureInterval || 5) - 2);
        });

        test('skips backpressure when queue empty', async () => {
            ruleProcessor.asyncResultsQueue = { size: 10 };
            const start = Date.now();
            await ruleProcessor._checkAndApplyBackpressure();
            expect(Date.now() - start).toBeLessThan(10);
        });
    });

    describe('Execution', () => {
        test('processes premise pairs', async () => {
            ruleExecutor.register(new TestRule('sync', 'nal'));
            ruleExecutor.register(new TestRule('async', 'lm'));

            async function* stream() { yield [createTestTask({id: 'p1'}), createTestTask({id: 'p2'})]; }

            const results = [];
            for await (const r of ruleProcessor.process(stream())) results.push(r);
            expect(results.length).toBeGreaterThan(0);
        });

        test('handles errors gracefully', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            ruleExecutor.register({ id: 'err', type: 'nal', apply: () => { throw new Error('Fail'); }, canApply: () => true });

            async function* stream() { yield [createTestTask({id: 'p1'}), createTestTask({id: 'p2'})]; }

            const results = [];
            for await (const r of ruleProcessor.process(stream())) results.push(r);
            expect(results.length).toBe(0);
            spy.mockRestore();
        });
    });
});
