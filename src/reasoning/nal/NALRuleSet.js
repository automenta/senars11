import {TemporalRules} from './TemporalRules.js';
import {ConditionalRules} from './ConditionalRules.js';
import {HigherOrderRule} from './HigherOrderRule.js';
import {SyllogisticRules} from './SyllogisticRules.js';
import {ConjunctionRule, ConversionRule, DisjunctionRule, EquivalenceRule, NegationRule} from './ExtendedNALRules.js';

export class NALRuleSet {
    static _ruleRegistry = new Map();

    static _defaultRules = [
        ...SyllogisticRules.getRules(),
        ...ConditionalRules.getRules(),
        ...TemporalRules.getRules(),
        new HigherOrderRule(),
        new ConversionRule(),
        new EquivalenceRule(),
        new NegationRule(),
        new ConjunctionRule(),
        new DisjunctionRule()
    ];

    static getAllRules() {
        return [...this._defaultRules, ...this._ruleRegistry.values()];
    }

    static getSyllogisticRules() {
        return SyllogisticRules.getRules();
    }

    static getConditionalRules() {
        return ConditionalRules.getRules();
    }

    static getTemporalRules() {
        return TemporalRules.getRules();
    }

    static getHigherOrderRules() {
        return [new HigherOrderRule()];
    }

    static getExtendedRules() {
        return [
            new ConversionRule(),
            new EquivalenceRule(),
            new NegationRule(),
            new ConjunctionRule(),
            new DisjunctionRule()
        ];
    }

    static registerRule(name, ruleInstance) {
        this._ruleRegistry.set(name, ruleInstance);
    }

    static unregisterRule(name) {
        return this._ruleRegistry.delete(name);
    }

    static getRuleByName(name) {
        return this._ruleRegistry.get(name);
    }

    static getRulesByCategory(category) {
        return this.getAllRules().filter(rule => rule.category === category);
    }
}