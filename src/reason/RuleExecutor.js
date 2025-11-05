import { mergeConfig } from './utils/common.js';
import { ReasonerError, logError, createErrorHandler } from './utils/error.js';

/**
 * RuleExecutor indexes all registered rules for fast retrieval and performs 
 * symbolic guard analysis and optimization.
 */
export class RuleExecutor {
  constructor(config = {}) {
    this.config = mergeConfig({
      // Default configuration options
    }, config);
    this.rules = [];
    this.optimizedRuleMap = new Map();
    this.decisionTree = null;
    
    // Create error handler for consistent error handling
    this.errorHandler = createErrorHandler('RuleExecutor');
  }

  /**
   * Register a rule for execution
   * @param {Rule} rule - The rule to register
   */
  register(rule) {
    this.rules.push(rule);
    // When rules change, we need to rebuild the optimization structure
    this.decisionTree = null;
    return this;
  }

  /**
   * Register multiple rules
   * @param {Array<Rule>} rules - Array of rules to register
   */
  registerMany(rules) {
    for (const rule of rules) {
      this.register(rule);
    }
    return this;
  }

  /**
   * Analyze and optimize symbolic guards for the rules
   */
  buildOptimizationStructure() {
    // For now, create a simple structure that can be expanded later
    // This is where we would implement the decision tree creation
    // for guard analysis, deduplication, and ordering
    this.decisionTree = this._createDecisionTree();
  }

  /**
   * Create an optimized decision tree for rule selection
   * @private
   */
  _createDecisionTree() {
    // A naive implementation that just builds a lookup based on rule categories
    // In the future, this would build a more sophisticated decision tree
    const tree = new Map();
    
    for (const rule of this.rules) {
      // Create a simple key based on rule properties for initial optimization
      const key = this._getRuleKey(rule);
      if (!tree.has(key)) {
        tree.set(key, []);
      }
      tree.get(key).push(rule);
    }
    
    return tree;
  }

  /**
   * Generate a key for rule lookup
   * @private
   */
  _getRuleKey(rule) {
    // For now, just use rule type as a simple key
    // In the future, this would be more sophisticated based on guards
    return rule.type || 'default';
  }

  /**
   * Get candidate rules for a premise pair
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @returns {Array<Rule>} - Array of candidate rules
   */
  getCandidateRules(primaryPremise, secondaryPremise) {
    // Build optimization structure if not already built
    if (!this.decisionTree) {
      this.buildOptimizationStructure();
    }

    // For now, return all rules as candidates
    // In the future, this would use the decision tree to filter candidates efficiently
    return this.rules.filter(rule => {
      try {
        return rule.canApply?.(primaryPremise, secondaryPremise) ?? true;
      } catch (error) {
        logError(error, { 
          ruleId: rule.id || rule.name, 
          context: 'rule_candidate_check' 
        }, 'warn');
        return false;
      }
    });
  }

  /**
   * Execute a rule and return results
   * @param {Rule} rule - The rule to execute
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @param {object} context - The execution context
   * @returns {Array<Task>} - Array of derived tasks
   */
  executeRule(rule, primaryPremise, secondaryPremise, context) {
    try {
      // Execute the rule application
      const results = rule.apply?.(primaryPremise, secondaryPremise, context) || [];
      return Array.isArray(results) ? results : [results];
    } catch (error) {
      logError(error, { 
        ruleId: rule.id || rule.name, 
        context: 'rule_execution' 
      }, 'error');
      return [];
    }
  }

  /**
   * Get the number of registered rules
   * @returns {number}
   */
  getRuleCount() {
    return this.rules.length;
  }

  /**
   * Clear all registered rules
   */
  clearRules() {
    this.rules = [];
    this.decisionTree = null;
    this.optimizedRuleMap.clear();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.clearRules();
    this.optimizedRuleMap.clear();
    this.decisionTree = null;
  }
}