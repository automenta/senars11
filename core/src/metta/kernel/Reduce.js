/**
 * Reduce.js - Single-step rewriting and full reduction
 * Core evaluation engine for MeTTa
 */

import { isExpression, isSymbol, exp } from './Term.js';
import { Unify } from './Unify.js';

// Export a Reduce object that matches the expected API in tests
export const Reduce = {
    /**
     * Perform a single reduction step on an atom
     * @param {Object} atom - Atom to reduce
     * @param {Space} space - Space containing rules
     * @param {Object} ground - Grounded operations registry
     * @returns {Object} Object with reduced atom and applied flag
     */
    step: function(atom, space, ground) {
        // If atom is not an expression, it's already reduced
        if (!isExpression(atom)) {
            return { reduced: atom, applied: false };
        }

        // Check if this is a grounded operation call (using ^ operator)
        if (isExpression(atom) && isSymbol(atom.operator) && atom.operator.name === '^') {
            // Format: (^ &operation arg1 arg2 ...)
            if (atom.components && atom.components.length >= 2) {
                const opSymbol = atom.components[0];
                if (isSymbol(opSymbol) && opSymbol.name.startsWith('&') && ground.has(opSymbol.name)) {
                    // Extract arguments (skip the operation symbol)
                    const args = atom.components.slice(1);

                    try {
                        // Execute the grounded operation
                        const result = ground.execute(opSymbol.name, ...args);
                        return { reduced: result, applied: true };
                    } catch (error) {
                        // If execution fails, return original atom
                        return { reduced: atom, applied: false };
                    }
                }
            }
        }

        // Look for matching rules in the space
        const rules = space.getRules(); // Get all rules from space

        for (const rule of rules) {
            // Rule format: { pattern, result }
            // Try to unify the atom with the pattern
            const bindings = Unify.unify(atom, rule.pattern);

            if (bindings !== null) {
                // Apply bindings to the result
                if (typeof rule.result === 'function') {
                    // If result is a function, call it with bindings
                    const result = rule.result(bindings);
                    return { reduced: result, applied: true };
                } else {
                    // If result is a term, substitute bindings
                    const substituted = Unify.subst(rule.result, bindings);
                    return { reduced: substituted, applied: true };
                }
            }
        }

        // If no reduction is possible, return the original atom
        return { reduced: atom, applied: false };
    },

    /**
     * Perform full reduction of an atom
     * @param {Object} atom - Atom to reduce
     * @param {Space} space - Space containing rules
     * @param {Object} ground - Grounded operations registry
     * @param {number} limit - Maximum reduction steps (default: 1000)
     * @returns {Object} Fully reduced atom
     */
    reduce: function(atom, space, ground, limit = 1000) {
        let current = atom;
        let steps = 0;

        while (steps < limit) {
            const { reduced, applied } = Reduce.step(current, space, ground);

            // If no change occurred, reduction is complete
            if (!applied || (reduced.equals && reduced.equals(current))) {
                return current;
            }

            current = reduced;
            steps++;
        }

        // If we hit the limit, throw an error
        throw new Error(`Max reduction steps (${limit}) exceeded`);
    },

    /**
     * Check if an atom is a grounded operation call
     * @param {Object} atom - Atom to check
     * @param {Object} ground - Grounded operations registry
     * @returns {boolean} True if atom is a grounded call
     */
    isGroundedCall: function(atom, ground) {
        if (!isExpression(atom)) {
            return false;
        }

        // Check if it's a call using ^ operator with grounded operation
        if (isSymbol(atom.operator) && atom.operator.name === '^' && atom.components && atom.components.length > 0) {
            const opSymbol = atom.components[0];
            if (isSymbol(opSymbol) && opSymbol.name.startsWith('&')) {
                return ground.has(opSymbol.name);
            }
        }

        return false;
    }
};

/**
 * Perform non-deterministic reduction (returns all possible results)
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @param {number} limit - Maximum reduction steps (default: 100)
 * @returns {Array} Array of possible reduced atoms
 */
export function reduceND(atom, space, ground, limit = 100) {
    const results = new Set();
    const visited = new Set();
    const queue = [{ atom, steps: 0 }];

    while (queue.length > 0) {
        const { atom: current, steps } = queue.shift();

        if (steps >= limit) {
            results.add(current);
            continue;
        }

        // Avoid infinite loops
        const currentStr = current.toString();
        if (visited.has(currentStr)) {
            continue;
        }
        visited.add(currentStr);

        // Try to reduce the current atom
        const { reduced, applied } = Reduce.step(current, space, ground);

        // If reduction didn't change the atom, we're done
        if (!applied || (reduced.equals && reduced.equals(current))) {
            results.add(reduced);
            continue;
        }

        // Add the reduced atom to results and continue exploring
        results.add(reduced);
        queue.push({ atom: reduced, steps: steps + 1 });
    }

    return Array.from(results);
}

/**
 * Match pattern against space and return substitutions
 * @param {Object} space - Space to match against
 * @param {Object} pattern - Pattern to match
 * @param {Object} template - Template to substitute
 * @returns {Array} Array of substituted templates
 */
export function match(space, pattern, template) {
    const results = [];

    // Get candidates from functor index
    const candidates = space.rulesFor(pattern);

    for (const candidate of candidates) {
        const bindings = Unify.unify(pattern, candidate);

        if (bindings !== null) {
            const substituted = Unify.substitute(template, bindings);
            results.push(substituted);
        }
    }

    return results;
}

