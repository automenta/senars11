/**
 * Prolog Strategy for the SeNARS Stream Reasoner
 * Implements Prolog-style backward chaining resolution with unification and backtracking
 * using the PrologParser to convert between Prolog and SeNARS representations.
 */

import {Strategy} from '../Strategy.js';
import {PrologParser} from '../../parser/PrologParser.js';
import {Task} from '../../task/Task.js';
import {Truth} from '../../Truth.js';
import {TermFactory} from '../../term/TermFactory.js';
import {isQuestion} from '../RuleHelpers.js';

export class PrologStrategy extends Strategy {
    constructor(config = {}) {
        super(config);
        this.name = 'PrologStrategy';
        this.prologParser = new PrologParser(config.termFactory || new TermFactory());
        this.termFactory = this.prologParser.termFactory;
        this.goalStack = []; // For backtracking
        this.knowledgeBase = new Map(); // Store facts and rules for resolution
        this.substitutionStack = []; // Track variable bindings during resolution
        this.variableCounter = 0; // For generating unique variable names

        // Configuration for Prolog-style reasoning
        this.config = {
            maxDepth: config.maxDepth || 10, // Maximum depth to prevent infinite loops
            maxSolutions: config.maxSolutions || 5, // Maximum number of solutions to find
            backtrackingEnabled: config.backtrackingEnabled !== false, // Whether backtracking is enabled
            ...config
        };
    }

    /**
     * Override the parent method to implement Prolog-style goal-driven reasoning
     */
    async selectSecondaryPremises(primaryPremise) {
        if (!isQuestion(primaryPremise)) {
            return super.selectSecondaryPremises(primaryPremise);
        }

        try {
            this.memory && this.updateKnowledgeBase(this._getAvailableTasks());
            const results = await this._resolveGoal(primaryPremise);
            return results.map(r => r.task);
        } catch (error) {
            this.log.error('Error in PrologStrategy resolution:', error);
            return [];
        }
    }

    /**
     * Resolve a goal using Prolog-style backward chaining
     * Returns array of {substitution, task}
     * @private
     */
    async _resolveGoal(goalTask, currentDepth = 0, substitution = {}) {
        if (currentDepth >= this.config.maxDepth) {
            return [];
        }

        const solutions = [];
        const applicableRules = this._findApplicableRules(goalTask);

        for (const rule of applicableRules) {
            const unificationResult = this._unify(goalTask.term, rule.head, substitution);

            if (unificationResult.success) {
                const newSubstitution = unificationResult.substitution;

                if (rule.isFact) {
                    const resolvedTask = this._applySubstitutionToTask(goalTask, newSubstitution);
                    solutions.push({ substitution: newSubstitution, task: resolvedTask });
                } else if (rule.body?.length > 0) {
                    const bodySolutions = await this._resolveRuleBody(rule.body, newSubstitution, currentDepth + 1);
                    for (const bodySub of bodySolutions) {
                        const resolvedTask = this._applySubstitutionToTask(goalTask, bodySub);
                        solutions.push({ substitution: bodySub, task: resolvedTask });
                    }
                }
            }
            if (solutions.length >= this.config.maxSolutions) break;
        }

        return solutions;
    }

    /**
     * Resolve the body of a rule (a conjunction of goals)
     * Returns array of substitutions
     * @private
     */
    async _resolveRuleBody(goals, initialSubstitution, currentDepth) {
        if (goals.length === 0) return [initialSubstitution];

        const [firstGoal, ...remainingGoals] = goals;
        // Apply current substitution to the first goal term
        const firstGoalTerm = this._applySubstitutionToTerm(firstGoal, initialSubstitution);
        // Create a task for recursive resolution
        const firstGoalTask = this._createTaskFromTerm(firstGoalTerm, '?');

        const firstSolutions = await this._resolveGoal(firstGoalTask, currentDepth, initialSubstitution);
        const allSolutions = [];

        for (const solution of firstSolutions) {
            // solution.substitution contains the accumulated substitution from solving firstGoal
            const nextSubstitution = solution.substitution;

            if (remainingGoals.length === 0) {
                allSolutions.push(nextSubstitution);
            } else {
                const remainingSolutions = await this._resolveRuleBody(remainingGoals, nextSubstitution, currentDepth);
                allSolutions.push(...remainingSolutions);
            }
            if (allSolutions.length >= this.config.maxSolutions) break;
        }

        return allSolutions;
    }

    /**
     * Find applicable rules/facts that could match the goal
     * @private
     */
    _findApplicableRules(goal) {
        const applicable = [];
        const goalPredicate = this._getPredicateName(goal.term);

        // Look for rules and facts in the knowledge base with matching predicate
        for (const [key, items] of this.knowledgeBase.entries()) {
            if (key === goalPredicate) {
                applicable.push(...items);
            }
        }

        // If no specific predicate match, look for more general matches (optional optimization)
        // Note: For now we strictly match predicate name to avoid costly scans

        return applicable;
    }

