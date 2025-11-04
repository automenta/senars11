import * as dfd from 'danfojs';
import { defaultNarseseTemplate } from './NarseseTemplate.js';

export class Knowledge {
  constructor(data = null, options = {}) {
    if (this.constructor === Knowledge) {
      throw new Error("Cannot instantiate abstract class Knowledge");
    }
    this.data = data;
    this.options = options;
    this.df = null;
    this.templateAPI = defaultNarseseTemplate;
  }

  toTasks() {
    throw new Error("toTasks method must be implemented in concrete class");
  }

  getItems() {
    throw new Error("getItems method must be implemented in concrete class");
  }

  getSummary() {
    throw new Error("getSummary method must be implemented in concrete class");
  }

  createRelationships() {
    throw new Error("createRelationships method must be implemented in concrete class");
  }

  async initDataFrame() {
    if (this.data && Array.isArray(this.data)) {
      this.df = new dfd.DataFrame(this.data);
    } else if (this.data && typeof this.data === 'object') {
      this.df = new dfd.DataFrame([this.data]);
    }
  }

  getDataFrame() { return this.df; }

  async transform(transformFn) {
    if (!this.df) await this.initDataFrame();
    return transformFn(this.df);
  }

  async filter(condition) {
    if (!this.df) await this.initDataFrame();
    return this.df.query(condition);
  }

  async groupBy(column) {
    if (!this.df) await this.initDataFrame();
    return this.df.groupby(column);
  }

  async aggregate(stats) {
    if (!this.df) await this.initDataFrame();
    const result = {};
    for (const [statName, statFn] of Object.entries(stats)) {
      result[statName] = await statFn(this.df);
    }
    return result;
  }

  /**
   * Create tasks using the flexible template API
   */
  async createTasksWithTemplate(templateName, data, options = {}) {
    try {
      return this.templateAPI.executeTemplate(templateName, data, options);
    } catch (error) {
      console.error(`Template error: ${error.message}`);
      return null;
    }
  }

  /**
   * Batch create tasks using the template API
   */
  async createBatchTasksWithTemplate(operations) {
    return this.templateAPI.executeBatch(operations);
  }

  /**
   * Register a custom template for this knowledge instance
   */
  registerCustomTemplate(name, templateFn) {
    this.templateAPI.registerTemplate(name, templateFn);
  }
}

export class TruthValueUtils {
  static normalizeMetric(value, min, max) {
    if (value < min) return 0;
    if (value > max) return 1;
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }

  static calculateFrequencyFromMetric(value, min, max) {
    return this.normalizeMetric(value, min, max);
  }

  static calculateConfidenceFromMetric(value, min, max) {
    return this.normalizeMetric(value, min, max);
  }

  static calculateTruthValue(value, min, max, defaultValue = 0.5) {
    const normalized = this.normalizeMetric(value, min, max);
    return isNaN(normalized) ? defaultValue : normalized;
  }

  static createTruthValue(frequency, confidence = 0.9) {
    return `%${frequency.toFixed(2)};${confidence.toFixed(2)}%`;
  }

  static calculateWeightedTruthValue(metrics) {
    let weightedSum = 0, totalWeight = 0;
    for (const { value, weight, min, max } of metrics) {
      const normalizedValue = this.normalizeMetric(value, min, max);
      weightedSum += normalizedValue * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }
}

export class DataTableKnowledge extends Knowledge {
  constructor(data = null, tableName = 'data', options = {}) {
    super(data, options);
    this.tableName = tableName;
  }

  async initDataTable(data) {
    if (Array.isArray(data)) {
      this.df = new dfd.DataFrame(data);
    } else if (data && typeof data === 'object') {
      this.df = new dfd.DataFrame([this.flattenObject(data)]);
    }
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    return flattened;
  }

  async processData() {
    if (!this.df) await this.initDataTable(this.data);
    let processedDf = this.df;
    if (this.options.handleMissingValues) processedDf = processedDf.dropna();
    if (this.options.removeDuplicates) processedDf = processedDf.dropDuplicates();
    this.df = processedDf;
    return this.df;
  }

  async toTasks() {
    if (!this.df) await this.processData();
    const tasks = [], rows = await this.df.values, cols = await this.df.columns;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowObj = {};
      cols.forEach((col, idx) => rowObj[col] = row[idx]);
      const task = await this.rowToTask(rowObj, i);
      if (task) tasks.push(task);
    }
    return tasks;
  }

  async rowToTask(row, index) {
    const keys = Object.keys(row);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const value = row[firstKey];
      const identifier = `${firstKey}_${index}`.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      return `<("${identifier}" --> ${firstKey}) --> ${value}>. %0.50;0.90%`;
    }
    return null;
  }

  async getItems() {
    if (!this.df) await this.processData();
    const rows = await this.df.values, cols = await this.df.columns;
    return rows.map(row => {
      const item = {};
      cols.forEach((col, idx) => item[col] = row[idx]);
      return item;
    });
  }

  async getSummary() {
    if (!this.df) await this.processData();
    const summary = {
      tableName: this.tableName,
      rowCount: await this.df.shape[0],
      columnCount: await this.df.shape[1],
      columns: await this.df.columns,
      statistics: {}
    };
    
    const numericCols = [];
    const allCols = await this.df.columns;
    for (const col of allCols) {
      try {
        const colData = this.df.column(col);
        if (['int32', 'float32', 'float64'].includes(colData.dtype)) {
          numericCols.push(col);
        }
      } catch (e) {}
    }
    
    for (const col of numericCols) {
      try {
        const colData = this.df.column(col);
        const mean = await colData.mean();
        const std = await colData.std();
        const min = await colData.min();
        const max = await colData.max();
        summary.statistics[col] = {
          mean: parseFloat(mean.toFixed(4)),
          std: parseFloat(std.toFixed(4)),
          min: parseFloat(min.toFixed(4)),
          max: parseFloat(max.toFixed(4))
        };
      } catch (e) {
        console.warn(`Could not calculate statistics for column ${col}: ${e.message}`);
      }
    }
    return summary;
  }

  async createRelationships() {
    return [];
  }

  async describe() {
    if (!this.df) await this.processData();
    return await this.df.describe();
  }
}