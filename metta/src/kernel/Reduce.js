/**
 * Reduce.js - Single-step rewriting and full reduction
 * Core evaluation engine for MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isExpression, exp, isList } from './Term.js';
import { Unify } from './Unify.js';

/**
 * Perform a single reduction step on an atom
 */
export const step = (atom, space, ground, limit = 10000, cache = null) => {
    if (!isExpression(atom)) return { reduced: atom, applied: false };

    // Check cache
    const cached = cache?.get(atom);
    if (cached !== undefined) return { reduced: cached, applied: true };

    const opName = atom.operator?.name;

    // 1. Fast path: Direct grounded operation
    if (opName && ground.has(opName)) {
        const result = executeGroundedOp(atom, opName, space, ground, limit);
        if (result.applied) {
            cache?.set(atom, result.reduced);
            return result;
        }
    }

    // 2. Explicit Grounded call (^)
    if (opName === '^' && atom.components?.[0]?.name && ground.has(atom.components[0].name)) {
        const opSymbol = atom.components[0];
        const args = atom.components.slice(1);
        const result = executeGroundedOpWithArgs(atom, opSymbol.name, args, space, ground, limit);
        if (result.applied) {
            cache?.set(atom, result.reduced);
            return result;
        }
    }

    // 3. Rule matching
    const rules = space.rulesFor(atom);
    for (const rule of rules) {
        if (!rule.pattern) continue;
        const bindings = Unify.unify(rule.pattern, atom);
        if (bindings !== null) {
            const result = typeof rule.result === 'function'
                ? rule.result(bindings)
                : Unify.subst(rule.result, bindings);
            cache?.set(atom, result);
            return { reduced: result, applied: true };
        }
    }

    return { reduced: atom, applied: false };
};

const executeGroundedOp = (atom, opName, space, ground, limit) => {
    const args = atom.components;
    try {
        const reducedArgs = ground.isLazy(opName) ? args : args.map(arg => reduce(arg, space, ground, limit));
        return { reduced: ground.execute(opName, ...reducedArgs), applied: true };
    } catch {
        return { reduced: atom, applied: false };
    }
};

const executeGroundedOpWithArgs = (atom, opName, args, space, ground, limit) => {
    try {
        const reducedArgs = ground.isLazy(opName) ? args : args.map(arg => reduce(arg, space, ground, limit));
        return { reduced: ground.execute(opName, ...reducedArgs), applied: true };
    } catch {
        return { reduced: atom, applied: false };
    }
};

/**
 * Perform full reduction using TCO-optimized stack approach
 */
export const reduce = (atom, space, ground, limit = 10000, cache = null) => {
    const ctx = { steps: 0, limit };
    const rootFrame = { phase: 'EXPAND', term: atom, results: null };
    const stack = [rootFrame];

    while (stack.length > 0) {
        const frame = stack[stack.length - 1];

        if (frame.phase === 'EXPAND') {
            let current = frame.term;

            // Reduce top-level until stable
            while (ctx.steps < ctx.limit) {
                const { reduced, applied } = step(current, space, ground, limit, cache);
                if (applied) {
                    current = reduced;
                    ctx.steps++;
                    continue;
                }
                break;
            }

            frame.term = current;
            if (ctx.steps >= ctx.limit) throw new Error(`Max reduction steps (${limit}) exceeded`);

            if (!current) {
                if (frame.parent) frame.parent.results[frame.index] = current;
                stack.pop();
                continue;
            }

            const reduceOperator = current.operator && isExpression(current.operator);
            const hasComponents = isExpression(current) && current.components?.length > 0;

            if (reduceOperator || hasComponents) {
                frame.phase = 'REBUILD';
                frame.reduceOperator = reduceOperator;

                const compLen = hasComponents ? current.components.length : 0;
                const totalLen = compLen + (reduceOperator ? 1 : 0);
                frame.results = new Array(totalLen);

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
                if (reduceOperator) {
                    stack.push({
                        phase: 'EXPAND',
                        term: current.operator,
                        parent: frame,
                        index: 0
                    });
                }
            } else {
                if (frame.parent) frame.parent.results[frame.index] = current;
                stack.pop();
            }

        } else if (frame.phase === 'REBUILD') {
            const current = frame.term;
            const reduceOperator = frame.reduceOperator;
            const newOperator = reduceOperator ? frame.results[0] : current.operator;
            const newComponents = reduceOperator ? frame.results.slice(1) : frame.results;

            if (hasChanges(current, newOperator, newComponents, reduceOperator)) {
                const newTerm = exp(newOperator, newComponents);
                ctx.steps++;
                // TCO: Reset frame to EXPAND with new term
                frame.phase = 'EXPAND';
                frame.term = newTerm;
                frame.results = null;
            } else {
                if (frame.parent) {
                    frame.parent.results[frame.index] = current;
                } else {
                    rootFrame.result = current;
                }
                stack.pop();
            }
        }
    }

    return rootFrame.result || rootFrame.term;
};

const hasChanges = (current, newOperator, newComponents, reduceOperator) => {
    if (reduceOperator && newOperator !== current.operator && !newOperator.equals?.(current.operator)) return true;
    for (let i = 0; i < newComponents.length; i++) {
        if (newComponents[i] !== current.components[i]) {
            if (!newComponents[i]?.equals?.(current.components[i])) return true;
        }
    }
    return false;
};

export const isGroundedCall = (atom, ground) => {
    if (!isExpression(atom)) return false;
    const opName = atom.operator?.name;
    if (opName && ground.has(opName)) return true;

    // Explicit ^ check
    if (opName === '^' && atom.components?.[0]?.name) {
        return ground.has(atom.components[0].name);
    }
    return false;
};

/**
 * Perform non-deterministic reduction (returns all possible results)
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

        const currentStr = current.toString();
        if (visited.has(currentStr)) continue;
        visited.add(currentStr);

        const { reduced, applied } = step(current, space, ground, limit);

        if (!applied || reduced.equals?.(current)) {
            results.add(reduced);
            continue;
        }

        results.add(reduced);
        queue.push({ atom: reduced, steps: steps + 1 });
    }

    return Array.from(results);
};

export const match = (space, pattern, template) => {
    const results = [];
    for (const candidate of space.all()) {
        const bindings = Unify.unify(pattern, candidate);
        if (bindings !== null) {
            results.push(Unify.subst(template, bindings));
        }
    }
    return results;
};