    /**
     * Get the predicate name from a term
     * @private
     */
    _getPredicateName(term) {
        if (!term) return 'unknown';
        if (typeof term.getPredicate === 'function') {
            const predicate = term.getPredicate();
            if (predicate) return predicate.toString();
        }
        if (term.term && typeof term.term.getPredicate === 'function') {
            const predicate = term.term.getPredicate();
            if (predicate) return predicate.toString();
        }

        // Handle compound terms (including plain objects)
        if (term.components && Array.isArray(term.components) && term.components.length > 0) {
            return this._getPredicateName(term.components[0]);
        }

        // Handle atomic terms (including plain objects)
        if (term.name) return term.name;

        return term.toString();
    }

    /**
     * Check if two terms could potentially unify (for optimization)
     * @private
     */
    _couldUnify(term1, term2) {
        // Basic check: if both terms have same predicate name
        return this._getPredicateName(term1) === this._getPredicateName(term2);
    }

    /**
     * Unify two terms and return the substitution
     * @private
     */
    _unify(term1, term2, substitution = {}) {
        const t1 = this._applySubstitutionToTerm(term1, substitution);
        const t2 = this._applySubstitutionToTerm(term2, substitution);

        if (this._isVariable(t1)) {
            return this._unifyVariable(t1, t2, substitution);
        }
        if (this._isVariable(t2)) {
            return this._unifyVariable(t2, t1, substitution);
        }
        if (this._termsEqual(t1, t2)) {
            return { success: true, substitution };
        }
        if (this._isCompound(t1) && this._isCompound(t2)) {
            const arity1 = this._getTermArity(t1);
            const arity2 = this._getTermArity(t2);
            if (arity1 !== arity2) {
                return { success: false, substitution: {} };
            }

            let currentSubstitution = substitution;

            // Get components for unification
            const components1 = this._getTermComponents(t1);
            const components2 = this._getTermComponents(t2);

            // If it's a predicate term like (^, predicate, args), we should unify components.
            // Note: _getTermComponents normalizes this.

            // Also need to check if operators match?
            // Usually yes, but strict Prolog unification might just care about structure.
            // In Narsese, (^, A, B) != (*, A, B).
            if (t1.operator !== t2.operator) {
                 // Exception: one might be plain object without operator but same structure?
                 // But we should enforce operator match for correctness.
                 if ((t1.operator || '') !== (t2.operator || '')) {
                     return { success: false, substitution: {} };
                 }
            }

            for (let i = 0; i < components1.length; i++) {
                const result = this._unify(
                    components1[i],
                    components2[i],
                    currentSubstitution
                );
                if (!result.success) {
                    return { success: false, substitution: {} };
                }
                currentSubstitution = result.substitution;
            }
            return { success: true, substitution: currentSubstitution };
        }
        return { success: false, substitution: {} };
    }

    _unifyVariable(variable, term, substitution) {
        const varName = this._getVariableName(variable);
        if (substitution[varName]) {
            return this._unify(substitution[varName], term, substitution);
        }
        if (this._isVariable(term) && substitution[this._getVariableName(term)]) {
            return this._unify(variable, substitution[this._getVariableName(term)], substitution);
        }
        if (this._occursCheck(varName, term, substitution)) {
            return { success: false, substitution: {} };
        }
        const newSubstitution = { ...substitution, [varName]: term };
        return { success: true, substitution: newSubstitution };
    }

    /**
     * Check if a term is compound (has components)
     * @private
     */
    _isCompound(term) {
        return term && (Array.isArray(term.components) || (term.args && Array.isArray(term.args)));
    }

    /**
     * Get the arity (number of arguments) of a term
     * @private
     */
    _getTermArity(term) {
        const components = this._getTermComponents(term);
        return components.length;
    }

    /**
     * Get the components of a term.
     * Normalized to include all structural components.
     * @private
     */
    _getTermComponents(term) {
        if (term.components && Array.isArray(term.components)) {
            return term.components;
        }
        if (term.args && Array.isArray(term.args)) {
            return term.args;
        }
        return [];
    }

    _getPredicate(term) {
        if (term.components && Array.isArray(term.components) && term.components.length > 0) {
            return term.components[0];
        }
        return term;
    }

    /**
     * Check if two terms are equal under a substitution
     * @private
     */
    _termsEqual(term1, term2) {
        if (!term1 || !term2) return false;
        if (typeof term1.equals === 'function') {
            return term1.equals(term2);
        }
        // Fallback for plain objects
        if (term1.name && term2.name) return term1.name === term2.name;

        return term1.toString() === term2.toString();
    }

