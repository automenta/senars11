/**
 * RuleExecutor.js
 * 
 * Executes the compiled rule tree against incoming tasks.
 */

export class RuleExecutor {
    constructor(compiledTree, unifier) {
        this.tree = compiledTree;
        this.unifier = unifier;
    }

    /**
     * Execute rules against a primary task and context.
     * @param {Task} primaryTask 
     * @param {Context} context 
     * @returns {Array<Task>} Derived tasks
     */
    execute(primaryTask, context) {
        throw new Error('Not implemented');
    }
}
