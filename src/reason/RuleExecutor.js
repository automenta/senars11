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
        const validRules = [];
        //console.debug(`DEBUG: Checking ${candidates.length} candidates for premise: ${primaryPremise?.term}, secondary: ${secondaryPremise?.term}`);

        for (const rule of candidates) {
            try {
                //console.debug(`DEBUG: Evaluating rule ${rule.id || rule.name} canApply: ${this._canRuleApply(rule, primaryPremise, secondaryPremise)}`);
                if (this._canRuleApply(rule, primaryPremise, secondaryPremise)) {
                    validRules.push(rule);
                    //console.debug(`DEBUG: Rule ${rule.id || rule.name} matched and added to candidates`);
                }
            } catch (error) {
                logError(error, {
                    ruleId: rule.id ?? rule.name,
                    context: 'rule_candidate_check'
                }, 'warn');
            }
        }

        //console.debug(`DEBUG: Returning ${validRules.length} valid rules from ${candidates.length} candidates`);
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