    /**
     * Check if a term represents a variable
     * @private
     */
    _isVariable(term) {
        if (!term) return false;
        // Variables typically start with ? or uppercase or underscore
        const name = term.name || term._name || '';
        return name.startsWith('?') || name.startsWith('_') || /^[A-Z]/.test(name);
    }

    /**
     * Get variable name
     * @private
     */
    _getVariableName(term) {
        return term.name || term._name || 'unknown';
    }

    /**
     * Perform occurs check to prevent circular substitutions
     * @private
     */
    _occursCheck(varName, term, substitution) {
        if (this._isVariable(term) && this._getVariableName(term) === varName) {
            return true;
        }

        if (this._isCompound(term)) {
            const components = this._getTermComponents(term);
            return components.some(comp => this._occursCheck(varName, comp, substitution));
        }

        return false;
    }

    /**
     * Apply substitution to a single term
     * @private
     */
    _applySubstitutionToTerm(term, substitution) {
        if (!term) return term;

        // If it's a variable with a binding, return the binding
        if (this._isVariable(term)) {
            const varName = this._getVariableName(term);
            if (substitution[varName]) {
                return this._applySubstitutionToTerm(substitution[varName], substitution);
            }
            return term; // Return original term (assuming immutable or we don't need copy if no change)
        }

        // If it's a compound term, apply substitution to components
        if (this._isCompound(term)) {
            const components = this._getTermComponents(term);
            const newComponents = components.map(comp =>
                this._applySubstitutionToTerm(comp, substitution)
            );

            // Use TermFactory to create a valid Term object
            if (this.termFactory) {
                return this.termFactory.create({
                    operator: term.operator,
                    components: newComponents,
                    type: term.type
                });
            } else {
                // Fallback if no factory (shouldn't happen with constructor fix)
                const newTerm = {...term};
                if (term.components) {
                    newTerm.components = newComponents;
                } else if (term.args) {
                    newTerm.args = newComponents;
                }
                return newTerm;
            }
        }

        return term;
    }

    /**
     * Apply substitution to a task
     * @private
     */
    _applySubstitutionToTask(task, substitution) {
        if (!task || !substitution) return task;

        const newTerm = this._applySubstitutionToTerm(task.term, substitution);

        // Return a new Task with the substituted term
        return new Task({
            term: newTerm,
            punctuation: task.punctuation,
            truth: task.truth ? new Truth(task.truth.frequency, task.truth.confidence) : undefined,
            budget: task.budget ? {...task.budget} : undefined
        });
    }

    /**
     * Create a task from a term
     * @private
     */
    _createTaskFromTerm(term, punctuation = '?', truth = null) {
        return new Task({
            term: term,
            punctuation: punctuation,
            truth: punctuation === '?' ? null : truth || new Truth(1.0, 0.9),
            budget: {priority: 0.8, durability: 0.7, quality: 0.8}
        });
    }

    /**
     * Update the knowledge base with new facts/rules from memory
     * @public
     */
    updateKnowledgeBase(tasks) {
        for (const task of tasks) {
            if (task.punctuation !== '.') continue;

            const term = task.term;
            let head, body, isFact;

            if (term.operator === '==>') { // It's a rule
                isFact = false;
                head = term.components[1];
                const bodyTerm = term.components[0];

                // Handle conjunctions (&& or &/)
                if (bodyTerm.operator === '&&' || bodyTerm.operator === '&/') {
                    body = bodyTerm.components;
                } else { // Single goal
                    body = [bodyTerm];
                }
            } else { // It's a fact
                isFact = true;
                head = term;
                body = null;
            }

            const predicateName = this._getPredicateName(head);
            if (!this.knowledgeBase.has(predicateName)) {
                this.knowledgeBase.set(predicateName, []);
            }

            this.knowledgeBase.get(predicateName).push({
                head,
                body,
                isFact,
                sourceTask: task
            });
        }
    }

    /**
     * Add a Prolog rule to the knowledge base
     * @public
     */
    addPrologRule(prologRuleString) {
        try {
            const parsedTasks = this.prologParser.parseProlog(prologRuleString);
            this.updateKnowledgeBase(parsedTasks);
        } catch (error) {
            console.error('Error adding Prolog rule:', error);
        }
    }

    /**
     * Parse and add Prolog facts to the knowledge base
     * @public
     */
    addPrologFacts(prologFactsString) {
        this.addPrologRule(prologFactsString);
    }

    /**
     * Get strategy status information
     * @public
     */
    getStatus() {
        return {
            ...super.getStatus(),
            type: 'PrologStrategy',
            knowledgeBaseSize: this.knowledgeBase.size,
            registeredPredicates: Array.from(this.knowledgeBase.keys()),
            config: this.config,
            variableCounter: this.variableCounter
        };
    }

    async ask(task) {
        const results = await this._resolveGoal(task);
        return results.map(r => r.task);
    }
}
