import { Rule } from './Rule.js';

/**
 * Language Model Rule for the stream reasoner system.
 * This rule provides a flexible, declarative approach to LM-based reasoning.
 * Enhanced with better ergonomics and flexibility beyond the v9 implementation.
 */
export class LMRule extends Rule {
  constructor(id, lm, config = {}) {
    super(id, 'lm', config.priority || 1.0, config);
    this.lm = lm; // Language model instance
    
    // Configuration with enhanced defaults
    this.config = {
      // Default condition: always true if an LM is available
      condition: (primaryPremise, secondaryPremise, context) => {
        // Enhanced default condition with better null safety
        return !!this.lm && 
               primaryPremise?.term != null && 
               (secondaryPremise != null || config.singlePremise === true);
      },
      // Default prompt generator
      prompt: (primaryPremise, secondaryPremise, context) => {
        // Support both template-based and function-based prompt generation
        if (typeof config.promptTemplate === 'string') {
          return this._fillPromptTemplate(config.promptTemplate, primaryPremise, secondaryPremise);
        } else if (typeof config.promptTemplate === 'function') {
          return config.promptTemplate(primaryPremise, secondaryPremise, context);
        }
        throw new Error(`Prompt generation not implemented for rule: ${this.id}`);
      },
      // Default response processor
      process: (lmResponse, primaryPremise, secondaryPremise, context) => {
        // Support both function-based and legacy response processor approaches
        if (typeof config.process === 'function') {
          return config.process(lmResponse, primaryPremise, secondaryPremise, context);
        } else if (typeof config.responseProcessor === 'function') {
          return config.responseProcessor(lmResponse, primaryPremise, secondaryPremise, context);
        }
        return lmResponse || '';
      },
      // Default task generator
      generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
        if (typeof config.generate === 'function') {
          return config.generate(processedOutput, primaryPremise, secondaryPremise, context);
        } else if (typeof config.responseProcessor === 'function') {
          // For backward compatibility, still support responseProcessor
          return config.responseProcessor(processedOutput, primaryPremise, secondaryPremise, context);
        }
        return [];
      },
      // LM options with defaults
      lm_options: {
        temperature: 0.7,
        max_tokens: 200,
        ...config.lm_options,
      },
      // Whether this rule works with a single premise
      singlePremise: config.singlePremise || false,
      ...config,
    };
    
    this.name = config.name || id;
    this.description = config.description || 'Language Model Rule for generating inferences using neural models';
    
    // Initialize stats for tracking LM usage and performance
    this.lmStats = { 
      tokens: 0, 
      calls: 0, 
      avgTime: 0,
      successRate: 0,
      totalExecutions: 0
    };
    
