import {PatternNALRule} from './PatternNALRule.js';
import {Term} from '../../term/Term.js';
import {Truth} from '../../Truth.js';
import {RuleUtils} from './RuleUtils.js';

export class ConditionalRule extends PatternNALRule {
    constructor() {
        super('conditional', {
            name: 'Conditional Reasoning Rule',
            description: 'Handles various forms of conditional statements and their interactions',
            priority: 0.6,
            category: 'conditional'
        });
    }

    _matches(task, context) {
        return this._isConditionalTerm(task.term);
    }

    _isConditionalTerm(term) {
        return term?.isCompound && (term.operator === '==>' || term.operator === '<=>');
    }

    async _apply(task, context) {
        if (!this._isConditionalTerm(task.term)) return [];

        const allTasks = RuleUtils.collectTasks(context);
        const results = [];

        for (const compTask of allTasks) {
            if (compTask === task) continue;

            if (this._isConditionalTerm(compTask.term)) {
                results.push(...this._applyConditionalToConditional(task, compTask));
            } else {
                results.push(...this._applyConditionalToFact(task, compTask));
                results.push(...this._applyConditionalToFact(compTask, task));
            }
        }

        return results;
    }

    _applyConditionalToConditional(task1, task2) {
        const results = [];

        if (task1.term.operator === '==>' && task2.term.operator === '==>') {
            const transitivityResult = this._checkTransitivity(task1.term, task2.term, task1, task2);
            if (transitivityResult) results.push(transitivityResult);

            const contrapositiveResult = this._checkContrapositive(task1.term, task2.term, task1, task2);
            if (contrapositiveResult) results.push(contrapositiveResult);
        }

        if (task1.term.operator === '<=>' && task2.term.operator === '<=>') {
            const equivalenceResult = this._checkEquivalenceChain(task1.term, task2.term, task1, task2);
            if (equivalenceResult) results.push(equivalenceResult);
        }

        if ((task1.term.operator === '==>' && task2.term.operator === '<=>') ||
            (task1.term.operator === '<=>' && task2.term.operator === '==>')) {
            const mixedResult = this._checkMixedConditional(task1.term, task2.term, task1, task2);
            if (mixedResult) results.push(mixedResult);
        }

        return results;
    }

    _applyConditionalToFact(conditionalTask, factTask) {
        const results = [];

        if (conditionalTask.term.operator === '==>') {
            const ponensResult = this._applyModusPonens(conditionalTask.term, factTask.term, conditionalTask, factTask);
            if (ponensResult) results.push(ponensResult);

            const tollensResult = this._applyModusTollens(conditionalTask.term, factTask.term, conditionalTask, factTask);
            if (tollensResult) results.push(tollensResult);
        }

        if (conditionalTask.term.operator === '<=>') {
            const equivResult = this._applyToEquivalence(conditionalTask.term, factTask.term, conditionalTask, factTask);
            if (equivResult) results.push(equivResult);
        }

        return results;
    }

    _checkTransitivity(term1, term2, task1, task2) {
        if (term1.components?.length !== 2 || term2.components?.length !== 2) return null;

        const [ant1, cons1] = term1.components;
        const [ant2, cons2] = term2.components;

        if (this._unify(cons1, ant2)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(==>, ${ant1.name || ant1.toString()}, ${cons2.name || cons2.toString()})`, [ant1, cons2], '==>'),
                truth: this._calculateTransitiveTruth(task1.truth, task2.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        if (this._unify(cons2, ant1)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(==>, ${ant2.name || ant2.toString()}, ${cons1.name || cons1.toString()})`, [ant2, cons1], '==>'),
                truth: this._calculateTransitiveTruth(task2.truth, task1.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        return null;
    }

    _checkContrapositive(term1, term2, task1, task2) {
        // Placeholder - more complex logic would be needed for full contrapositive
        return null;
    }

    _checkEquivalenceChain(term1, term2, task1, task2) {
        if (term1.components?.length !== 2 || term2.components?.length !== 2) return null;

        const [left1, right1] = term1.components;
        const [left2, right2] = term2.components;

        if (this._unify(right1, left2)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(<=>, ${left1.name || left1.toString()}, ${right2.name || right2.toString()})`, [left1, right2], '<=>'),
                truth: this._calculateTransitiveTruth(task1.truth, task2.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        if (this._unify(right2, left1)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(<=>, ${left2.name || left2.toString()}, ${right1.name || right1.toString()})`, [left2, right1], '<=>'),
                truth: this._calculateTransitiveTruth(task2.truth, task1.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        return null;
    }

    _checkMixedConditional(term1, term2, task1, task2) {
        // Placeholder - more complex logic would be needed
        return null;
    }

    _applyModusPonens(conditionalTerm, factTerm, conditionalTask, factTask) {
        if (conditionalTerm.components?.length !== 2) return null;

        const [antecedent, consequent] = conditionalTerm.components;

        if (this._unify(antecedent, factTerm)) {
            return this._createDerivedTask(conditionalTask, {
                term: consequent,
                truth: this._calculateModusPonensTruth(conditionalTask.truth, factTask.truth),
                type: factTask.type,
                priority: conditionalTask.priority * factTask.priority * this.priority
            });
        }

        return null;
    }

    _applyModusTollens(conditionalTerm, negatedFactTerm, conditionalTask, factTask) {
        // More complex logic needed for negation handling
        return null;
    }

    _applyToEquivalence(equivTerm, factTerm, equivTask, factTask) {
        if (equivTerm.components?.length !== 2) return null;

        const [left, right] = equivTerm.components;

        if (this._unify(left, factTerm)) {
            return this._createDerivedTask(equivTask, {
                term: right,
                truth: this._calculateTruth(equivTask.truth, factTask.truth),
                type: factTask.type,
                priority: equivTask.priority * factTask.priority * this.priority
            });
        }

        if (this._unify(right, factTerm)) {
            return this._createDerivedTask(equivTask, {
                term: left,
                truth: this._calculateTruth(equivTask.truth, factTask.truth),
                type: factTask.type,
                priority: equivTask.priority * factTask.priority * this.priority
            });
        }

        return null;
    }

    _calculateTransitiveTruth(truth1, truth2) {
        if (!truth1 || !truth2) return new Truth(0.5, 0.5);
        return new Truth(Math.min(truth1.frequency, truth2.frequency), truth1.confidence * truth2.confidence);
    }

    _calculateModusPonensTruth(implicationTruth, factTruth) {
        if (!implicationTruth || !factTruth) return new Truth(0.5, 0.5);
        return new Truth(implicationTruth.frequency * factTruth.frequency, implicationTruth.confidence * factTruth.confidence);
    }

    _calculateTruth(truth1, truth2) {
        if (!truth1 || !truth2) return new Truth(0.5, 0.5);
        return new Truth((truth1.frequency + truth2.frequency) / 2, Math.min(truth1.confidence, truth2.confidence) * 0.9);
    }
}