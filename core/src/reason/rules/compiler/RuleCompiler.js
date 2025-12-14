/**
 * RuleCompiler.js
 * 
 * Compiles declarative rule patterns into an optimized decision tree (Rete-like)
 * for efficient matching against the stream.
 */

import { getOperator, getComponents, isVariable, getVariableName } from '../../../term/TermUtils.js';

class DecisionNode {
    constructor(check = null) {
        this.check = check; // { type: 'op'|'arity'|'eq', target: 'p'|'s', val: ... }
        this.children = new Map(); // val -> DecisionNode
        this.rules = []; // Rules that match at this node
        this.fallback = null; // Node to check if specific value doesn't match (for variables)
    }

    addChild(value, node) {
        this.children.set(value, node);
    }
}

export class RuleCompiler {
    constructor(termFactory) {
        this.root = new DecisionNode();
        this.termFactory = termFactory;
    }

    /**
     * Compile a list of pattern rules into a decision tree.
     * @param {Array<PatternRule>} rules 
     * @returns {DecisionNode} Root of the execution tree
     */
    compile(rules) {
        this.root = new DecisionNode();

        for (const rule of rules) {
            // Hydrate pattern objects into Terms if needed
            if (!rule.pattern.p.isTerm && this.termFactory) {
                rule.pattern.p = this.hydratePattern(rule.pattern.p);
            }
            if (!rule.pattern.s.isTerm && this.termFactory) {
                rule.pattern.s = this.hydratePattern(rule.pattern.s);
            }

            const guards = this.extractGuards(rule.pattern);
            this.insertIntoTree(this.root, guards, rule);
        }

        return this.root;
    }

    hydratePattern(patternObj) {
        if (typeof patternObj === 'string') {
            if (patternObj.startsWith('$')) return this.termFactory.variable(patternObj);
            return this.termFactory.atomic(patternObj);
        }

        if (patternObj.operator) {
            // Assuming binary operators for now if subject/predicate are present
            if (patternObj.subject && patternObj.predicate) {
                const subject = this.hydratePattern(patternObj.subject);
                const predicate = this.hydratePattern(patternObj.predicate);
                return this.termFactory.create(patternObj.operator, [subject, predicate]);
            }
            // Handle other cases if necessary (e.g. components array)
            if (patternObj.components) {
                const components = patternObj.components.map(c => this.hydratePattern(c));
                return this.termFactory.create(patternObj.operator, components);
            }
        }

        throw new Error(`Cannot hydrate pattern: ${JSON.stringify(patternObj)}`);
    }

    /**
     * Extract static checks (guards) from a pattern.
     * @param {Object} pattern - { p: TermPattern, s: TermPattern }
     * @returns {Array<Object>} List of checks
     */
    extractGuards(pattern) {
        const checks = [];

        // 1. Operator Checks
        if (pattern.p.operator && !isVariable(pattern.p)) {
            checks.push({ type: 'op', target: 'p', val: pattern.p.operator });
        }
        if (pattern.s.operator && !isVariable(pattern.s)) {
            checks.push({ type: 'op', target: 's', val: pattern.s.operator });
        }

        // 2. Arity Checks (if components are specified)
        // If it's a variable, we don't constrain arity (it can match anything)
        if (pattern.p.components && !isVariable(pattern.p)) {
            checks.push({ type: 'arity', target: 'p', val: pattern.p.components.length });
        }
        if (pattern.s.components && !isVariable(pattern.s)) {
            checks.push({ type: 'arity', target: 's', val: pattern.s.components.length });
        }

        // 3. Variable Topology (Equality Constraints)
        // Check if variables are shared between p and s
        // For NAL, we often check if p.predicate == s.subject (Shared Term)
        // We can encode this as a check.
        // For simplicity in Phase 1, we might rely on the Unifier for complex topology,
        // but we can optimize for common cases like "Shared Middle".

        // Example: p=<S --> M>, s=<M --> P>
        // We can check if p.components[1] is same variable as s.components[0]

        // This requires the pattern definition to use consistent variable names.

        return this.rankChecks(checks);
    }

    rankChecks(checks) {
        // Sort checks by cost/selectivity.
        // Op checks are cheapest and most selective.
        // Arity checks are next.
        const score = (c) => {
            if (c.type === 'op') return 0;
            if (c.type === 'arity') return 1;
            return 2;
        };
        return checks.sort((a, b) => score(a) - score(b));
    }

    insertIntoTree(root, guards, rule) {
        let currentNode = root;

        for (const guard of guards) {
            // Create a key for the guard type/target
            // We need to structure the tree such that nodes represent checks.
            // But a node usually branches on the *value* of a specific check.
            // So we need to ensure the path of checks is consistent or flexible.

            // Simplification: We assume a fixed order of checks isn't strictly enforced globally,
            // but for a decision tree, we need to pick *which* check to perform at each node.
            // This is hard if rules have different sets of checks.

            // Better approach for heterogeneous rules:
            // The tree nodes represent a sequence of checks.
            // If the current node doesn't have the check we want, we might need to branch or reorganize.

            // Rete/Discriminator Tree approach:
            // Root -> Check Op(p) -> Val1 -> Check Op(s) -> ...
            //                     -> Val2 -> ...

            // To make this work, we should normalize the guards we extract.
            // Always extract Op(p), Op(s), Arity(p), Arity(s) if possible.
            // If a rule doesn't care (wildcard), it goes down a "wildcard" branch.

            // Let's standardize the sequence of checks for this implementation:
            // 1. Op(p)
            // 2. Op(s)
            // 3. Arity(p)
            // 4. Arity(s)

            // If a rule doesn't specify one, we treat it as "ANY".
        }

        // Revised Insertion Logic using standardized levels
        this.insertStandardized(this.root, rule);
    }

    insertStandardized(root, rule) {
        const p = rule.pattern.p;
        const s = rule.pattern.s;

        // Level 1: Op(p)
        let node = this.getOrCreateChild(root, 'op_p', p.operator || '*');

        // Level 2: Op(s)
        node = this.getOrCreateChild(node, 'op_s', s.operator || '*');

        // Level 3: Arity(p)
        const arityP = p.components ? p.components.length : '*';
        node = this.getOrCreateChild(node, 'arity_p', arityP);

        // Level 4: Arity(s)
        const arityS = s.components ? s.components.length : '*';
        node = this.getOrCreateChild(node, 'arity_s', arityS);

        // Leaf: Add rule
        node.rules.push(rule);
    }

    getOrCreateChild(node, checkType, value) {
        // The node itself stores the check type it *performed* to get here? 
        // No, the parent decides the check.
        // Let's say Root is "Check Op(p)".
        // Its children are mapped by values of Op(p).

        // But we need to store *what* check to perform at this node.
        // If we enforce a standard order, we can implicitly know:
        // Depth 0: Op(p)
        // Depth 1: Op(s)
        // Depth 2: Arity(p)
        // Depth 3: Arity(s)

        // So we don't need to store the check type on the node if it's implicit.
        // However, storing it makes it explicit and debuggable.

        if (!node.check) {
            node.check = { type: checkType }; // This node is responsible for this check
        }

        // If the node already has a check but it's different... 
        // With standardized levels, this shouldn't happen for the same depth.

        let child = node.children.get(value);
        if (!child) {
            child = new DecisionNode();
            node.children.set(value, child);
        }
        return child;
    }
}
