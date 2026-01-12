/**
 * Reduce.js - Single-step rewriting and full reduction
 * Core evaluation engine for MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
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
export const step = (atom, space, ground, limit = 10000) => {
    // If atom is not an expression, it's already reduced
    if (!isExpression(atom)) {
        return { reduced: atom, applied: false };
    }

    // Fast path: Check for grounded operations first
    const opName = atom.operator?.name;
    if (opName && ground.has(opName)) {
        const result = executeGroundedOp(atom, opName, space, ground, limit);
        if (result.applied) {
            return result;
        }
        // If grounded operation didn't apply (failed), continue to rules
    }

    // Check if this is a grounded operation call (using ^ operator)
    const isGroundedOp = atom.operator === '^' || (atom.operator && atom.operator.name === '^');
    if (isGroundedOp && atom.components && atom.components.length >= 1) {
        const opSymbol = atom.components[0];
        if (opSymbol?.type === 'atom' && opSymbol.name && ground.has(opSymbol.name)) {
            const args = atom.components.slice(1);
            return executeGroundedOpWithArgs(atom, opSymbol.name, args, space, ground, limit);
        }
    }

    // Look for matching rules in the space
    const rules = space.rulesFor(atom);
    for (const rule of rules) {
        if (!rule.pattern) continue;

        const bindings = Unify.unify(rule.pattern, atom);
        if (bindings !== null) {
            const result = typeof rule.result === 'function'
                ? rule.result(bindings)
                : Unify.subst(rule.result, bindings);
            return { reduced: result, applied: true };
        }
    }

    return { reduced: atom, applied: false };
};

/**
 * Execute a grounded operation
 * @private
 */
const executeGroundedOp = (atom, opName, space, ground, limit) => {
    const args = atom.components;
    const reducedArgs = ground.isLazy(opName)
        ? args
        : args.map(arg => reduce(arg, space, ground, limit));

    try {
        const result = ground.execute(opName, ...reducedArgs);
        return { reduced: result, applied: true };
    } catch (error) {
        // On error, fall through to rules (allowing operator overloading)
        return { reduced: atom, applied: false };
    }
};

/**
 * Execute a grounded operation with explicit ^ operator
 * @private
 */
const executeGroundedOpWithArgs = (atom, opName, args, space, ground, limit) => {
    const reducedArgs = ground.isLazy(opName)
        ? args
        : args.map(arg => reduce(arg, space, ground, limit));

    try {
        const result = ground.execute(opName, ...reducedArgs);
        return { reduced: result, applied: true };
    } catch (error) {
        return { reduced: atom, applied: false };
    }
};

/**
 * Perform full reduction of an atom using an iterative approach to avoid stack overflow
 * Optimized version with performance improvements
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @param {number} limit - Maximum reduction steps (default: 10000)
 * @returns {Object} Fully reduced atom
 */
