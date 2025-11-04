import { Knowledge, DataTableKnowledge, TruthValueUtils } from './Knowledge.js';

export class KnowledgeFactory {
  static knowledgeRegistry = {};

  static registerKnowledgeType(type, knowledgeClass) {
    if (!(knowledgeClass.prototype instanceof Knowledge)) {
      throw new Error(`Knowledge class must extend the Knowledge base class`);
    }
    this.knowledgeRegistry[type] = knowledgeClass;
  }

  static createKnowledge(type, data, options = {}) {
    const KnowledgeClass = this.knowledgeRegistry[type];
    if (!KnowledgeClass) {
      throw new Error(`Unknown knowledge type: ${type}. Available types: ${Object.keys(this.knowledgeRegistry).join(', ')}`);
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
    return Object.keys(this.knowledgeRegistry);
  }
}