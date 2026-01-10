/**
 * Minimal MeTTa Kernel - Reduction Engine
 * 
 * Single-step and full reduction for term rewriting.
 * Uses space rules and grounded operations.
 */

import { Unify } from './Unify.js';

/**
 * Perform a single reduction step
 * @param {object} atom - Term to reduce
 * @param {object} space - Space containing rules
 * @param {object} ground - Grounded operations registry
 * @returns {object} {reduced: term, applied: boolean}
 */
function step(atom, space, ground) {
    if (!atom) {
        return { reduced: atom, applied: false };
    }

    // Try pattern-based rules first
    if (atom.operator) {
        // Use functor index for fast lookup
        const rules = space.rulesFor(atom.operator);

        for (const { pattern, result } of rules) {
            const bindings = Unify.unify(pattern, atom);

            if (bindings !== null) {
                // Rule matched! Apply it
                const reduced = typeof result === 'function'
                    ? result(bindings)
                    : Unify.subst(result, bindings);

                if (reduced === null || reduced === undefined) continue;

                return { reduced, applied: true };
            }
        }
    }

    // Try grounded atom execution
    if (isGroundedCall(atom, ground)) {
        try {
            const name = atom.components[0].name;
            const args = atom.components.slice(1);
            const reduced = ground.execute(name, ...args);
            return { reduced, applied: true };
        } catch (error) {
            // Grounded execution failed - return unchanged
            return { reduced: atom, applied: false };
        }
    }

    // No reduction possible
    return { reduced: atom, applied: false };
}

/**
 * Reduce a term to normal form (or until limit reached)
 * @param {object} atom - Term to reduce
 * @param {object} space - Space containing rules
 * @param {object} ground - Grounded operations
 * @param {number} limit - Maximum reduction steps (default 1000)
 * @returns {object} Fully reduced term
 */
function reduce(atom, space, ground, limit = 1000) {
    let current = atom;
    let steps = 0;

    while (steps < limit) {
        const { reduced, applied } = step(current, space, ground);

        if (!applied) {
            // Reached normal form
            return current;
        }

        current = reduced;
        steps++;
    }

    // Max steps exceeded
    throw new Error(`Max reduction steps (${limit}) exceeded for: ${atom.toString()}`);
}

/**
 * Check if term is a grounded operation call
 * Pattern: (^ &op-name args...)
 * @param {object} term - Term to check  
 * @param {object} ground - Ground registry
 * @returns {boolean} True if grounded call
 */
function isGroundedCall(term, ground) {
    if (!term || term.type !== 'compound') {
        return false;
    }

    // Check for grounded call pattern: (^ &name ...)
    if (term.operator === '^' && term.components.length > 0) {
        const firstComp = term.components[0];
        if (firstComp && firstComp.type === 'atom') {
            return ground.has(firstComp.name);
        }
    }

    return false;
}

export const Reduce = {
    step,
    reduce,
    isGroundedCall
};
