import { Knowledge } from './Knowledge.js';
import { DataTableKnowledge } from './DataTableKnowledge.js';

const KNOWLEDGE_REGISTRY = new Map();

export class KnowledgeFactory {
  static registerKnowledgeType(type, knowledgeClass) {
    if (!(knowledgeClass.prototype instanceof Knowledge)) {
      throw new Error(`Knowledge class must extend the Knowledge base class`);
    }
    KNOWLEDGE_REGISTRY.set(type, knowledgeClass);
  }

  static createKnowledge(type, data, options = {}) {
    const KnowledgeClass = KNOWLEDGE_REGISTRY.get(type);
    if (!KnowledgeClass) {
      throw new Error(`Unknown knowledge type: ${type}. Available types: ${[...KNOWLEDGE_REGISTRY.keys()].join(', ')}`);
    }
    return new KnowledgeClass(data, options);
  }

  static createGenericKnowledge(data, tableName = 'generic_data', options = {}) {
    return new DataTableKnowledge(data, tableName, options);
  }

  static autoDetectKnowledge(data, name = '', options = {}) {
    if (!data) return null;
    const tableName = name || 'auto_detected';
    return new DataTableKnowledge(data, tableName, options);
  }
  
  static getAvailableTypes() {
    return [...KNOWLEDGE_REGISTRY.keys()];
  }
}