/**
 * GoalDrivenStrategy.js
 * 
 * NAL-8 Goal-driven reasoning strategy.
 * Wraps PrologStrategy to provide backward chaining for goal achievement.
 * 
 * Goals are tasks with punctuation '!' and a desire value (truth value).
 * The strategy uses backward chaining to find plans that achieve goals.
 */

import { PrologStrategy } from './PrologStrategy.js';
import { Task } from '../../task/Task.js';
import { Truth } from '../../Truth.js';

export class GoalDrivenStrategy extends PrologStrategy {
    constructor(config = {}) {
        super({
            ...config,
            name: 'GoalDrivenStrategy',
            // Goals-specific configuration
            maxPlanDepth: config.maxPlanDepth || 10,
            maxPlanSteps: config.maxPlanSteps || 20,
        });

        this.planCache = new Map(); // Cache successful plans
    }

    /**
     * Override to handle goal-specific premise selection
     * For goals, we want to find rules and facts that can help achieve the goal
     */
    async selectSecondaryPremises(primaryPremise) {
        // If it's a goal, use backward chaining to find supporting premises
        if (primaryPremise.isGoal()) {
            return await this.findGoalSupportingPremises(primaryPremise);
        }

        // Otherwise, use standard Prolog resolution
        return super.selectSecondaryPremises(primaryPremise);
    }

    /**
     * Find premises that can help achieve a goal
     * Uses backward chaining from the goal to find applicable rules
     */
    async findGoalSupportingPremises(goalTask) {
        // Convert goal to a query (question) for resolution
        const queryTask = goalTask.clone({
            punctuation: '?',
            truth: null
        });

        // Use Prolog resolution to find solutions
        const solutions = await this._resolveGoal(queryTask);

        // Convert solutions to supporting premises
        return solutions.map(solution => solution.task);
    }

    /**
     * Synthesize a plan to achieve a goal
     * Returns a sequence of steps (tasks) that should achieve the goal
     * 
     * @param {Task} goal - The goal to achieve
     * @returns {Promise<Array<Task>>} - Array of steps in the plan
     */
    async synthesizePlan(goal) {
        if (!goal.isGoal()) {
            throw new Error('synthesizePlan requires a goal task');
        }

        // Check cache first
        const cacheKey = goal.term.toString();
        if (this.planCache.has(cacheKey)) {
            return this.planCache.get(cacheKey);
        }

        const plan = [];
        const visited = new Set(); // Prevent infinite loops

        await this._buildPlan(goal, plan, visited, 0);

        // Cache the plan
        if (plan.length > 0) {
            this.planCache.set(cacheKey, plan);
        }

        return plan;
    }

    /**
     * Recursively build a plan by backward chaining from the goal
     * @private
     */
    async _buildPlan(currentGoal, plan, visited, depth) {
        if (depth >= this.config.maxPlanDepth || plan.length >= this.config.maxPlanSteps) {
            return;
        }

        const goalKey = currentGoal.term.toString();
        if (visited.has(goalKey)) {
            return; // Already explored this goal
        }
        visited.add(goalKey);

        // Find rules that can achieve this goal
        const supportingPremises = await this.findGoalSupportingPremises(currentGoal);

        for (const premise of supportingPremises) {
            // If it's a fact (belief), add it to the plan
            if (premise.isBelief()) {
                plan.push(premise);
            }
            // If it's an implication rule, recursively plan for the conditions
            else if (premise.term.operator === '==>') {
                const condition = premise.term.components[0];
                const consequent = premise.term.components[1];

                // Verify the consequent matches our goal
                const matchResult = this.unifier.match(currentGoal.term, consequent);
                if (matchResult.success) {
                    // Plan for the condition as a subgoal
                    const subgoal = new Task({
                        term: this.unifier.applySubstitution(condition, matchResult.substitution),
                        punctuation: '!',
                        truth: currentGoal.truth, // Inherit desire value
                        budget: currentGoal.budget
                    });

                    await this._buildPlan(subgoal, plan, visited, depth + 1);

                    // Add the rule application
                    plan.push(premise);
                }
            }

            if (plan.length >= this.config.maxPlanSteps) {
                break;
            }
        }
    }

    /**
     * Execute a plan step by step
     * This is a simplified version - in a full implementation,
     * this would monitor execution and handle failures
     * 
     * @param {Array<Task>} plan - The plan to execute
     * @returns {Promise<Array<Task>>} - Results from executing the plan
     */
    async executePlan(plan) {
        const results = [];

        for (const step of plan) {
            // In a full implementation, this would:
            // 1. Execute the action
            // 2. Monitor for completion
            // 3. Handle failures and replan if needed
            // 4. Update the knowledge base with results

            // For now, just return the steps
            results.push(step);
        }

        return results;
    }

    /**
     * Clear the plan cache
     */
    clearPlanCache() {
        this.planCache.clear();
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            ...super.getStatus(),
            type: 'GoalDrivenStrategy',
            maxPlanDepth: this.config.maxPlanDepth,
            maxPlanSteps: this.config.maxPlanSteps,
            cachedPlans: this.planCache.size
        };
    }
}
