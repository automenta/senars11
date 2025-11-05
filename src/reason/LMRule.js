import { Rule } from './Rule.js';
import { mergeConfig } from './utils/common.js';
import { logError } from './utils/error.js';

/**
 * Language Model Rule for the new reasoner design
 */
export class LMRule extends Rule {
  constructor(id, lm, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
    super(id, 'lm', priority, config);
    this.lm = lm;
    this.promptTemplate = promptTemplate;
    this.responseProcessor = responseProcessor;
    this.lmConfig = mergeConfig({
      temperature: 0.7,
      maxTokens: 1000,
      model: 'default'
    }, config.lmConfig);
  }

  /**
   * Apply the rule asynchronously
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {object} context - The execution context
   * @returns {Promise<Array<Task>>} - Promise resolving to array of derived tasks
   */
  async applyAsync(primaryPremise, secondaryPremise, context) {
    if (!this.lm) {
      logError(new Error(`LM unavailable for rule ${this.id}`), { 
        ruleId: this.id, 
        context: 'lm_unavailable' 
      }, 'error');
      return [];
    }

    try {
      const prompt = this._buildPrompt(primaryPremise, secondaryPremise, context);
      const response = await this.lm.process(prompt, this.lmConfig);
      const processedResponse = await this._processResponse(response, primaryPremise, secondaryPremise);

      return Array.isArray(processedResponse) ? processedResponse : [processedResponse];
    } catch (error) {
      logError(error, { ruleId: this.id, context: 'lm_rule_execution' }, 'error');
      return [];
    }
  }

  /**
   * Builds the prompt for the language model
   * @private
   */
  _buildPrompt(primaryPremise, secondaryPremise, context) {
    const templateVars = this._getTemplateVars(primaryPremise, secondaryPremise, context);
    return this.promptTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      templateVars[key] !== undefined ? templateVars[key] : match
    );
  }

  /**
   * Gets template variables for prompt construction
   * @private
   */
  _getTemplateVars(primaryPremise, secondaryPremise, context) {
    return {
      primaryTerm: primaryPremise.term?.toString() || 'unknown',
      secondaryTerm: secondaryPremise.term?.toString() || 'unknown',
      primaryType: primaryPremise.type || 'unknown',
      secondaryType: secondaryPremise.type || 'unknown',
      context: JSON.stringify(context || {})
    };
  }

  /**
   * Process the LM response
   * @private
   */
  async _processResponse(response, primaryPremise, secondaryPremise) {
    if (typeof this.responseProcessor === 'function') {
      return await this.responseProcessor(response, primaryPremise, secondaryPremise);
    }
    return response;
  }
}