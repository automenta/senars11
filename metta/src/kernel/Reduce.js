/**
 * Reduce.js - Evaluation Engine
 * Core single-step rewriting and full reduction logic.
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { isExpression, exp, isList, flattenList } from './Term.js';
import { Unify } from './Unify.js';

// --- Generators & Single Step ---

/**
 * Yield possible reductions for an atom
 */
export function* stepYield(atom, space, ground, limit = 10000, cache = null) {
    if (!isExpression(atom)) return;

    // Check cache first
    const cached = cache?.get?.(atom);
    if (cached !== undefined) {
        yield { reduced: cached, applied: true };
        return;
    }

    const opName = atom.operator?.name;
    const comps = atom.components;

    // Handle superposition
    if (opName === 'superpose' && comps?.length > 0) {
        const arg = comps[0];
        if (isExpression(arg)) {
            let alts = [];

            // If it's a list structure, flatten it
            if (isList(arg)) {
                const flattened = flattenList(arg);
                alts = flattened.elements;
            } else {
                // If it's a simple expression, treat operator and components as alternatives
                alts = [arg.operator, ...arg.components];
            }

            if (alts.length === 0) {
                yield { reduced: null, applied: true, deadEnd: true };
                return;
            }
            for (const alt of alts) yield { reduced: alt, applied: true };
            return;
        }
        if (arg.name === '()') {
            yield { reduced: null, applied: true, deadEnd: true };
            return;
        }
    }

    // Handle grounded operations
    if (opName && ground.has(opName)) {
        let applied = false;
        for (const res of executeGroundedOpND(atom, opName, space, ground, limit)) {
            if (res.applied) {
                applied = true;
                cache?.set(atom, res.reduced);
                yield res;
            }
        }
        if (applied) return;
    }

    // Handle explicit grounded call (^)
    if (opName === '^' && comps?.[0]?.name && ground.has(comps[0].name)) {
        const op = comps[0].name;
        const args = comps.slice(1);
        let applied = false;
        for (const res of executeGroundedOpWithArgsND(atom, op, args, space, ground, limit)) {
            if (res.applied) {
                applied = true;
                cache?.set(atom, res.reduced);
                yield res;
            }
        }
        if (applied) return;
    }

    // Handle rule matching
    for (const rule of space.rulesFor(atom)) {
        if (!rule.pattern) continue;
        const bindings = Unify.unify(rule.pattern, atom);
        if (bindings) {
            yield {
                reduced: typeof rule.result === 'function'
                    ? rule.result(bindings)
                    : Unify.subst(rule.result, bindings),
                applied: true
            };
        }
    }
}

/**
 * Perform a single reduction step
 */
export const step = (atom, space, ground, limit, cache) => {
    const gen = stepYield(atom, space, ground, limit, cache);
    const { value, done } = gen.next();
    if (!done) {
        return value.deadEnd
            ? { reduced: exp(atom.operator || atom, []), applied: true }
            : value;
    }
    return { reduced: atom, applied: false };
};

// --- Helper Functions ---

/**
 * Execute a grounded operation with non-deterministic evaluation
 */
function* executeGroundedOpND(atom, opName, space, ground, limit) {
    const args = atom.components;

    // If operation is lazy, execute directly without reducing arguments
    if (ground.isLazy(opName)) {
        try {
            yield { reduced: ground.execute(opName, ...args), applied: true };
        } catch (e) {
            console.error('Lazy op error', opName, e);
        }
        return;
    }

    // Reduce arguments first to get all possible values
    const variants = args.map(arg => reduceND(arg, space, ground, limit));

    // If any argument has no results, return nothing
    if (variants.some(v => v.length === 0)) return;

    // Generate all combinations of argument values
    for (const combo of cartesianProduct(variants)) {
        try {
            yield { reduced: ground.execute(opName, ...combo), applied: true };
        } catch (e) {
            console.error('Grounded op error', opName, e);
        }
    }
}

/**
 * Execute a grounded operation with specific arguments
 */
