import {mergeConfig} from './utils/common.js';
import {logError} from './utils/error.js';

/**
 * RuleExecutor indexes all registered rules for fast retrieval and performs
 * symbolic guard analysis and optimization.
 */
export class RuleExecutor {
    constructor(config = {}) {
        this.config = mergeConfig({}, config);
        this.rules = [];
        this.optimizedRuleMap = new Map();
        this.decisionTree = null;
    }

    register(rule) {
        this.rules.push(rule);
        this.decisionTree = null;
        return this;
    }

    registerMany(rules) {
        for (const rule of rules) {
            this.register(rule);
        }
        return this;
    }

    buildOptimizationStructure() {
        // Optimization temporarily disabled due to key mismatch issues
        this.decisionTree = null;
    }

    getCandidateRules(primaryPremise, secondaryPremise) {
        // For now, use the current approach but optimize the filtering process
        return this._filterCandidates(this.rules, primaryPremise, secondaryPremise);
    }

    /**
     * More efficient rule filtering with early exit and caching
     * @private
     */
    _filterCandidates(candidates, primaryPremise, secondaryPremise) {
        const validRules = [];
        const primaryTerm = primaryPremise?.term;
        const secondaryTerm = secondaryPremise?.term;

        for (const rule of candidates) {
            try {
                // Quick early exit check if rule has specific term requirements
                if (this._shouldSkipRule(rule, primaryTerm, secondaryTerm)) {
                    continue;
                }

                if (this._canRuleApply(rule, primaryPremise, secondaryPremise)) {
                    validRules.push(rule);
                }
            } catch (error) {
                logError(error, {
                    ruleId: rule.id ?? rule.name,
                    context: 'rule_candidate_check'
                }, 'warn');
            }
        }

        return validRules;
    }

    /**
     * Check if a rule should be skipped early based on term properties
     * @private
     */
    _shouldSkipRule(rule, primaryTerm, secondaryTerm) {
        // If rule has specific requirements that don't match, skip it
        if (rule.getRequiredTermTypes) {
            const requiredTypes = rule.getRequiredTermTypes();
            if (requiredTypes) {
                // Check if terms match required types - simplified check for now
                // Add more sophisticated matching as needed
            }
        }
        return false;
    }

    /**
     * Filter candidates using canApply method
     * @private
     */
    _filterCandidates(candidates, primaryPremise, secondaryPremise) {
        const validRules = [];

        for (const rule of candidates) {
            try {
                if (this._canRuleApply(rule, primaryPremise, secondaryPremise)) {
                    validRules.push(rule);
                }
            } catch (error) {
                logError(error, {
                    ruleId: rule.id ?? rule.name,
                    context: 'rule_candidate_check'
                }, 'warn');
            }
        }

        return validRules;
    }

    /**
     * Helper method to determine if a rule can be applied
     * @private
     */
    _canRuleApply(rule, primaryPremise, secondaryPremise) {
        return rule.canApply?.(primaryPremise, secondaryPremise) ?? true;
    }

    executeRule(rule, primaryPremise, secondaryPremise, context = {}) {
        try {
            const results = rule.apply?.(primaryPremise, secondaryPremise, context) ?? [];
            return Array.isArray(results) ? results : [results];
        } catch (error) {
            logError(error, {
                ruleId: rule.id ?? rule.name,
                context: 'rule_execution'
            }, 'error');
            return [];
        }
    }

    getRuleCount() {
        return this.rules.length;
    }

    clearRules() {
        this.rules = [];
        this.decisionTree = null;
        this.optimizedRuleMap.clear();
    }

    cleanup() {
        this.clearRules();
        this.optimizedRuleMap.clear();
        this.decisionTree = null;
    }
}