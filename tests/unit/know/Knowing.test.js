import {Knowing} from '../../../src/know/Knowing.js';
import {Knowledge} from '../../../src/know/Knowledge.js';

class SimpleTestKnowledge extends Knowledge {
    async toTasks() { return this.data?.tasks || []; }
    async getItems() { return this.data?.items || []; }
    async getSummary() { return {data: this.data}; }
    async createRelationships() { return this.data?.relationships || []; }
}

describe('Knowing System', () => {
    test('should initialize with empty stats', () => {
        expect(new Knowing().getStats()).toMatchObject({
            totalKnowledgeItems: 0,
            totalTasks: 0,
            totalRelationships: 0
        });
    });

    test('should add knowledge items', async () => {
        const knowing = new Knowing();
        await knowing.addKnowledge(new SimpleTestKnowledge({tasks: ['<test --> value>. %1.00;0.90%']}));
        expect(knowing.getStats().totalKnowledgeItems).toBe(1);
    });

    test('should query knowledge by predicate', async () => {
        const knowing = new Knowing();
        await knowing.addKnowledge(new SimpleTestKnowledge({type: 'test'}));
        expect(knowing.query(k => k.constructor.name === 'SimpleTestKnowledge')).toHaveLength(1);
    });

    test('should find knowledge by type', async () => {
        const knowing = new Knowing();
        await knowing.addKnowledge(new SimpleTestKnowledge({type: 'test'}));
        expect(knowing.findByType('SimpleTestKnowledge')).toHaveLength(1);
    });

    test('should get all tasks', async () => {
        const knowing = new Knowing();
        await knowing.addKnowledge(new SimpleTestKnowledge({
            tasks: ['<task1 --> value>. %1.00;0.90%', '<task2 --> value>. %0.50;0.90%']
        }));
        expect(await knowing.getAllTasks()).toHaveLength(2);
    });

    test('should get all relationships', async () => {
        const knowing = new Knowing();
        await knowing.addKnowledge(new SimpleTestKnowledge({
            relationships: ['<rel1 --> rel2>. %1.00;0.90%']
        }));
        expect(await knowing.getAllRelationships()).toHaveLength(1);
    });

    test('should clear all knowledge', async () => {
        const knowing = new Knowing();
        await knowing.addKnowledge(new SimpleTestKnowledge({tasks: ['<test --> value>. %1.00;0.90%']}));

        knowing.clear();
        expect(knowing.getStats()).toMatchObject({
            totalKnowledgeItems: 0,
            totalTasks: 0
        });
    });

    test('should handle invalid knowledge objects', async () => {
        await expect(new Knowing().addKnowledge('invalid'))
            .rejects.toThrow('Invalid knowledge object: must implement Knowledge interface');
    });
});
