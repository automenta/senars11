import {PatternNALRule} from './PatternNALRule.js';
import {Term} from '../../term/Term.js';
import {Truth} from '../../Truth.js';

/**
 * HigherOrderRule: Handles reasoning about higher-order statements and patterns
 * Implements patterns like (A ==> B) ==> C where the implication itself is the subject
 */
export class HigherOrderRule extends PatternNALRule {
    constructor() {
        super('higher-order', {
            name: 'Higher-Order Reasoning Rule',
            description: 'Handles reasoning about higher-order statements and patterns',
            priority: 0.4,
            category: 'higher-order'
        });
    }

    _matches(task, context) {
        // Check if the term is a compound with nested structures that can be treated as terms themselves
        return this._isHigherOrderTerm(task.term);
    }

    _isHigherOrderTerm(term) {
        if (!term?.isCompound) return false;

        // Check if any component is itself a compound that could represent a statement
        for (const component of term.components || []) {
            if (this._representsStatement(component)) {
                return true;
            }
        }

        return false;
    }

    _representsStatement(term) {
        if (!term?.isCompound) return false;

        // Check for NAL statement operators: --> (inheritance), ==> (implication), <=> (equivalence)
        return ['-->', '==>', '<=>'].includes(term.operator);
    }

    async _apply(task, context) {
        if (!this._isHigherOrderTerm(task.term)) return [];

        // Look for complementary terms that might match within the higher-order structure
        return this._collectTasks(context)
            .filter(compTask => compTask !== task) // Don't match with itself
            .map(compTask => {
                const bindings = this._unify(task.term, compTask.term);
                if (!bindings) return null;

                // Create a derived term by substituting bindings
                const derivedTerm = this._substituteVariables(task.term, bindings);
                // Calculate truth value for the derived statement
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                return this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: 'belief', // Default to belief type
                    priority: Math.max(task.priority, compTask.priority) * this.priority
                });
            })
            .filter(Boolean);
    }

    _collectTasks(context) {
        return context?.memory?.concepts ? 
            Array.from(context.memory.concepts.values()).flatMap(concept => 
                [...(concept.beliefs || []), ...(concept.goals || [])]
            ) : [];
    }

    _calculateTruth(truth1, truth2) {
        if (!truth1 || !truth2) return new Truth(0.5, 0.5); // Default truth if not provided

        // Combine truth values using NAL truth-value functions
        // For simplicity here, we'll return a combination of the two
        const frequency = (truth1.frequency + truth2.frequency) / 2;
        const confidence = Math.min(truth1.confidence, truth2.confidence) * 0.9; // Reduce confidence due to combination
        return new Truth(frequency, confidence);
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name?.startsWith('?') && bindings.has(term.name)) {
            return bindings.get(term.name);
        }

        if (term.isCompound && term.components) {
            const newComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            // Check if any component changed
            const hasChanges = newComponents.some((comp, idx) => comp !== term.components[idx]);
            if (hasChanges) {
                return new Term(term.type, term.name, newComponents, term.operator);
            }
        }

        return term;
    }
}