import { Rule } from './Rule.js';

/**
 * Language Model Rule for the stream reasoner system.
 * This rule uses language models to generate inferences and conclusions.
 */
export class LMRule extends Rule {
  constructor(id, lm, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
    super(id, 'lm', priority, config);
    this.lm = lm; // Language model instance
    this.promptTemplate = promptTemplate;
    this.responseProcessor = responseProcessor || this._createDefaultResponseProcessor();
    this.name = id;
    this.description = 'Language Model Rule for generating inferences using neural models';
  }

  /**
   * Check if this LM rule can be applied to the given premises
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {Object} context - Context containing system components
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(primaryPremise, secondaryPremise, context) {
    // LM rules can typically be applied to various premise types
    // This can be made more specific based on the rule's purpose
    return primaryPremise && primaryPremise.term; 
  }

  /**
   * Apply the LM rule to generate conclusions
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {Object} context - Context containing system components
   * @returns {Array<Task>} Array of derived tasks
   */
  async apply(primaryPremise, secondaryPremise, context = {}) {
    if (!this.canApply(primaryPremise, secondaryPremise, context)) {
      return [];
    }

    try {
      // Create a prompt using the template and the premises
      const prompt = this._fillPromptTemplate(
        this.promptTemplate,
        primaryPremise,
        secondaryPremise
      );

      // Generate response using the language model
      const lmResponse = await this.lm.generateText(prompt, {
        maxTokens: 200,
        temperature: 0.7
      });

      // Process the response to generate tasks
      const processedTasks = await this.responseProcessor(lmResponse, primaryPremise, secondaryPremise, context);

      return processedTasks || [];
    } catch (error) {
      console.error(`Error applying LM rule ${this.id}:`, error);
      return [];
    }
  }

  /**
   * Fill the prompt template with premise information
   * @private
   */
  _fillPromptTemplate(template, primaryPremise, secondaryPremise) {
    let filledPrompt = template
      .replace('{{taskTerm}}', primaryPremise.term.toString?.() || String(primaryPremise.term || 'unknown'))
      .replace('{{taskType}}', primaryPremise.punctuation || 'unknown')
      .replace('{{taskTruth}}', primaryPremise.truth ? 
        `frequency: ${primaryPremise.truth.f}, confidence: ${primaryPremise.truth.c}` : 
        'unknown truth value');

    if (secondaryPremise) {
      filledPrompt = filledPrompt
        .replace('{{secondaryTerm}}', secondaryPremise.term.toString?.() || String(secondaryPremise.term || 'unknown'))
        .replace('{{secondaryType}}', secondaryPremise.punctuation || 'unknown')
        .replace('{{secondaryTruth}}', secondaryPremise.truth ? 
          `frequency: ${secondaryPremise.truth.f}, confidence: ${secondaryPremise.truth.c}` : 
          'unknown truth value');
    }

    return filledPrompt;
  }

  /**
   * Create a default response processor
   * @private
   */
  _createDefaultResponseProcessor() {
    return async (lmResponse, primaryPremise, secondaryPremise, context) => {
      if (!lmResponse) return [];

      // In a real implementation, this would parse the LM response
      // and create appropriate tasks. For now, return empty array.
      return [];
    };
  }
}