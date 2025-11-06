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
        this.decisionTree = this._createDecisionTree();
    }

    _createDecisionTree() {
        const tree = new Map();

        for (const rule of this.rules) {
            const key = this._getRuleKey(rule);
            if (!tree.has(key)) {
                tree.set(key, []);
            }
            tree.get(key).push(rule);
        }

        return tree;
    }

    _getRuleKey(rule) {
        return rule.type ?? 'default';
    }

    getCandidateRules(primaryPremise, secondaryPremise) {
        // Build decision tree if not already built
        if (!this.decisionTree) {
            this.buildOptimizationStructure();
        }

        // Use decision tree for optimized selection
        const heuristicKey = this._getHeuristicKey(primaryPremise, secondaryPremise);
        const treeCandidates = this.decisionTree.get(heuristicKey) ?? this.rules;
        return this._filterCandidates(treeCandidates, primaryPremise, secondaryPremise);
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

    _getHeuristicKey(primaryPremise, secondaryPremise) {
        const primaryType = primaryPremise.type ?? 'unknown';
        const secondaryType = secondaryPremise.type ?? 'unknown';
        const primaryTerm = primaryPremise.term?.name?.substring(0, 10) ?? 'unknown';
        const secondaryTerm = secondaryPremise.term?.name?.substring(0, 10) ?? 'unknown';

        return `${primaryType}_${secondaryType}_${primaryTerm}_${secondaryTerm}`;
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