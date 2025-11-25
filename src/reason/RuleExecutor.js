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
        // Optimization temporarily disabled - always scan all rules
        // This fixes the bug where valid rules were skipped due to key mismatch
        return this._filterCandidates(this.rules, primaryPremise, secondaryPremise);
    }

    /**
     * Filter candidates using canApply method
     * @private
     */
    _filterCandidates(candidates, primaryPremise, secondaryPremise) {
        return candidates.filter(rule => {
            try {
                return this._canRuleApply(rule, primaryPremise, secondaryPremise);
            } catch (error) {
                logError(error, {
                    ruleId: rule.id ?? rule.name,
                    context: 'rule_candidate_check'
                }, 'warn');
                return false;
            }
        });
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