    // Track execution metrics
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0
    };
  }

  /**
   * Static factory method for creating LM rules with declarative configuration
   */
  static create(config) {
    const { id, lm, ...rest } = config;
    if (!id || !lm) {
      throw new Error('LMRule.create: `id` and `lm` are required to create an LMRule.');
    }
    return new LMRule(id, lm, rest);
  }

  /**
   * Check if this LM rule can be applied to the given premises
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise (can be null for single-premise rules)
   * @param {Object} context - Context containing system components
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(primaryPremise, secondaryPremise, context) {
    try {
      return this.config.condition(primaryPremise, secondaryPremise, context);
    } catch (error) {
      console.error(`Error in condition for LM rule ${this.id}:`, error);
      return false;
    }
  }

  /**
   * Generate the prompt for the language model based on inputs
   */
  generatePrompt(primaryPremise, secondaryPremise, context) {
    return this.config.prompt(primaryPremise, secondaryPremise, context);
  }

  /**
   * Process the LM output to prepare for task generation
   */
  processLMOutput(lmResponse, primaryPremise, secondaryPremise, context) {
    return this.config.process(lmResponse, primaryPremise, secondaryPremise, context);
  }

  /**
   * Generate tasks from the processed output
   */
  generateTasks(processedOutput, primaryPremise, secondaryPremise, context) {
    return this.config.generate(processedOutput, primaryPremise, secondaryPremise, context);
  }

  /**
   * Apply the LM rule to generate conclusions
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {Object} context - Context containing system components
   * @returns {Array<Task>} Array of derived tasks
   */
  async apply(primaryPremise, secondaryPremise, context = {}) {
    const startTime = Date.now();
    this.executionStats.totalExecutions++;
    
    try {
      // Check if rule can be applied
      if (!this.canApply(primaryPremise, secondaryPremise, context)) {
        this._updateExecutionStats(false, Date.now() - startTime);
        return [];
      }

      // Generate the prompt
      const prompt = this.generatePrompt(primaryPremise, secondaryPremise, context);
      
      // Execute the language model
      const lmResponse = await this.executeLM(prompt);

      if (!lmResponse) {
        this._updateExecutionStats(false, Date.now() - startTime);
        return [];
      }

      // Process the response
      const processedOutput = this.processLMOutput(lmResponse, primaryPremise, secondaryPremise, context);
      
      // Generate tasks from the processed output
      const newTasks = this.generateTasks(processedOutput, primaryPremise, secondaryPremise, context);

      this._updateExecutionStats(true, Date.now() - startTime);
      return newTasks || [];
    } catch (error) {
      console.error(`Error applying LM rule ${this.id}:`, error);
      this._updateExecutionStats(false, Date.now() - startTime);
      return [];
    }
  }

  /**
   * Execute the language model with the given prompt
   */
  async executeLM(prompt) {
    if (!this.lm) {
      throw new Error(`LM unavailable for rule ${this.id}`);
    }

    const startTime = Date.now();
    let response;
    
    // Try multiple LM interface patterns for maximum compatibility
    if (typeof this.lm.generateText === 'function') {
      response = await this.lm.generateText(prompt, this.config.lm_options);
    } else if (typeof this.lm.process === 'function') {
      response = await this.lm.process(prompt, this.config.lm_options);
    } else if (typeof this.lm.query === 'function') {
      response = await this.lm.query(prompt, this.config.lm_options);
    } else {
      throw new Error(`LM does not have a compatible interface for rule ${this.id}. Expected one of: generateText, process, query`);
    }
    
    const executionTime = Date.now() - startTime;

    this._updateLMStats(prompt.length + (response?.length || 0), executionTime);
    return response;
  }

  /**
   * Update LM statistics
   */
  _updateLMStats(tokens, executionTime) {
    const s = this.lmStats;
    s.calls++;
    s.tokens += tokens;
    s.avgTime = (s.avgTime * (s.calls - 1) + executionTime) / s.calls;
  }

  /**
   * Update execution statistics
   */
  _updateExecutionStats(success, executionTime) {
    if (success) {
      this.executionStats.successfulExecutions++;
    } else {
      this.executionStats.failedExecutions++;
    }
    
    const total = this.executionStats.totalExecutions;
    this.executionStats.avgExecutionTime = (this.executionStats.avgExecutionTime * (total - 1) + executionTime) / total;
    this.executionStats.successRate = this.executionStats.successfulExecutions / total;
  }

  /**
   * Get comprehensive statistics for this rule
   */
  getStats() {
    return {
      lm: { ...this.lmStats },
      execution: { ...this.executionStats },
      ruleInfo: {
        id: this.id,
        name: this.name,
        type: this.type,
        enabled: this.enabled
      }
    };
  }

  /**
   * Fill the prompt template with premise information
   * @private
   */
  _fillPromptTemplate(template, primaryPremise, secondaryPremise) {
    let filledPrompt = template
      .replace('{{taskTerm}}', primaryPremise.term?.toString?.() || String(primaryPremise.term || 'unknown'))
      .replace('{{taskType}}', primaryPremise.punctuation || 'unknown')
      .replace('{{taskTruth}}', primaryPremise.truth ? 
        `frequency: ${primaryPremise.truth.f}, confidence: ${primaryPremise.truth.c}` : 
        'unknown truth value');

    if (secondaryPremise) {
      filledPrompt = filledPrompt
        .replace('{{secondaryTerm}}', secondaryPremise.term?.toString?.() || String(secondaryPremise.term || 'unknown'))
        .replace('{{secondaryType}}', secondaryPremise.punctuation || 'unknown')
        .replace('{{secondaryTruth}}', secondaryPremise.truth ? 
          `frequency: ${secondaryPremise.truth.f}, confidence: ${secondaryPremise.truth.c}` : 
          'unknown truth value');
    }

    return filledPrompt;
  }
}