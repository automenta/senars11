/**
 * Knowing System Unit Tests
 * Tests for the central knowledge management system
 */
import {Knowing} from '../../../src/knowledge/Knowing.js';
import {Knowledge} from '../../../src/knowledge/Knowledge.js';

// Simple test knowledge class
class SimpleTestKnowledge extends Knowledge {
    async toTasks() {
        return this.data?.tasks || [];
    }

    async getItems() {
        return this.data?.items || [];
    }

    async getSummary() {
        return {data: this.data};
    }

    async createRelationships() {
        return this.data?.relationships || [];
    }
}

describe('Knowing System', () => {
    test('should initialize with empty stats', () => {
        const knowing = new Knowing();
        const stats = knowing.getStats();

        expect(stats.totalKnowledgeItems).toBe(0);
        expect(stats.totalTasks).toBe(0);
        expect(stats.totalRelationships).toBe(0);
    });

    test('should add knowledge items', async () => {
        const knowing = new Knowing();
        const testKnowledge = new SimpleTestKnowledge({tasks: ['<test --> value>. %1.00;0.90%']});

        await knowing.addKnowledge(testKnowledge);

        const stats = knowing.getStats();
        expect(stats.totalKnowledgeItems).toBe(1);
    });

    test('should query knowledge by predicate', async () => {
        const knowing = new Knowing();
        const testKnowledge = new SimpleTestKnowledge({type: 'test'});
        await knowing.addKnowledge(testKnowledge);

        const results = knowing.query(k => k.constructor.name === 'SimpleTestKnowledge');
        expect(results.length).toBe(1);
    });

    test('should find knowledge by type', async () => {
        const knowing = new Knowing();
        const testKnowledge = new SimpleTestKnowledge({type: 'test'});
        await knowing.addKnowledge(testKnowledge);

        const results = knowing.findByType('SimpleTestKnowledge');
        expect(results.length).toBe(1);
    });

    test('should get all tasks', async () => {
        const knowing = new Knowing();
        const testKnowledge = new SimpleTestKnowledge({
            tasks: ['<task1 --> value>. %1.00;0.90%', '<task2 --> value>. %0.50;0.90%']
        });
        await knowing.addKnowledge(testKnowledge);

        const tasks = await knowing.getAllTasks();
        expect(tasks.length).toBe(2);
    });

    test('should get all relationships', async () => {
        const knowing = new Knowing();
        const testKnowledge = new SimpleTestKnowledge({
            relationships: ['<rel1 --> rel2>. %1.00;0.90%']
        });
        await knowing.addKnowledge(testKnowledge);

        const relationships = await knowing.getAllRelationships();
        expect(relationships.length).toBe(1);
    });

    test('should clear all knowledge', async () => {
        const knowing = new Knowing();
        const testKnowledge = new SimpleTestKnowledge({tasks: ['<test --> value>. %1.00;0.90%']});
        await knowing.addKnowledge(testKnowledge);

        knowing.clear();

        const stats = knowing.getStats();
        expect(stats.totalKnowledgeItems).toBe(0);
        expect(stats.totalTasks).toBe(0);
    });

    test('should handle invalid knowledge objects', async () => {
        const knowing = new Knowing();

        await expect(async () => {
            await knowing.addKnowledge('invalid');
        }).rejects.toThrow('Invalid knowledge object: must implement Knowledge interface');
    });
});