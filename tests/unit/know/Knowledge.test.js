/**
 * Knowledge System Unit Tests
 * Tests for the core Knowledge classes and their functionality
 */
import {Knowledge, TruthValueUtils} from '../../../src/know/Knowledge.js';
import {DataTableKnowledge} from '../../../src/know/DataTableKnowledge.js';

describe('Knowledge System', () => {
    describe('TruthValueUtils', () => {
        test('should normalize metrics correctly', () => {
            expect(TruthValueUtils.normalizeMetric(50, 0, 100)).toBe(0.5);
            expect(TruthValueUtils.normalizeMetric(0, 0, 100)).toBe(0);
            expect(TruthValueUtils.normalizeMetric(100, 0, 100)).toBe(1);
            expect(TruthValueUtils.normalizeMetric(-10, 0, 100)).toBe(0);
            expect(TruthValueUtils.normalizeMetric(110, 0, 100)).toBe(1);
        });

        test('should calculate frequency from metric', () => {
            expect(TruthValueUtils.calculateFrequencyFromMetric(75, 0, 100)).toBe(0.75);
        });

        test('should calculate confidence from metric', () => {
            expect(TruthValueUtils.calculateConfidenceFromMetric(50, 0, 100)).toBe(0.5);
        });

        test('should create truth value strings', () => {
            expect(TruthValueUtils.createTruthValue(0.75, 0.9)).toBe('%0.75;0.90%');
        });
    });

    describe('DataTableKnowledge', () => {
        test('should handle basic data', async () => {
            const data = [
                {name: 'test1', value: 100},
                {name: 'test2', value: 200}
            ];
            const knowledge = new DataTableKnowledge(data);

            const items = await knowledge.getItems();
            expect(items.length).toBe(2);

            const summary = await knowledge.getSummary();
            expect(summary.rowCount).toBe(2);
            expect(summary.columnCount).toBe(2);
        });

        test('should generate default tasks for rows', async () => {
            const data = [
                {id: 'item1', value: 50},
                {id: 'item2', value: 75}
            ];
            const knowledge = new DataTableKnowledge(data);

            const tasks = await knowledge.toTasks();
            expect(Array.isArray(tasks)).toBe(true);
            expect(tasks.length).toBe(2);
        });
    });

    describe('Abstract Knowledge Class', () => {
        test('should not instantiate abstract class directly', () => {
            expect(() => {
                new Knowledge();
            }).toThrow('Cannot instantiate abstract class Knowledge');
        });
    });
});