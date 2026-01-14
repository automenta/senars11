/**
 * Reduce.js - Single-step rewriting and full reduction
 * Core evaluation engine for MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isExpression, exp } from './Term.js';
import { Unify } from './Unify.js';

/**
 * Perform a single reduction step on an atom (Generator version)
 * Yields all possible reduction results for the given atom.
 */
export function* stepYield(atom, space, ground, limit = 10000, cache = null) {
    if (!isExpression(atom)) {
        return;
    }

    // Check cache (deterministic only for now)
    const cached = cache?.get(atom);
    if (cached !== undefined) {
        yield { reduced: cached, applied: true };
        return;
    }

    const opName = atom.operator?.name;

    // 0. Superpose handling (Explicit non-determinism)
    if (opName === 'superpose' && atom.components?.length > 0) {
        const arg = atom.components[0];
        if (isExpression(arg)) {
            const alternatives = flattenList(arg);
            if (alternatives.length === 0) {
                yield { reduced: null, applied: true, deadEnd: true };
                return;
            }
            for (const alt of alternatives) {
                yield { reduced: alt, applied: true };
            }
            return;
        } else if (arg.name === '()') {
            yield { reduced: null, applied: true, deadEnd: true };
            return;
        }
    }

    // 1. Fast path: Direct grounded operation
    if (opName && ground.has(opName)) {
        let applied = false;
        for (const result of executeGroundedOpND(atom, opName, space, ground, limit)) {
            if (result.applied) {
                applied = true;
                cache?.set(atom, result.reduced); // Cache first result? Be careful with ND.
                yield result;
            }
        }
        if (applied) return;
    }

    // 2. Explicit Grounded call (^)
    if (opName === '^' && atom.components?.[0]?.name && ground.has(atom.components[0].name)) {
        const opSymbol = atom.components[0];
        const args = atom.components.slice(1);
        let applied = false;
        // Should we use ND execution for ^ atoms too? Yes.
        // We need a variant of executeGroundedOpND that takes explicit args.
        // But here args are in components slice.
        // Let's refactor executeGroundedOpND to take args.
        for (const result of executeGroundedOpWithArgsND(atom, opSymbol.name, args, space, ground, limit)) {
            if (result.applied) {
                applied = true;
                cache?.set(atom, result.reduced);
                yield result;
            }
        }
        if (applied) return;
    }

    // 3. Rule matching - Iterate ALL matching rules
    const rules = space.rulesFor(atom);
    let matched = false;
    for (const rule of rules) {
        if (!rule.pattern) continue;

        const bindings = Unify.unify(rule.pattern, atom);

        if (bindings !== null) {
            matched = true;
            const result = typeof rule.result === 'function'
                ? rule.result(bindings)
                : Unify.subst(rule.result, bindings);
            yield { reduced: result, applied: true };
        }
    }
}

/**
 * Backward compatible step function (Deterministic - takes first result)
 */
export const step = (atom, space, ground, limit = 10000, cache = null) => {
    const generator = stepYield(atom, space, ground, limit, cache);
    const first = generator.next();
    if (!first.done) {
        if (first.value.deadEnd) return { reduced: exp(atom.operator || atom, []), applied: true };
        return first.value;
    }
    return { reduced: atom, applied: false };
};


const flattenList = (expr) => {
    const results = [];
    let current = expr;
    while (isExpression(current) && current.operator?.name === ':') {
        if (current.components?.length > 0) results.push(current.components[0]);
        if (current.components?.length > 1) {
            current = current.components[1];
        } else {
            break;
        }
    }
    if (isExpression(current) && current.operator?.name !== ':') {
        if (current.name === '()' || (Array.isArray(current.components) && current.components.length === 0 && !current.operator)) {
            // empty
        } else {
            if (current.operator) results.push(current.operator);
            if (current.components) results.push(...current.components);
        }
        return results;
    }
    if (results.length > 0) return results;
    if (expr.name !== '()') return [expr];
    return [];
};

// Generator for grounded execution with ND argument reduction
function* executeGroundedOpND(atom, opName, space, ground, limit) {
    const args = atom.components;

    // Lazy: use unreduced args
    if (ground.isLazy(opName)) {
        try {
            const result = ground.execute(opName, ...args);
            yield { reduced: result, applied: true };
        } catch { }
        return;
    }

    // Strict: Reduce args ND
    // Map each arg to an array of its possible reductions
    const argVariants = args.map(arg => reduceND(arg, space, ground, limit));

    // If any arg reduced to NOTHING (dead end), then the op cannot apply.
    // reduceND returns [] if dead end (empty set of results).
    // If any variant list is empty, Cartesian product is empty.
    if (argVariants.some(v => v.length === 0)) return;

    // Generate Cartesian product and execute
    for (const combination of cartesianProduct(argVariants)) {
        try {
            const result = ground.execute(opName, ...combination);
            yield { reduced: result, applied: true };
        } catch {
            // If this specific combination failed (e.g. type error), ignore it
        }
    }
}

