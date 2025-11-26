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
        this.prologParser = new PrologParser(config.termFactory || new TermFactory());
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
            return await this._resolveGoal(primaryPremise);
        } catch (error) {
            this.log.error('Error in PrologStrategy resolution:', error);
            return [];
        }
    }

    /**
     * Resolve a goal using Prolog-style backward chaining
     * @private
     */
    async _resolveGoal(goalTask, currentDepth = 0, substitution = {}) {
        if (currentDepth >= this.config.maxDepth) {
            return [];
        }

        const solutions = [];

        // Find applicable rules/facts in the knowledge base
        const applicableRules = this._findApplicableRules(goalTask);

        for (const rule of applicableRules) {
            // Attempt to unify the goal with the rule head
            const unificationResult = this._unify(goalTask.term, rule.head, substitution);

            if (unificationResult.success) {
                const newSubstitution = unificationResult.substitution;

                if (rule.isFact) {
                    // If it's a fact, we have a direct solution
                    const solvedTask = this._applySubstitution(goalTask, newSubstitution);
                    solutions.push(solvedTask);

                    if (solutions.length >= this.config.maxSolutions) break;
                } else if (rule.body?.length > 0) {
                    // If it's a rule with a body, we need to resolve each sub-goal
                    const success = await this._resolveRuleBody(rule.body, newSubstitution, currentDepth + 1);

                    if (success.length > 0) {
                        // Apply the final substitution to the original goal to get the answer
                        for (const finalSub of success) {
                            const solvedTask = this._applySubstitution(goalTask, finalSub);
                            solutions.push(solvedTask);

                            if (solutions.length >= this.config.maxSolutions) break;
                        }
                    }
                }

                if (solutions.length >= this.config.maxSolutions) break;
            }
        }

        return solutions.slice(0, this.config.maxSolutions);
    }

    /**
     * Resolve the body of a rule (a conjunction of goals)
     * @private
     */
    async _resolveRuleBody(goals, initialSubstitution, currentDepth) {
        if (goals.length === 0) return [initialSubstitution]; // Empty body is true

        const [firstGoal, ...remainingGoals] = goals;

        // Create a task for the first goal with the initial substitution applied
        const firstGoalTask = this._applySubstitutionToTask(
            this._createTaskFromTerm(firstGoal, '?'),
            initialSubstitution
        );

        // Resolve the first goal
        const firstSolutions = await this._resolveGoal(firstGoalTask, currentDepth, initialSubstitution);

        const allSolutions = [];

        for (const solution of firstSolutions) {
            if (remainingGoals.length === 0) {
                allSolutions.push(solution);
            } else {
                // For each solution of the first goal, continue with the remaining goals
                const nextSubstitution = this._composeSubstitutions(initialSubstitution, this._extractSubstitution(solution, firstGoalTask));
                const remainingSolutions = await this._resolveRuleBody(remainingGoals, nextSubstitution, currentDepth);
                allSolutions.push(...remainingSolutions);
            }

            if (allSolutions.length >= this.config.maxSolutions) break;
        }

        return allSolutions.slice(0, this.config.maxSolutions);
    }

    /**
     * Find applicable rules/facts that could match the goal
     * @private
     */
    _findApplicableRules(goal) {
        const applicable = [];
        const goalPredicate = this._getPredicateName(goal);

        // Look for rules and facts in the knowledge base with matching predicate
        for (const [key, items] of this.knowledgeBase.entries()) {
            if (key === goalPredicate) {
                applicable.push(...items);
            }
        }

        // If no specific predicate match, look for more general matches
        if (applicable.length === 0) {
            // Find rules that could potentially unify with the goal
            for (const [, items] of this.knowledgeBase.entries()) {
                for (const item of items) {
                    if (this._couldUnify(goal, item.head)) {
                        applicable.push(item);
                    }
                }
            }
        }

        return applicable;
    }

    /**
     * Get the predicate name from a term
     * @private
     */
    _getPredicateName(term) {
        if (term && typeof term === 'object') {
            // For compound terms like ^[pred, args], the first component is the predicate
            if (term.operator === '^' && term.components && term.components[0]) {
                return term.components[0]._name || term.components[0].name || 'unknown';
            }
            // Handle atomic terms or other term representations
            else if (term._name) {
                return term._name;
            } else if (term.name) {
                return term.name;
            } else if (term.components && term.components[0]) {
                // For other compound terms, return the first component's name
                return term.components[0]._name || term.components[0].name || 'unknown';
            }
        }
        return 'unknown';
    }

    /**
     * Check if two terms could potentially unify (for optimization)
     * @private
     */
    _couldUnify(term1, term2) {
        // Basic check: if both terms have same predicate name and similar structure
        return this._getPredicateName(term1) === this._getPredicateName(term2);
    }

    /**
     * Unify two terms and return the substitution
     * @private
     */
    _unify(term1, term2, initialSubstitution = {}) {
        const substitution = {...initialSubstitution};

        // Apply existing substitutions first
        const substTerm1 = this._applySubstitutionToTerm(term1, substitution);
        const substTerm2 = this._applySubstitutionToTerm(term2, substitution);

        // If terms are identical, return current substitution
        if (this._termsEqual(substTerm1, substTerm2)) {
            return {success: true, substitution};
        }

        // If term1 is a variable, bind it to term2
        if (this._isVariable(substTerm1)) {
            return this._bindVariable(this._getVariableName(substTerm1), substTerm2, substitution);
        }

        // If term2 is a variable, bind it to term1
        if (this._isVariable(substTerm2)) {
            return this._bindVariable(this._getVariableName(substTerm2), substTerm1, substitution);
        }

        // For compound terms, attempt to unify components
        if (this._isCompound(substTerm1) && this._isCompound(substTerm2) &&
            this._getTermArity(substTerm1) === this._getTermArity(substTerm2)) {

            let currentSubstitution = {...substitution};

            // Get components of both terms
            const comp1 = this._getTermComponents(substTerm1);
            const comp2 = this._getTermComponents(substTerm2);

            for (let i = 0; i < comp1.length; i++) {
                const result = this._unify(
                    this._applySubstitutionToTerm(comp1[i], currentSubstitution),
                    this._applySubstitutionToTerm(comp2[i], currentSubstitution),
                    currentSubstitution
                );

                if (!result.success) {
                    return {success: false, substitution: {}};
                }

                currentSubstitution = result.substitution;
            }

            return {success: true, substitution: currentSubstitution};
        }

        // If no unification is possible
        return {success: false, substitution: {}};
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
        if (term.components && Array.isArray(term.components)) {
            return term.components.length;
        }
        if (term.args && Array.isArray(term.args)) {
            return term.args.length;
        }
        return 0;
    }

    /**
     * Get the components of a term
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

    /**
     * Check if two terms are equal under a substitution
     * @private
     */
    _termsEqual(term1, term2) {
        // For now, do a simple comparison
        if (term1 === term2) return true;

        if (term1 && term2 && typeof term1 === 'object' && typeof term2 === 'object') {
            // Compare names if they exist
            if (term1.name !== term2.name) return false;
            if (term1._name !== term2._name) return false;

            // Compare components if they exist
            const comp1 = this._getTermComponents(term1);
            const comp2 = this._getTermComponents(term2);

            if (comp1.length !== comp2.length) return false;

            return comp1.every((comp, i) => this._termsEqual(comp, comp2[i]));
        }

        return false;
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
     * Bind a variable to a value in the substitution
     * @private
     */
    _bindVariable(varName, value, substitution) {
        const newSubstitution = {...substitution};

        // Check for circular bindings
        if (this._occursCheck(varName, value, newSubstitution)) {
            return {success: false, substitution: {}};
        }

        newSubstitution[varName] = value;
        return {success: true, substitution: newSubstitution};
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
            return {...term}; // Return a copy
        }

        // If it's a compound term, apply substitution to components
        if (this._isCompound(term)) {
            const components = this._getTermComponents(term);
            const newComponents = components.map(comp =>
                this._applySubstitutionToTerm(comp, substitution)
            );

            // Create a new term with substituted components
            const newTerm = {...term};
            if (term.components) {
                newTerm.components = newComponents;
            } else if (term.args) {
                newTerm.args = newComponents;
            }
            return newTerm;
        }

        return {...term}; // Return a copy of the original term
    }

    /**
     * Apply substitution to a task
     * @private
     */
    _applySubstitutionToTask(task, substitution) {
        if (!task || !substitution) return task;

        const newTask = {...task};
        newTask.term = this._applySubstitutionToTerm(task.term, substitution);

        if (task.truth) {
            newTask.truth = {...task.truth}; // Copy truth value
        }

        return newTask;
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
     * Extract substitution that was applied to solve a goal
     * @private
     */
    _extractSubstitution(solvedTask, originalTask) {
        // For now, return the original substitution
        // In a full implementation, this would extract the specific bindings
        return {};
    }

    /**
     * Compose two substitutions
     * @private
     */
    _composeSubstitutions(sub1, sub2) {
        const result = {...sub1};

        for (const [varName, value] of Object.entries(sub2)) {
            result[varName] = this._applySubstitutionToTerm(value, sub1);
        }

        return result;
    }

    /**
     * Update the knowledge base with new facts/rules from memory
     * @public
     */
    updateKnowledgeBase(tasks) {
        for (const task of tasks) {
            if (task.punctuation === '.') { // Beliefs
                const predicateName = this._getPredicateName(task.term);
                if (!this.knowledgeBase.has(predicateName)) {
                    this.knowledgeBase.set(predicateName, []);
                }

                // Store as a fact (simple predicate term)
                this.knowledgeBase.get(predicateName).push({
                    head: task.term,
                    body: null, // For facts, there's no body
                    isFact: true,
                    sourceTask: task
                });
            }
        }
    }

    /**
     * Add a Prolog rule to the knowledge base
     * @public
     */
    addPrologRule(prologRuleString) {
        try {
            // Parse the Prolog rule using the existing parser
            const parsedTasks = this.prologParser.parseProlog(prologRuleString);

            for (const task of parsedTasks) {
                if (task.punctuation === '.') { // Beliefs (facts and rules become beliefs)
                    const predicateName = this._getPredicateName(task.term);
                    if (!this.knowledgeBase.has(predicateName)) {
                        this.knowledgeBase.set(predicateName, []);
                    }

                    // For now, treat everything as a fact (in a full implementation, we'd distinguish rules from facts)
                    // The Prolog parser doesn't directly return rule structure, so we create simple facts for now
                    this.knowledgeBase.get(predicateName).push({
                        head: task.term,
                        body: null, // Simplified - would need proper rule parsing for body
                        isFact: true, // All parsed items treated as facts in this simple version
                        sourceTask: task
                    });
                }
            }
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
}