function* executeGroundedOpWithArgsND(atom, opName, args, space, ground, limit) {
    if (ground.isLazy(opName)) {
        try {
            yield { reduced: ground.execute(opName, ...args), applied: true };
        } catch (e) {
            console.error('Lazy op args error', opName, e);
        }
        return;
    }

    const variants = args.map(arg => reduceND(arg, space, ground, limit));
    if (variants.some(v => v.length === 0)) return;

    for (const combo of cartesianProduct(variants)) {
        try {
            yield { reduced: ground.execute(opName, ...combo), applied: true };
        } catch (e) {
            console.error('Grounded op args error', opName, e);
        }
    }
}

/**
 * Generate Cartesian product of arrays
 */
function* cartesianProduct(arrays) {
    if (arrays.length === 0) {
        yield [];
        return;
    }

    const [head, ...tail] = arrays;
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

// --- Reduction Loop ---

/**
 * Perform full deterministic reduction
 */
export const reduce = (atom, space, ground, limit = 10000, cache = null) => {
    const ctx = { steps: 0, limit };
    const root = { phase: 'EXPAND', term: atom, results: null };
    const stack = [root];

    while (stack.length) {
        const frame = stack[stack.length - 1];

        if (frame.phase === 'EXPAND') {
            let curr = frame.term;
            // Apply reductions iteratively until no more can be applied
            while (ctx.steps < ctx.limit) {
                const { reduced, applied } = step(curr, space, ground, limit, cache);
                if (applied) {
                    curr = reduced;
                    ctx.steps++;
                    continue;
                }
                break;
            }

            frame.term = curr;
            if (ctx.steps >= limit) throw new Error(`Max steps (${limit}) exceeded`);

            if (!curr) {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                stack.pop();
                continue;
            }

            const isExpr = isExpression(curr);
            const op = curr.operator;
            const isReducibleOp = op && isExpression(op);
            const hasComps = isExpr && curr.components?.length > 0;

            if (isReducibleOp || hasComps) {
                frame.phase = 'REBUILD';
                frame.reduceOp = isReducibleOp;
                const len = hasComps ? curr.components.length : 0;
                frame.results = new Array(len + (isReducibleOp ? 1 : 0));

                // Push components onto stack for processing
                if (hasComps) {
                    for (let i = len - 1; i >= 0; i--) {
                        stack.push({
                            phase: 'EXPAND',
                            term: curr.components[i],
                            parent: frame,
                            index: i + (isReducibleOp ? 1 : 0)
                        });
                    }
                }
                // Push operator onto stack for processing
                if (isReducibleOp) {
                    stack.push({
                        phase: 'EXPAND',
                        term: op,
                        parent: frame,
                        index: 0
                    });
                }
            } else {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                stack.pop();
            }
        } else { // REBUILD phase
            const curr = frame.term;
            const reduceOp = frame.reduceOp;
            const newOp = reduceOp ? frame.results[0] : curr.operator;
            const newComps = reduceOp ? frame.results.slice(1) : frame.results;

            if (hasChanges(curr, newOp, newComps, reduceOp)) {
                ctx.steps++;
                frame.phase = 'EXPAND';
                frame.term = exp(newOp, newComps);
                frame.results = null;
            } else {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                else root.result = curr;
                stack.pop();
            }
        }
    }
    return root.result || root.term;
};

/**
 * Check if there are changes between current and new term
 */
const hasChanges = (curr, newOp, newComps, reduceOp) => {
    return (reduceOp && newOp !== curr.operator && !newOp.equals?.(curr.operator)) ||
           newComps.some((c, i) => c !== curr.components[i] && !c?.equals?.(curr.components[i]));
};

/**
 * Check if an atom is a grounded call
 */
export const isGroundedCall = (atom, ground) => {
    if (!isExpression(atom)) return false;
    const op = atom.operator?.name;
    return (op && ground.has(op)) ||
        (op === '^' && atom.components?.[0]?.name && ground.has(atom.components[0].name));
};

/**
 * Perform non-deterministic reduction
 */
export const reduceND = (atom, space, ground, limit = 100) => {
    const results = new Set();
    const visited = new Set();
    const queue = [{ atom, steps: 0 }];

    while (queue.length) {
        const { atom: curr, steps } = queue.shift();
        const str = curr.toString();

        // Avoid revisiting the same atom
        if (visited.has(str)) continue;
        visited.add(str);

        if (steps >= limit) {
            results.add(curr);
            continue;
        }

        let any = false;
        const reds = [...stepYield(curr, space, ground, limit)];

        if (reds.length) {
            for (const { reduced, deadEnd } of reds) {
                any = true;
                if (!deadEnd) queue.push({ atom: reduced, steps: steps + 1 });
            }
        } else if (isExpression(curr) && curr.components.length) {
            // If no direct reductions, try reducing subcomponents
            const sub = reduceSubcomponentsND(curr, space, ground, limit - steps);
            if (sub.length) {
                for (const expr of sub) {
                    if (!expr.equals(curr)) {
                        queue.push({ atom: expr, steps: steps + 1 });
                        any = true;
                    }
                }
            }
        }

        if (!any) results.add(curr);
    }

    return [...results];
};

/**
 * Reduce subcomponents of an expression
 */
const reduceSubcomponentsND = (expr, space, ground, limit) => {
    const { components: comps, operator: op } = expr;

    // Try reducing each component
    for (let i = 0; i < comps.length; i++) {
        const stepResults = [...stepYield(comps[i], space, ground, limit)];
        let variants = [];

        if (stepResults.length > 0) {
            variants = stepResults.filter(s => !s.deadEnd).map(s => s.reduced);
        } else if (isExpression(comps[i]) && comps[i].components.length) {
            variants = reduceSubcomponentsND(comps[i], space, ground, limit);
        }

        if (variants.length) {
            const res = [];
            for (const reduced of variants) {
                const newComps = [...comps];
                newComps[i] = reduced;
                res.push(exp(op, newComps));
            }
            if (res.length) return res;
        }
    }

    // Try reducing the operator if it's an expression
    if (op && isExpression(op)) {
        const vars = [...stepYield(op, space, ground, limit)];
        if (vars.length) {
            const res = [];
            for (const { reduced, deadEnd } of vars) {
                if (deadEnd) continue;
                res.push(exp(reduced, comps));
            }
            if (res.length) return res;
        }
    }
    return [];
};

/**
 * Match atoms in space against a pattern
 */
export const match = (space, pattern, template) => {
    const res = [];
    for (const cand of space.all()) {
        const bind = Unify.unify(pattern, cand);
        if (bind) res.push(Unify.subst(template, bind));
    }
    return res;
};

/**
 * Perform full deterministic reduction asynchronously
 * Supports grounded operations returning Promises
 */
export const reduceAsync = async (atom, space, ground, limit = 10000, cache = null) => {
    const ctx = { steps: 0, limit };
    const root = { phase: 'EXPAND', term: atom, results: null };
    const stack = [root];

    while (stack.length) {
        const frame = stack[stack.length - 1];

        if (frame.phase === 'EXPAND') {
            let curr = frame.term;
            // Apply reductions iteratively until no more can be applied
            while (ctx.steps < ctx.limit) {
                const { reduced: rawReduced, applied } = step(curr, space, ground, limit, cache);
                let reduced = rawReduced;

                if (reduced instanceof Promise) {
                    reduced = await reduced;
                }

                if (applied) {
                    curr = reduced;
                    ctx.steps++;
                    continue;
                }
                break;
            }

            frame.term = curr;
            if (ctx.steps >= limit) throw new Error(`Max steps (${limit}) exceeded`);

            if (!curr) {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                stack.pop();
                continue;
            }

            const isExpr = isExpression(curr);
            const op = curr.operator;
            const isReducibleOp = op && isExpression(op);
            const hasComps = isExpr && curr.components?.length > 0;

            if (isReducibleOp || hasComps) {
                frame.phase = 'REBUILD';
                frame.reduceOp = isReducibleOp;
                const len = hasComps ? curr.components.length : 0;
                frame.results = new Array(len + (isReducibleOp ? 1 : 0));

                // Push components onto stack for processing
                if (hasComps) {
                    for (let i = len - 1; i >= 0; i--) {
                        stack.push({
                            phase: 'EXPAND',
                            term: curr.components[i],
                            parent: frame,
                            index: i + (isReducibleOp ? 1 : 0)
                        });
                    }
                }
                // Push operator onto stack for processing
                if (isReducibleOp) {
                    stack.push({
                        phase: 'EXPAND',
                        term: op,
                        parent: frame,
                        index: 0
                    });
                }
            } else {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                stack.pop();
            }
        } else { // REBUILD phase
            const curr = frame.term;
            const reduceOp = frame.reduceOp;
            const newOp = reduceOp ? frame.results[0] : curr.operator;
            const newComps = reduceOp ? frame.results.slice(1) : frame.results;

            if (hasChanges(curr, newOp, newComps, reduceOp)) {
                ctx.steps++;
                frame.phase = 'EXPAND';
                frame.term = exp(newOp, newComps);
                frame.results = null;
            } else {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                else root.result = curr;
                stack.pop();
            }
        }
    }
    return root.result || root.term;
};

/**
 * Perform non-deterministic reduction asynchronously
 */
export const reduceNDAsync = async (atom, space, ground, limit = 100) => {
    const results = new Set();
    const visited = new Set();
    const queue = [{ atom, steps: 0 }];

    while (queue.length) {
        const { atom: curr, steps } = queue.shift();
        const str = curr.toString();

        if (visited.has(str)) continue;
        visited.add(str);

        if (steps >= limit) {
            results.add(curr);
            continue;
        }

        let any = false;
        const reds = [];
        // Handle stepYield being a generator, explicitly iterate
        for (const r of stepYield(curr, space, ground, limit)) {
            if (r.reduced instanceof Promise) {
                r.reduced = await r.reduced;
            }
            reds.push(r);
        }

        if (reds.length) {
            for (const { reduced, deadEnd } of reds) {
                any = true;
                if (!deadEnd) queue.push({ atom: reduced, steps: steps + 1 });
            }
        } else if (isExpression(curr) && curr.components.length) {
            const sub = await reduceSubcomponentsNDAsync(curr, space, ground, limit - steps);
            if (sub.length) {
                for (const expr of sub) {
                    if (!expr.equals(curr)) {
                        queue.push({ atom: expr, steps: steps + 1 });
                        any = true;
                    }
                }
            }
        }

        if (!any) results.add(curr);
    }

    return [...results];
};

/**
 * Reduce subcomponents of an expression asynchronously
 */
const reduceSubcomponentsNDAsync = async (expr, space, ground, limit) => {
    const { components: comps, operator: op } = expr;

    for (let i = 0; i < comps.length; i++) {
        const stepResults = [];
        for (const r of stepYield(comps[i], space, ground, limit)) {
            if (r.reduced instanceof Promise) {
                r.reduced = await r.reduced;
            }
            stepResults.push(r);
        }

        let variants = [];

        if (stepResults.length > 0) {
            variants = stepResults.filter(s => !s.deadEnd).map(s => s.reduced);
        } else if (isExpression(comps[i]) && comps[i].components.length) {
            variants = await reduceSubcomponentsNDAsync(comps[i], space, ground, limit);
        }

        if (variants.length) {
            const res = [];
            for (const reduced of variants) {
                const newComps = [...comps];
                newComps[i] = reduced;
                res.push(exp(op, newComps));
            }
            if (res.length) return res;
        }
    }

    if (op && isExpression(op)) {
        const vars = [];
        for (const r of stepYield(op, space, ground, limit)) {
            if (r.reduced instanceof Promise) {
                r.reduced = await r.reduced;
            }
            vars.push(r);
        }

        if (vars.length) {
            const res = [];
            for (const { reduced, deadEnd } of vars) {
                if (deadEnd) continue;
                res.push(exp(reduced, comps));
            }
            if (res.length) return res;
        }
    }
    return [];
};
