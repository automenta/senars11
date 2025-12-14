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
    constructor(termFactory, discriminators = []) {
        this.root = new DecisionNode();
        this.termFactory = termFactory;
        this.discriminators = discriminators;
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

            this.insert(this.root, rule);
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

    insert(root, rule) {
        const p = rule.pattern.p;
        const s = rule.pattern.s;
        let node = root;

        for (const discriminator of this.discriminators) {
            const value = discriminator.getPatternValue(p, s);
            node = this.getOrCreateChild(node, discriminator.name, value);
        }

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
