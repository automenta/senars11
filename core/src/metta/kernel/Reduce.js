/**
 * Reduce.js - Single-step rewriting and full reduction
 * Core evaluation engine for MeTTa
 */

import { isExpression, isSymbol } from './Term.js';
import { unify, substitute } from './Unify.js';

/**
 * Perform a single reduction step on an atom
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @returns {Object|null} Reduced atom or null if no reduction possible
 */
export function step(atom, space, ground) {
    // If atom is not an expression, it's already reduced
    if (!isExpression(atom)) {
        return atom;
    }
    
    // Check if this is a grounded operation
    if (isSymbol(atom.operator) && ground.has(atom.operator.name)) {
        // First, try to reduce all arguments to their simplest form
        let reducedArgs = [];
        let allReduced = true;

        for (const arg of atom.args) {
            const reducedArg = step(arg, space, ground); // Use step to reduce the argument
            // If the argument is not fully reduced (still an expression), we can't apply the operation yet
            if (isExpression(reducedArg) && reducedArg !== arg) {
                // If the argument reduced to a different expression, we need to continue reducing
                return exp([atom.operator, ...atom.args.slice(0, reducedArgs.length), reducedArg, ...atom.args.slice(reducedArgs.length + 1)]);
            }
            reducedArgs.push(reducedArg);
        }

        // Check if all arguments are now in a form that the grounded operation can handle
        // (e.g., numbers for arithmetic operations)
        const canExecute = reducedArgs.every(arg =>
            isSymbol(arg) && !isNaN(parseFloat(arg.name)) // Numeric symbols
        );

        if (canExecute && ground.has(atom.operator.name)) {
            // Convert symbolic numbers to actual numbers for the operation
            const numericArgs = reducedArgs.map(arg => parseFloat(arg.name));
            const result = ground.execute(atom.operator.name, numericArgs);
            // If the result is a primitive (number/string), convert it to an atom
            if (typeof result === 'number') {
                return { type: 'symbol', name: String(result), toString: () => String(result), equals: (other) => other && other.type === 'symbol' && other.name === String(result) };
            } else if (typeof result === 'string') {
                return { type: 'symbol', name: result, toString: () => result, equals: (other) => other && other.type === 'symbol' && other.name === result };
            } else if (typeof result === 'boolean') {
                return { type: 'symbol', name: result ? 'True' : 'False', toString: () => result ? 'True' : 'False', equals: (other) => other && other.type === 'symbol' && other.name === (result ? 'True' : 'False') };
            }
            return result;
        } else {
            // If we can't execute yet, return the expression with reduced arguments
            return exp([atom.operator, ...reducedArgs]);
        }
    }
    
    // Look for matching rules in the space
    const rules = space.rulesFor(atom);
    
    for (const rule of rules) {
        if (isExpression(rule) && isSymbol(rule.operator) && rule.operator.name === '=') {
            // Rule format: (= pattern result)
            if (rule.args.length >= 2) {
                const pattern = rule.args[0];
                const result = rule.args[1];
                
                // Try to unify the atom with the pattern
                const bindings = unify(atom, pattern);
                
                if (bindings !== null) {
                    // Apply bindings to the result
                    return substitute(result, bindings);
                }
            }
        }
    }
    
    // If no reduction is possible, return the original atom
    return atom;
}

/**
 * Perform full reduction of an atom
 * @param {Object} atom - Atom to reduce
 * @param {Space} space - Space containing rules
 * @param {Object} ground - Grounded operations registry
 * @param {number} limit - Maximum reduction steps (default: 1000)
 * @returns {Object} Fully reduced atom
 */
export function reduce(atom, space, ground, limit = 1000) {
    let current = atom;
    let steps = 0;
    
    while (steps < limit) {
        const next = step(current, space, ground);
        
        // If no change occurred, reduction is complete
        if (next.equals && next.equals(current)) {
            return current;
        }
        
        current = next;
        steps++;
    }
    
    // If we hit the limit, return the current state
    console.warn(`Reduction hit step limit of ${limit}`);
    return current;
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
        const reduced = step(current, space, ground);
        
        // If reduction didn't change the atom, we're done
        if (reduced.equals && reduced.equals(current)) {
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
        const bindings = unify(pattern, candidate);
        
        if (bindings !== null) {
            const substituted = substitute(template, bindings);
            results.push(substituted);
        }
    }
    
    return results;
}