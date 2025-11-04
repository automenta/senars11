import {Rule} from '../Rule.js';
import {PatternMatcher} from './PatternMatcher.js';
import {TruthFunctions} from './TruthFunctions.js';

export class NALRule extends Rule {
    constructor(id, config = {}) {
        super(id, 'nal', config.priority || 1.0, config);
        this._patternMatcher = config.patternMatcher || new PatternMatcher();
        this._truthFunction = config.truthFunction || TruthFunctions.deduction;
        this._variableBindings = new Map();
        this.category = config.category || 'general';
    }

    canApply = (task, context = {}) => super.canApply(task) && this._matches(task, context)

    async apply(task, context = {}) {
        if (!this.canApply(task, context)) return {results: [], rule: this};

        const start = performance.now();
        try {
            const results = await this._apply(task, context);
            return {results, rule: this._updateMetrics(true, performance.now() - start)};
        } catch (error) {
            return {results: [], error, rule: this._updateMetrics(false, performance.now() - start)};
        }
    }

    _matches(task, context) {
        return true; // Override in subclasses
    }

    async _apply(task, context) {
        return []; // Override in subclasses
    }

    _unify = (pattern, term) => this._patternMatcher.unify(pattern, term)
    _unifyHigherOrder = (pattern, term) => this._patternMatcher.unifyHigherOrder(pattern, term)
    _substitute = (term, bindings) => this._patternMatcher.substitute(term, bindings)

    _calculateTruth(truth1, truth2) {
        return this._truthFunction ? this._truthFunction(truth1, truth2) : truth1;
    }

    _createDerivedTask = (originalTask, properties) => ({
        term: properties.term || originalTask.term,
        truth: properties.truth || originalTask.truth,
        type: properties.type || originalTask.type,
        stamp: properties.stamp || originalTask.stamp,
        priority: properties.priority || (originalTask.priority * this.priority)
    })
}