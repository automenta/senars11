/**
 * Task/Term/Truth Template API for flexible Narsese generation
 * Provides abstracted and consolidated templates for creating tasks and relationships
 */
import { TruthValueUtils } from './Knowledge.js';

export class NarseseTemplate {
  constructor() {
    this.templates = new Map();
    this.registerDefaultTemplates();
  }

  /**
   * Register a template with a name
   */
  registerTemplate(name, templateFn) {
    this.templates.set(name, templateFn);
  }

  /**
   * Execute a template with data
   */
  executeTemplate(name, data, options = {}) {
    const templateFn = this.templates.get(name);
    if (!templateFn) {
      throw new Error(`Template "${name}" not found`);
    }
    
    return templateFn(data, options);
  }

  /**
   * Default templates for common Narsese patterns
   */
  registerDefaultTemplates() {
    // Basic statement template
    this.registerTemplate('statement', (data, options = {}) => {
      const { subject, predicate, truth } = data;
      const truthStr = this._formatTruthValue(truth);
      return `<${subject} --> ${predicate}>${truthStr}`;
    });

    // Relationship template
    this.registerTemplate('relationship', (data, options = {}) => {
      const { subject, relation, object, truth } = data;
      const truthStr = this._formatTruthValue(truth);
      return `<${subject} ${relation} ${object}>${truthStr}`;
    });

    // Inheritance template
    this.registerTemplate('inheritance', (data, options = {}) => {
      const { subject, object, truth } = data;
      const truthStr = this._formatTruthValue(truth);
      return `<${subject} --> ${object}>${truthStr}`;
    });

    // Similarity template
    this.registerTemplate('similarity', (data, options = {}) => {
      const { subject, object, truth } = data;
      const truthStr = this._formatTruthValue(truth);
      return `<${subject} <-> ${object}>${truthStr}`;
    });

    // Implication template
    this.registerTemplate('implication', (data, options = {}) => {
      const { subject, object, truth } = data;
      const truthStr = this._formatTruthValue(truth);
      return `<${subject} =/> ${object}>${truthStr}`;
    });

    // File analysis template
    this.registerTemplate('file-analysis', (data, options = {}) => {
      const { filePath, metric, value, min = 0, max = 100 } = data;
      const normalizedValue = TruthValueUtils.normalizeMetric(value, min, max);
      const truth = { frequency: normalizedValue, confidence: options.confidence || 0.9 };
      const truthStr = this._formatTruthValue(truth);
      return `<("${filePath}" --> ${metric}) --> ${value}>${truthStr}`;
    });

    // Directory analysis template
    this.registerTemplate('directory-analysis', (data, options = {}) => {
      const { dirPath, metric, value, min = 0, max = 100 } = data;
      const normalizedValue = TruthValueUtils.normalizeMetric(value, min, max);
      const truth = { frequency: normalizedValue, confidence: options.confidence || 0.8 };
      const truthStr = this._formatTruthValue(truth);
      return `<("${dirPath}" --> ${metric}) --> ${value}>${truthStr}`;
    });

    // Test result template
    this.registerTemplate('test-result', (data, options = {}) => {
      const { testName, status, duration, truth } = data;
      const truthStr = this._formatTruthValue(truth);
      
      if (status) {
        return `<("${testName}" --> pass) --> ${status}>${truthStr}`;
      } else if (duration !== undefined) {
        return `<("${testName}" --> time) --> ${duration}ms>${truthStr}`;
      }
      return null;
    });

    // Relationship template
    this.registerTemplate('containment', (data, options = {}) => {
      const { container, contained, relationship = 'in', truth } = data;
      const truthStr = this._formatTruthValue(truth);
      return `<("${contained}" --> ${relationship}_of) --> "${container}">${truthStr}`;
    });
  }

  /**
   * Format truth value according to Narsese standards
   */
  _formatTruthValue(truth) {
    if (!truth) return '. %1.00;0.90%';
    
    if (typeof truth === 'number') {
      // If it's just a frequency number
      return `. ${TruthValueUtils.createTruthValue(truth, 0.9)}`;
    }
    
    if (typeof truth === 'object') {
      const frequency = truth.frequency !== undefined ? truth.frequency : (truth.f || 1.0);
      const confidence = truth.confidence !== undefined ? truth.confidence : (truth.c || 0.9);
      return `. ${TruthValueUtils.createTruthValue(frequency, confidence)}`;
    }
    
    return '. %1.00;0.90%'; // Default truth value
  }

  /**
   * Create a custom template on the fly
   */
  createTemplate(name, templateFn) {
    this.registerTemplate(name, templateFn);
    return this;
  }

  /**
   * Batch execute multiple templates
   */
  executeBatch(operations) {
    return operations.map(op => {
      if (typeof op === 'string') {
        return op; // Already a statement
      }
      if (typeof op === 'object' && op.template && op.data) {
        return this.executeTemplate(op.template, op.data, op.options || {});
      }
      return null;
    }).filter(Boolean);
  }
}

// Default instance for convenience
export const defaultNarseseTemplate = new NarseseTemplate();

/**
 * Abstract base class for knowledge systems using the template API
 */
export class TemplateBasedKnowledge {
  constructor(data = null, options = {}) {
    this.data = data;
    this.options = options;
    this.templateAPI = defaultNarseseTemplate;
  }

  /**
   * Create tasks using template API
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
   * Batch create tasks using template API
   */
  async createBatchTasksWithTemplate(operations) {
    return this.templateAPI.executeBatch(operations);
  }

  /**
   * Register custom template for this knowledge instance
   */
  registerCustomTemplate(name, templateFn) {
    this.templateAPI.registerTemplate(name, templateFn);
  }
}