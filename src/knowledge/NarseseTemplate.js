/**
 * Task/Term/Truth Template API for flexible Narsese generation
 * Provides abstracted and consolidated templates for creating tasks and relationships
 */

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

const DEFAULT_TEMPLATES = Object.freeze({
  statement: (data, options = {}) => {
    const { subject, predicate, truth } = data;
    const truthStr = _formatTruthValue(truth);
    return `<${subject} --> ${predicate}>${truthStr}`;
  },
  
  relationship: (data, options = {}) => {
    const { subject, relation, object, truth } = data;
    const truthStr = _formatTruthValue(truth);
    return `<${subject} ${relation} ${object}>${truthStr}`;
  },
  
  inheritance: (data, options = {}) => {
    const { subject, object, truth } = data;
    const truthStr = _formatTruthValue(truth);
    return `<${subject} --> ${object}>${truthStr}`;
  },
  
  similarity: (data, options = {}) => {
    const { subject, object, truth } = data;
    const truthStr = _formatTruthValue(truth);
    return `<${subject} <-> ${object}>${truthStr}`;
  },
  
  implication: (data, options = {}) => {
    const { subject, object, truth } = data;
    const truthStr = _formatTruthValue(truth);
    return `<${subject} =/> ${object}>${truthStr}`;
  },
  
  'file-analysis': (data, options = {}) => {
    const { filePath, metric, value, min = 0, max = 100 } = data;
    const normalizedValue = TruthValueUtils.normalizeMetric(value, min, max);
    const truth = { frequency: normalizedValue, confidence: options.confidence || 0.9 };
    const truthStr = _formatTruthValue(truth);
    return `<("${filePath}" --> ${metric}) --> ${value}>${truthStr}`;
  },
  
  'directory-analysis': (data, options = {}) => {
    const { dirPath, metric, value, min = 0, max = 100 } = data;
    const normalizedValue = TruthValueUtils.normalizeMetric(value, min, max);
    const truth = { frequency: normalizedValue, confidence: options.confidence || 0.8 };
    const truthStr = _formatTruthValue(truth);
    return `<("${dirPath}" --> ${metric}) --> ${value}>${truthStr}`;
  },
  
  'test-result': (data, options = {}) => {
    const { testName, status, duration, truth } = data;
    const truthStr = _formatTruthValue(truth);
    
    if (status) {
      return `<("${testName}" --> pass) --> ${status}>${truthStr}`;
    } else if (duration !== undefined) {
      return `<("${testName}" --> time) --> ${duration}ms>${truthStr}`;
    }
    return null;
  },
  
  containment: (data, options = {}) => {
    const { container, contained, relationship = 'in', truth } = data;
    const truthStr = _formatTruthValue(truth);
    return `<("${contained}" --> ${relationship}_of) --> "${container}">${truthStr}`;
  }
});

function _formatTruthValue(truth) {
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

export class NarseseTemplate {
  constructor() {
    this.templates = new Map(Object.entries(DEFAULT_TEMPLATES));
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