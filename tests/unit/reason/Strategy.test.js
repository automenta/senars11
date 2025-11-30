import {jest} from '@jest/globals';
import {Strategy} from '../../../src/reason/Strategy.js';
import {createTestTask} from '../../support/baseTestUtils.js';

describe('Strategy', () => {
    let strategy;
    beforeEach(() => { strategy = new Strategy(); });

    describe('Initialization', () => {
        test('defaults', () => {
            expect(strategy.config.maxSecondaryPremises).toBe(10);
        });

        test('custom config', () => {
            strategy = new Strategy({ maxSecondaryPremises: 5, custom: 'val' });
            expect(strategy.config).toMatchObject({ maxSecondaryPremises: 5, custom: 'val' });
        });
    });

    describe('Premise Selection', () => {
        test('selectSecondaryPremises default empty', async () => {
            expect(await strategy.selectSecondaryPremises(createTestTask({term: 'p'}))).toEqual([]);
        });

        test('delegates to sub-strategies', async () => {
            const sub = { selectSecondaryPremises: jest.fn().mockResolvedValue([createTestTask({term: 'sub'})]) };
            strategy.addStrategy(sub);

            const p = createTestTask({term: 'p'});
            const res = await strategy.selectSecondaryPremises(p);

            expect(sub.selectSecondaryPremises).toHaveBeenCalledWith(p);
            expect(res[0].term.toString()).toBe('sub');
        });

        test('handles errors gracefully', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const errSelector = { select: () => { throw new Error('Error'); } };
            const errStrategy = new Strategy({premiseSelector: errSelector});

            expect(await errStrategy.selectSecondaryPremises(createTestTask({term: 'p'}))).toEqual([]);
            spy.mockRestore();
        });
    });

    describe('Premise Pair Generation', () => {
        test('generates pairs from stream', async () => {
            strategy.selectSecondaryPremises = async (p) => [createTestTask({term: 's-' + p.term})];

            async function* stream() { yield createTestTask({term: 'p1'}); yield createTestTask({term: 'p2'}); }

            const pairs = [];
            for await (const p of strategy.generatePremisePairs(stream())) pairs.push(p);

            expect(pairs.length).toBeGreaterThanOrEqual(2);
            pairs.forEach(p => expect(p).toHaveLength(2));
        });

        test('handles errors during selection', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            let calls = 0;
            // Provide a term to ensure createTestTask creates a valid task
            strategy.selectSecondaryPremises = async () => {
                if (calls++ === 0) throw new Error('Fail');
                return [createTestTask({term: 'secondary'})];
            };

            async function* stream() { yield createTestTask({term: 'p1'}); yield createTestTask({term: 'p2'}); }

            const pairs = [];
            for await (const p of strategy.generatePremisePairs(stream())) pairs.push(p);

            expect(pairs.length).toBeGreaterThanOrEqual(1);
            spy.mockRestore();
        });
    });

    test('getStatus', () => {
        expect(new Strategy({maxSecondaryPremises: 8}).getStatus()).toMatchObject({
            type: 'Strategy',
            config: { maxSecondaryPremises: 8 },
            timestamp: expect.any(Number)
        });
    });
});