export const reduce = (atom, space, ground, limit = 10000) => {
    // Context for global state
    const ctx = { steps: 0, limit };

    // Stack frame structure:
    // {
    //   phase: 'EXPAND' | 'REBUILD',
    //   term: Atom,
    //   parent: Frame, (optional, linked list)
    //   results: Array, (for REBUILD)
    //   index: number (for parent's components)
    // }

    const rootFrame = { phase: 'EXPAND', term: atom, results: null };
    const stack = [rootFrame];

    while (stack.length > 0) {
        const frame = stack[stack.length - 1]; // Peek

        if (frame.phase === 'EXPAND') {
            // Reduce top-level until stable or limit reached
            let current = frame.term;
            while (ctx.steps < ctx.limit) {
                const { reduced, applied } = step(current, space, ground, limit);
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

            // Check if current is valid before proceeding
            if (!current) {
                if (frame.parent) {
                    frame.parent.results[frame.index] = current;
                }
                stack.pop();
                continue;
            }

            // Check if we need to reduce components
            const reduceOperator = current.operator && isExpression(current.operator);
            const hasComponents = isExpression(current) && current.components && current.components.length > 0;

            if (reduceOperator || hasComponents) {
                // Switch to REBUILD phase
                frame.phase = 'REBUILD';
                frame.reduceOperator = reduceOperator;

                // Calculate total length needed
                const compLen = hasComponents ? current.components.length : 0;
                const totalLen = compLen + (reduceOperator ? 1 : 0);
                frame.results = new Array(totalLen);

                // Push components to stack in reverse order for correct processing
                if (hasComponents) {
                    for (let i = compLen - 1; i >= 0; i--) {
                        stack.push({
                            phase: 'EXPAND',
                            term: current.components[i],
                            parent: frame,
                            index: i + (reduceOperator ? 1 : 0)
                        });
                    }
                }

                // Push operator if needed
                if (reduceOperator) {
                    stack.push({
                        phase: 'EXPAND',
                        term: current.operator,
                        parent: frame,
                        index: 0
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
            const current = frame.term;
            const reduceOperator = frame.reduceOperator;
            const newOperator = reduceOperator ? frame.results[0] : current.operator;
            const newComponents = reduceOperator ? frame.results.slice(1) : frame.results;

            // Check if anything changed to avoid unnecessary reconstruction
            const changed = hasChanges(current, newOperator, newComponents, reduceOperator);

            if (changed) {
                // Reconstruct term
                const newTerm = exp(newOperator, newComponents);
                ctx.steps++;
                if (ctx.steps >= ctx.limit) {
                    throw new Error(`Max reduction steps (${limit}) exceeded`);
                }

                // Reset frame to EXPAND with new term
                frame.phase = 'EXPAND';
                frame.term = newTerm;
                frame.results = null;
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
};

/**
 * Check if there were changes that require term reconstruction
 * @private
 */
const hasChanges = (current, newOperator, newComponents, reduceOperator) => {
    // Check operator change
    if (reduceOperator) {
        if (newOperator !== current.operator && (!newOperator.equals || !newOperator.equals(current.operator))) {
            return true;
        }
    }

    // Check components change
    for (let i = 0; i < newComponents.length; i++) {
        if (newComponents[i] !== current.components[i]) {
            // For structural equality check (slower but correct for objects)
            if (newComponents[i] && current.components[i] && (!newComponents[i].equals || !newComponents[i].equals(current.components[i]))) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Check if an atom is a grounded operation call
 * @param {Object} atom - Atom to check
 * @param {Object} ground - Grounded operations registry
 * @returns {boolean} True if atom is a grounded call
 */
export const isGroundedCall = (atom, ground) => {
    if (!isExpression(atom)) {
        return false;
    }

    // Check if it's a call using ^ operator with grounded operation
    const isGroundedOp = atom.operator === '^' || (atom.operator && atom.operator.name === '^');

    if (isGroundedOp && atom.components && atom.components.length > 0) {
        const opSymbol = atom.components[0];
        if (opSymbol?.type === 'atom' && opSymbol.name) {
            return ground.has(opSymbol.name);
        }
    }

    // Implicit check
    const opName = atom.operator?.name;
    return opName ? ground.has(opName) : false;
};

/**
 * Perform non-deterministic reduction (returns all possible results)
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @param {number} limit - Maximum reduction steps (default: 100)
 * @returns {Array} Array of possible reduced atoms
 */
export const reduceND = (atom, space, ground, limit = 100) => {
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
        const { reduced, applied } = step(current, space, ground, limit);

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
};

/**
 * Match pattern against space and return substitutions
 * @param {Object} space - Space to match against
 * @param {Object} pattern - Pattern to match
 * @param {Object} template - Template to substitute
 * @returns {Array} Array of substituted templates
 */
export const match = (space, pattern, template) => {
    const results = [];
    const candidates = space.all();

    for (const candidate of candidates) {
        const bindings = Unify.unify(pattern, candidate);
        if (bindings !== null) {
            results.push(Unify.subst(template, bindings));
        }
    }

    return results;
};

// Compatibility export
export const Reduce = {
    step,
    reduce,
    isGroundedCall,
    reduceND,
    match
};