function* executeGroundedOpWithArgsND(atom, opName, args, space, ground, limit) {
    if (ground.isLazy(opName)) {
        try {
            const result = ground.execute(opName, ...args);
            yield { reduced: result, applied: true };
        } catch { }
        return;
    }

    const argVariants = args.map(arg => reduceND(arg, space, ground, limit));
    if (argVariants.some(v => v.length === 0)) return;

    for (const combination of cartesianProduct(argVariants)) {
        try {
            const result = ground.execute(opName, ...combination);
            yield { reduced: result, applied: true };
        } catch { }
    }
}

// Helper for Cartesian product of arrays
function* cartesianProduct(arrays) {
    if (arrays.length === 0) {
        yield [];
        return;
    }

    const head = arrays[0];
    const tail = arrays.slice(1);

    for (const h of head) {
        if (tail.length === 0) {
            yield [h];
        } else {
            for (const t of cartesianProduct(tail)) {
                yield [h, ...t];
            }
        }
    }
}


export const reduce = (atom, space, ground, limit = 10000, cache = null) => {
    const ctx = { steps: 0, limit };
    const rootFrame = { phase: 'EXPAND', term: atom, results: null };
    const stack = [rootFrame];
    // ... (Standard reduce implementation unchanged from previous correct version)
    // I will include the standard reduce implementation here to ensure file is complete

    while (stack.length > 0) {
        const frame = stack[stack.length - 1];

        if (frame.phase === 'EXPAND') {
            let current = frame.term;
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
    if (opName === '^' && atom.components?.[0]?.name) {
        return ground.has(atom.components[0].name);
    }
    return false;
};

export const reduceND = (atom, space, ground, limit = 100) => {
    const results = new Set();
    const visited = new Set();
    const queue = [{ atom, steps: 0 }];

    while (queue.length > 0) {
        const { atom: current, steps } = queue.shift();
        const currentStr = current.toString();
        if (visited.has(currentStr)) continue;
        visited.add(currentStr);

        if (steps >= limit) {
            results.add(current);
            continue;
        }

        let appliedAny = false;
        const reductions = generatorToArray(stepYield(current, space, ground, limit));

        if (reductions.length > 0) {
            for (const res of reductions) {
                if (res.deadEnd) {
                    appliedAny = true;
                    continue;
                }
                appliedAny = true;
                queue.push({ atom: res.reduced, steps: steps + 1 });
            }
        } else {
            if (isExpression(current) && current.components.length > 0) {
                const newExprs = reduceSubcomponentsND(current, space, ground, limit - steps);
                if (newExprs.length > 0) {
                    let producedNew = false;
                    for (const expr of newExprs) {
                        if (!expr.equals(current)) {
                            queue.push({ atom: expr, steps: steps + 1 });
                            producedNew = true;
                        }
                    }
                    if (producedNew) appliedAny = true;
                }
            }
        }
        if (!appliedAny) results.add(current);
    }
    return Array.from(results);
};

const generatorToArray = (gen) => {
    const arr = [];
    for (const item of gen) {
        arr.push(item);
    }
    return arr;
};

const reduceSubcomponentsND = (expr, space, ground, limit) => {
    const components = expr.components;
    const operator = expr.operator;
    const results = [];

    for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const variants = generatorToArray(stepYield(comp, space, ground, limit));

        if (variants.length > 0) {
            let hasDeadEnd = false;
            for (const { reduced, deadEnd } of variants) {
                if (deadEnd) {
                    hasDeadEnd = true; // One variant was dead end
                    // Should we continue?
                    // If one path leads to dead end, that path is dead.
                    // But others might be alive.
                    continue;
                }
                const newComponents = [...components];
                newComponents[i] = reduced;
                results.push(exp(operator, newComponents));
            }
            return results;
        }
    }

    if (operator && isExpression(operator)) {
        const variants = generatorToArray(stepYield(operator, space, ground, limit));
        if (variants.length > 0) {
            for (const { reduced, deadEnd } of variants) {
                if (deadEnd) continue;
                results.push(exp(reduced, components));
            }
            return results;
        }
    }
    return results;
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
