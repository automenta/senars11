/**
 * Base Rule class for the new reasoner design
 */
export class Rule {
  constructor(id, type = 'general', priority = 1.0, config = {}) {
    this.id = id;
    this.type = type; // 'nal', 'lm', or other types
    this.priority = priority;
    this.config = config;
    this.enabled = config.enabled !== false;
  }

  /**
   * Determine if this rule can be applied to the given premises
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {object} context - The execution context
   * @returns {boolean} - Whether the rule can be applied
   */
  canApply(primaryPremise, secondaryPremise, context) {
    return this.enabled;
  }

  /**
   * Apply the rule to the given premises
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {object} context - The execution context
   * @returns {Array<Task>} - Array of derived tasks
   */
  apply(primaryPremise, secondaryPremise, context) {
    // Default implementation - should be overridden by subclasses
    return [];
  }

  /**
   * Apply the rule asynchronously (for LM rules and other async operations)
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {object} context - The execution context
   * @returns {Promise<Array<Task>>} - Promise resolving to array of derived tasks
   */
  async applyAsync(primaryPremise, secondaryPremise, context) {
    // Default implementation - should be overridden by subclasses that need async processing
    return this.apply(primaryPremise, secondaryPremise, context);
  }

  /**
   * Enable the rule
   */
  enable() {
    this.enabled = true;
    return this;
  }

  /**
   * Disable the rule
   */
  disable() {
    this.enabled = false;
    return this;
  }
}