/**
 * KnowledgeFactory Unit Tests
 * Tests for the Knowledge factory and registration system
 */
import {Knowledge, KnowledgeFactory} from '../../../src/know/index.js';
import {DataTableKnowledge} from '../../../src/know/DataTableKnowledge.js';

// Test knowledge class
class TestKnowledge extends Knowledge {
    async toTasks() {
        return this.data ? [`<test --> ${this.data.value}>. %1.00;0.90%`] : [];
    }

    async getItems() {
        return this.data ? [this.data] : [];
    }

    async getSummary() {
        return {type: 'test', data: this.data};
    }

    async createRelationships() {
        return [];
    }
}

describe('KnowledgeFactory', () => {
    beforeEach(() => {
        // Reset the registry for each test
        KnowledgeFactory.knowledgeRegistry = {};
    });

    test('should register and create knowledge types', () => {
        KnowledgeFactory.registerKnowledgeType('test', TestKnowledge);
        expect(() => {
            KnowledgeFactory.createKnowledge('test', {value: 'test'});
        }).not.toThrow();
    });

    test('should throw error for unknown knowledge type', () => {
        expect(() => {
            KnowledgeFactory.createKnowledge('unknown', {});
        }).toThrow('Unknown knowledge type: unknown');
    });

    test('should validate knowledge class inheritance', () => {
        class InvalidClass {
        }

        expect(() => {
            KnowledgeFactory.registerKnowledgeType('invalid', InvalidClass);
        }).toThrow('Knowledge class must extend the Knowledge base class');
    });

    test('should auto-detect knowledge for generic data', () => {
        const knowledge = KnowledgeFactory.autoDetectKnowledge({key: 'value'});
        expect(knowledge).toBeDefined();
        expect(knowledge.constructor.name).toBe('DataTableKnowledge');
    });

    test('should get available types', () => {
        KnowledgeFactory.registerKnowledgeType('test', TestKnowledge);
        const types = KnowledgeFactory.getAvailableTypes();
        expect(types).toContain('test');
    });
});