/**
 * RuleExecutor.js
 * 
 * Executes the compiled rule tree against incoming tasks.
 */

import { getOperator, getComponents } from '../../../term/TermUtils.js';

export class RuleExecutor {
    constructor(compiledTree, unifier) {
        this.tree = compiledTree;
        this.unifier = unifier;
    }

    /**
     * Execute rules against a primary task and context.
     * @param {Task} p - Primary task (premise 1)
     * @param {Task} s - Secondary task (premise 2)
     * @param {Context} context - Execution context
     * @returns {Array<Task>} Derived tasks
     */
    execute(p, s, context) {
        if (!this.tree) return [];

        // 1. Fast Traversal (Guards)
        const candidates = this.query(p.term, s.term);

        // 2. Full Unification (Only on survivors)
        const results = [];
        for (const rule of candidates) {
            // Match pattern against concrete terms
            // Pattern has variables ($S, $P), terms have constants (or variables treated as constants)
            const matchP = this.unifier.match(rule.pattern.p, p.term);
            if (!matchP.success) continue;

            const matchS = this.unifier.match(rule.pattern.s, s.term, matchP.substitution);
            if (!matchS.success) continue;

            // 3. Execute Conclusion
            try {
                const derived = rule.conclusion(matchS.substitution, p, s, context);
                if (derived) {
                    results.push(derived);
                }
            } catch (e) {
                console.error(`Error executing rule ${rule.id}:`, e);
            }
        }
        return results;
    }

    query(pTerm, sTerm) {
        // Traverse the tree based on the standardized levels
        // Level 1: Op(p)
        // Level 2: Op(s)
        // Level 3: Arity(p)
        // Level 4: Arity(s)

        const values = [
            getOperator(pTerm) || null,
            getOperator(sTerm) || null,
            getComponents(pTerm).length,
            getComponents(sTerm).length
        ];

        return this._collectRules(this.tree, values, 0);
    }

    _collectRules(node, values, depth) {
        let rules = [...node.rules];

        if (depth >= values.length) {
            return rules;
        }

        const val = values[depth];

        // Check specific branch
        const child = node.children.get(val);
        if (child) {
            rules = rules.concat(this._collectRules(child, values, depth + 1));
        }

        // Check wildcard branch ('*')
        const wildcard = node.children.get('*');
        if (wildcard) {
            rules = rules.concat(this._collectRules(wildcard, values, depth + 1));
        }

        return rules;
    }
}
