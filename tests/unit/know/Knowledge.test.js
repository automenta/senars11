import {Knowledge, TruthValueUtils} from '../../../src/know/Knowledge.js';
import {DataTableKnowledge} from '../../../src/know/DataTableKnowledge.js';

describe('Knowledge System', () => {
    describe('TruthValueUtils', () => {
        test('should normalize metrics correctly', () => {
            const cases = [
                {val: 50, expected: 0.5},
                {val: 0, expected: 0},
                {val: 100, expected: 1},
                {val: -10, expected: 0},
                {val: 110, expected: 1}
            ];
            cases.forEach(({val, expected}) =>
                expect(TruthValueUtils.normalizeMetric(val, 0, 100)).toBe(expected));
        });

        test('should calculate frequency and confidence from metric', () => {
            expect(TruthValueUtils.calculateFrequencyFromMetric(75, 0, 100)).toBe(0.75);
            expect(TruthValueUtils.calculateConfidenceFromMetric(50, 0, 100)).toBe(0.5);
        });

        test('should create truth value strings', () => {
            expect(TruthValueUtils.createTruthValue(0.75, 0.9)).toBe('%0.75;0.90%');
        });
    });

    describe('DataTableKnowledge', () => {
        test('should handle basic data', async () => {
            const knowledge = new DataTableKnowledge([
                {name: 'test1', value: 100},
                {name: 'test2', value: 200}
            ]);

            expect(await knowledge.getItems()).toHaveLength(2);
            expect(await knowledge.getSummary()).toMatchObject({rowCount: 2, columnCount: 2});
        });

        test('should generate default tasks for rows', async () => {
            const knowledge = new DataTableKnowledge([
                {id: 'item1', value: 50},
                {id: 'item2', value: 75}
            ]);

            expect(await knowledge.toTasks()).toHaveLength(2);
        });
    });

    describe('Abstract Knowledge Class', () => {
        test('should not instantiate abstract class directly', () => {
            expect(() => new Knowledge()).toThrow('Cannot instantiate abstract class Knowledge');
        });
    });
});
