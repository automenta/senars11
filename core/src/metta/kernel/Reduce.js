/**
 * Reduce.js - Single-step rewriting and full reduction
 * Core evaluation engine for MeTTa
 */

import { isExpression, isSymbol, exp, sym, isList, flattenList, constructList } from './Term.js';
import { Unify } from './Unify.js';

/**
 * Perform a single reduction step on an atom
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @returns {Object} Object with reduced atom and applied flag
 */
export function step(atom, space, ground) {
    // If atom is not an expression, it's already reduced
    if (!isExpression(atom)) {
        return { reduced: atom, applied: false };
    }

    // Check if this is a grounded operation call (using ^ operator)
    const isGroundedOp = atom.operator === '^' || (atom.operator && atom.operator.name === '^');

    if (isExpression(atom) && isGroundedOp) {
        // Format: (^ &operation arg1 arg2 ...)
        if (atom.components && atom.components.length >= 1) {
            const opSymbol = atom.components[0];
            // Check if opSymbol is a symbol atom starting with &
            if (opSymbol.type === 'atom' && opSymbol.name && opSymbol.name.startsWith('&')) {
                if (ground.has(opSymbol.name)) {
                    // Extract arguments (skip the operation symbol)
                    const args = atom.components.slice(1);

                    // Reduce arguments before passing to grounded operation
                    // UNLESS the operation is marked as lazy
                    let reducedArgs;
                    if (ground.isLazy(opSymbol.name)) {
                        reducedArgs = args;
                    } else {
                        // This ensures operations like &+ or &empty? receive reduced values
                        reducedArgs = args.map(arg => reduce(arg, space, ground));
                    }

                    try {
                        // Execute the grounded operation
                        const result = ground.execute(opSymbol.name, ...reducedArgs);
                        return { reduced: result, applied: true };
                    } catch (error) {
                        // If execution fails, return original atom
                        return { reduced: atom, applied: false };
                    }
                }
            }
        }
    }

    // Look for matching rules in the space
    // We use rulesFor to leverage indexing
    const rules = space.rulesFor(atom);

    for (const rule of rules) {
        // Ensure it is a rule (has pattern), not just an indexed atom
        if (!rule.pattern) continue;

        // Rule format: { pattern, result }
        // Try to unify the atom with the pattern
        // Note: unify(pattern, term) -> pattern variables bound to term values
        const bindings = Unify.unify(rule.pattern, atom);

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
}

/**
 * Perform full reduction of an atom using an iterative approach to avoid stack overflow
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @param {number} limit - Maximum reduction steps (default: 10000)
 * @returns {Object} Fully reduced atom
 */
export function reduce(atom, space, ground, limit = 10000) {
    // Context for global state
    const ctx = {
        steps: 0,
        limit: limit
    };

    // Stack frame structure:
    // {
    //   phase: 'EXPAND' | 'REBUILD',
    //   term: Atom,
    //   parent: Frame, (optional, linked list)
    //   components: Array, (for REBUILD)
    //   result: Atom (output)
    //   index: number (for parent's components)
    // }

    // We use an explicit array as stack.

    const rootFrame = {
        phase: 'EXPAND',
        term: atom,
        components: null,
        results: null,
    };

    const stack = [rootFrame];

    while (stack.length > 0) {
        const frame = stack[stack.length - 1]; // Peek

        if (frame.phase === 'EXPAND') {
            // Step 1: Reduce top-level until stable or limit reached
            let current = frame.term;
            while (ctx.steps < ctx.limit) {
                const { reduced, applied } = step(current, space, ground);
                if (applied) {
                    current = reduced;
                    ctx.steps++;
                    continue;
                }
                break; // Stable
            }
            frame.term = current;

            // Check limits
            if (ctx.steps >= ctx.limit) {
                throw new Error(`Max reduction steps (${limit}) exceeded`);
            }

            // Step 2: Check if we need to reduce components
            if (isExpression(current) && current.components.length > 0) {
                // Switch to REBUILD phase
                frame.phase = 'REBUILD';
                frame.results = new Array(current.components.length);

                // Push children to stack (in reverse order so 0 is processed last on stack?
                // Wait, stack is LIFO. If we push N, N-1, ... 0. Then 0 is popped first.
                // Yes, we want to process left-to-right (0 first).
                for (let i = current.components.length - 1; i >= 0; i--) {
                    stack.push({
                        phase: 'EXPAND',
                        term: current.components[i],
                        parent: frame,
                        index: i
                    });
                }
            } else {
                // Done with this term
                if (frame.parent) {
                    frame.parent.results[frame.index] = current;
                }
                stack.pop();
            }

        } else if (frame.phase === 'REBUILD') {
            // Components are reduced and stored in frame.results
            const newComponents = frame.results;
            const current = frame.term;

            // Check if any component changed
            let changed = false;
            for (let i = 0; i < newComponents.length; i++) {
                if (newComponents[i] !== current.components[i]) { // Identity comparison
                    // For structural equality check (slower but correct for objects)
                    if (!newComponents[i].equals(current.components[i])) {
                        changed = true;
                        break;
                    }
                }
            }

            if (changed) {
                // Reconstruct term
                const newTerm = exp(current.operator, newComponents);
                ctx.steps++;
                if (ctx.steps >= ctx.limit) {
                    throw new Error(`Max reduction steps (${limit}) exceeded`);
                }

                // If changed, we must try reducing top-level again!
                // Reset frame to EXPAND with new term
                frame.phase = 'EXPAND';
                frame.term = newTerm;
                frame.results = null;
                // Loop continues with this frame in EXPAND mode
            } else {
                // No change, we are done
                if (frame.parent) {
                    frame.parent.results[frame.index] = current;
                } else {
                    // Root frame done
                    rootFrame.result = current;
                }
                stack.pop();
            }
        }
    }

    // Root result should be populated if stack is empty
    return rootFrame.result || rootFrame.term;
}

/**
 * Check if an atom is a grounded operation call
 * @param {Object} atom - Atom to check
 * @param {Object} ground - Grounded operations registry
 * @returns {boolean} True if atom is a grounded call
 */
export function isGroundedCall(atom, ground) {
    if (!isExpression(atom)) {
        return false;
    }

    // Check if it's a call using ^ operator with grounded operation
    const isGroundedOp = atom.operator === '^' || (atom.operator && atom.operator.name === '^');

    if (isGroundedOp && atom.components && atom.components.length > 0) {
        const opSymbol = atom.components[0];
        if (opSymbol.type === 'atom' && opSymbol.name && opSymbol.name.startsWith('&')) {
            return ground.has(opSymbol.name);
        }
    }

    return false;
}

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
        const { reduced, applied } = step(current, space, ground);

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

    // Use space.all() to ensure we check all atoms AND rules (which are reconstructed as atoms by space.all())
    // This allows matching against rule structures like (= (human $x) True)
    const candidates = space.all();

    for (const candidate of candidates) {
        const bindings = Unify.unify(pattern, candidate);

        if (bindings !== null) {
            const substituted = Unify.subst(template, bindings);
            results.push(substituted);
        }
    }

    return results;
}

// Compatibility export
export const Reduce = {
    step,
    reduce,
    isGroundedCall,
    reduceND,
    match
};
