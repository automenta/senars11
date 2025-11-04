import path from 'path';

export class Knowing {
  constructor(options = {}) {
    this.knowledgeItems = [];
    this.options = options;
    this.stats = {
      totalKnowledgeItems: 0,
      totalTasks: 0,
      totalRelationships: 0,
      knowledgeByType: {},
      lastUpdated: null
    };
  }

  async addKnowledge(knowledge) {
    if (!knowledge || typeof knowledge.getItems !== 'function') {
      throw new Error('Invalid knowledge object: must implement Knowledge interface');
    }

    try {
      this.knowledgeItems.push(knowledge);
      await this._updateStats();
      
      if (this.options.verbose) {
        console.log(`✅ Added knowledge: ${knowledge.constructor.name}`);
      }
    } catch (error) {
      console.error(`❌ Error adding knowledge: ${error.message}`);
      throw error;
    }
  }

  async addMultipleKnowledge(knowledgeArray) {
    for (const knowledge of knowledgeArray) {
      await this.addKnowledge(knowledge);
    }
  }

  query(predicate) {
    if (typeof predicate !== 'function') {
      throw new Error('Query predicate must be a function');
    }
    return this.knowledgeItems.filter(knowledge => predicate(knowledge));
  }

  findByType(type) {
    return this.knowledgeItems.filter(knowledge => 
      knowledge.constructor.name === type || 
      knowledge.constructor.name.toLowerCase().includes(type.toLowerCase())
    );
  }

  async getAllTasks() {
    const allTasks = [];
    for (const knowledge of this.knowledgeItems) {
      try {
        const tasks = await knowledge.toTasks();
        if (Array.isArray(tasks)) allTasks.push(...tasks);
      } catch (error) {
        console.error(`❌ Error getting tasks from ${knowledge.constructor.name}: ${error.message}`);
      }
    }
    return allTasks;
  }

  async getAllRelationships() {
    const allRelationships = [];
    for (const knowledge of this.knowledgeItems) {
      try {
        const relationships = await knowledge.createRelationships();
        if (Array.isArray(relationships)) allRelationships.push(...relationships);
      } catch (error) {
        console.error(`❌ Error getting relationships from ${knowledge.constructor.name}: ${error.message}`);
      }
    }
    return allRelationships;
  }

  getAllKnowledge() {
    return [...this.knowledgeItems];
  }

  getStats() {
    return { ...this.stats };
  }

  async _updateStats() {
    this.stats.totalKnowledgeItems = this.knowledgeItems.length;
    this.stats.totalTasks = 0;
    this.stats.totalRelationships = 0;
    this.stats.knowledgeByType = {};
    this.stats.lastUpdated = new Date().toISOString();

    for (const knowledge of this.knowledgeItems) {
      const typeName = knowledge.constructor.name;
      
      if (!this.stats.knowledgeByType[typeName]) {
        this.stats.knowledgeByType[typeName] = {
          count: 0,
          tasks: 0,
          relationships: 0
        };
      }
      
      this.stats.knowledgeByType[typeName].count++;
      
      try {
        const tasks = await knowledge.toTasks();
        const taskCount = Array.isArray(tasks) ? tasks.length : 0;
        this.stats.totalTasks += taskCount;
        this.stats.knowledgeByType[typeName].tasks += taskCount;
        
        const relationships = await knowledge.createRelationships();
        const relationshipCount = Array.isArray(relationships) ? relationships.length : 0;
        this.stats.totalRelationships += relationshipCount;
        this.stats.knowledgeByType[typeName].relationships += relationshipCount;
      } catch (error) {
        console.error(`❌ Error calculating stats for ${typeName}: ${error.message}`);
      }
    }
  }

  async getSummary() {
    await this._updateStats();
    return {
      stats: this.getStats(),
      knowledgeTypes: Object.keys(this.stats.knowledgeByType),
      sampleTasks: (await this.getAllTasks()).slice(0, 5),
      sampleRelationships: (await this.getAllRelationships()).slice(0, 5)
    };
  }

  clear() {
    this.knowledgeItems = [];
    this.stats = {
      totalKnowledgeItems: 0,
      totalTasks: 0,
      totalRelationships: 0,
      knowledgeByType: {},
      lastUpdated: null
    };
  }

  async export() {
    const exported = {
      metadata: {
        timestamp: new Date().toISOString(),
        knowledgeCount: this.knowledgeItems.length,
        totalTasks: 0,
        totalRelationships: 0
      },
      knowledge: []
    };

    for (const knowledge of this.knowledgeItems) {
      const knowledgeData = {
        type: knowledge.constructor.name,
        summary: await knowledge.getSummary(),
        items: await knowledge.getItems(),
        tasks: await knowledge.toTasks(),
        relationships: await knowledge.createRelationships()
      };
      
      exported.knowledge.push(knowledgeData);
      exported.metadata.totalTasks += knowledgeData.tasks.length;
      exported.metadata.totalRelationships += knowledgeData.relationships.length;
    }

    return exported;
  }

  import(data) {
    console.warn('Import functionality requires custom knowledge reconstruction logic');
    return false;
  }
}