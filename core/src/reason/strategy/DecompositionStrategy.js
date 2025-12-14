/**
 * @file DecompositionStrategy.js
 * @description Premise formation strategy that extracts subterms from compound statements.
 * 
 * This strategy implements the core insight from Java NARS DecomposeTerm:
 * Decomposition is for PREMISE FORMATION (pairing task with subterm),
 * NOT for standalone derivation of components.
 */

import { PremiseFormationStrategy } from './PremiseFormationStrategy.js';

/**
 * Operators that can be decomposed to extract subterms for premise pairing.
 */
const STATEMENT_OPERATORS = new Set(['-->', '<->', '==>', '<=>']);
const COMPOUND_OPERATORS = new Set(['&&', '*', '&', '|']);
const ALL_DECOMPOSABLE = new Set([...STATEMENT_OPERATORS, ...COMPOUND_OPERATORS]);

/**
 * Strategy that decomposes compound terms to extract subterms for premise pairing.
 * 
 * For statements (A --> B):
 *   - Yields subject A and predicate B as candidates
 *   - Enables rules that need (statement, subject) or (statement, predicate) pairs
 * 
 * For compounds (A && B):
 *   - Yields all components as candidates
 *   - Enables rules that operate on conjuncts
 */
export class DecompositionStrategy extends PremiseFormationStrategy {
    /**
     * @param {object} config - Configuration options
     * @param {Set<string>} config.operators - Operators to decompose (default: all)
     * @param {boolean} config.includeSubject - Include subject from statements
     * @param {boolean} config.includePredicate - Include predicate from statements
     * @param {number} config.subjectPriority - Priority for subject candidates
     * @param {number} config.predicatePriority - Priority for predicate candidates
     * @param {number} config.componentPriority - Priority for compound components
     */
    constructor(config = {}) {
        super(config);

        this.operators = config.operators ?? ALL_DECOMPOSABLE;
        this.includeSubject = config.includeSubject ?? true;
        this.includePredicate = config.includePredicate ?? true;
        this.subjectPriority = config.subjectPriority ?? 0.85;
        this.predicatePriority = config.predicatePriority ?? 0.85;
        this.componentPriority = config.componentPriority ?? 0.7;
    }

    /**
     * Generate candidates by decomposing the primary task's term.
     * @param {Task} primaryTask - The primary premise task
     * @param {object} context - Context (unused for decomposition)
     * @yields {{term: Term, type: string, priority: number, decompositionType: string}}
     */
    async* generateCandidates(primaryTask, context) {
        if (!this.enabled) return;

        const term = primaryTask?.term;
        if (!term || !term.isCompound) return;

        const operator = term.operator;
        if (!this.operators.has(operator)) return;

        // Handle statements: extract subject and predicate
        if (STATEMENT_OPERATORS.has(operator)) {
            yield* this._decomposeStatement(term);
        }
        // Handle compounds: extract all components
        else if (COMPOUND_OPERATORS.has(operator)) {
            yield* this._decomposeCompound(term);
        }
    }

    /**
     * Decompose a statement to yield subject and predicate.
     * @private
     */
    *_decomposeStatement(term) {
        const subject = term.subject;
        const predicate = term.predicate;

        if (this.includeSubject && subject) {
            this._recordCandidate();
            yield {
                term: subject,
                type: 'decomposed-subject',
                priority: this.subjectPriority * this.priority,
                decompositionType: 'subject',
                operator: term.operator
            };
        }

        if (this.includePredicate && predicate) {
            this._recordCandidate();
            yield {
                term: predicate,
                type: 'decomposed-predicate',
                priority: this.predicatePriority * this.priority,
                decompositionType: 'predicate',
                operator: term.operator
            };
        }
    }

    /**
     * Decompose a compound to yield all components.
     * @private
     */
    *_decomposeCompound(term) {
        const components = term.components;
        if (!components || components.length === 0) return;

        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            if (!comp) continue;

            this._recordCandidate();
            yield {
                term: comp,
                type: 'decomposed-component',
                priority: this.componentPriority * this.priority,
                decompositionType: 'component',
                componentIndex: i,
                operator: term.operator
            };
        }
    }

    toString() {
        return `DecompositionStrategy(priority=${this.priority}, operators=${[...this.operators].join(',')})`;
    }
}
