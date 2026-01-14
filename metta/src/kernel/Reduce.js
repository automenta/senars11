/**
 * Reduce.js - Evaluation Engine
 * Core single-step rewriting and full reduction logic.
 */

import { isExpression, exp } from './Term.js';
import { Unify } from './Unify.js';

// --- Generators & Single Step ---

export function* stepYield(atom, space, ground, limit = 10000, cache = null) {
    if (!isExpression(atom)) return;

    const cached = cache?.get?.(atom);
    if (cached !== undefined) {
        yield { reduced: cached, applied: true };
        return;
    }

    const opName = atom.operator?.name;
    const comps = atom.components;

    // Superpose
    if (opName === 'superpose' && comps?.length > 0) {
        const arg = comps[0];
        if (isExpression(arg)) {
            const alts = flattenList(arg);
            if (alts.length === 0) { yield { reduced: null, applied: true, deadEnd: true }; return; }
            for (const alt of alts) yield { reduced: alt, applied: true };
            return;
        }
        if (arg.name === '()') { yield { reduced: null, applied: true, deadEnd: true }; return; }
    }

    // Grounded Ops
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

    // Explicit Grounded Call (^)
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

    // Rule Matching
    for (const rule of space.rulesFor(atom)) {
        if (!rule.pattern) continue;
        const bindings = Unify.unify(rule.pattern, atom);
        if (bindings) {
            yield {
                reduced: typeof rule.result === 'function' ? rule.result(bindings) : Unify.subst(rule.result, bindings),
                applied: true
            };
        }
    }
}

export const step = (atom, space, ground, limit, cache) => {
    const gen = stepYield(atom, space, ground, limit, cache);
    const { value, done } = gen.next();
    if (!done) return value.deadEnd ? { reduced: exp(atom.operator || atom, []), applied: true } : value;
    return { reduced: atom, applied: false };
};

// --- Helpers ---

const flattenList = (expr) => {
    const res = [];
    let cur = expr;
    while (isExpression(cur) && cur.operator?.name === ':') {
        if (cur.components?.length > 0) res.push(cur.components[0]);
        cur = cur.components?.[1];
        if (!cur) break;
    }
    if (isExpression(cur) && cur.operator?.name !== ':') {
        if (cur.name === '()' || (Array.isArray(cur.components) && cur.components.length === 0 && !cur.operator)) return res;
        if (cur.operator) res.push(cur.operator);
        if (cur.components) res.push(...cur.components);
        return res;
    }
    if (res.length > 0) return res;
    return expr.name !== '()' ? [expr] : [];
};

function* executeGroundedOpND(atom, opName, space, ground, limit) {
    const args = atom.components;
    if (ground.isLazy(opName)) {
        try { yield { reduced: ground.execute(opName, ...args), applied: true }; } catch (e) { console.error('Lazy op error', opName, e); }
        return;
    }

    const variants = args.map(arg => reduceND(arg, space, ground, limit));
    if (variants.some(v => v.length === 0)) return;

    for (const combo of cartesianProduct(variants)) {
        try { yield { reduced: ground.execute(opName, ...combo), applied: true }; } catch (e) { console.error('Grounded op error', opName, e); }
    }
}

function* executeGroundedOpWithArgsND(atom, opName, args, space, ground, limit) {
    if (ground.isLazy(opName)) {
        try { yield { reduced: ground.execute(opName, ...args), applied: true }; } catch (e) { console.error('Lazy op args error', opName, e); }
        return;
    }

    const variants = args.map(arg => reduceND(arg, space, ground, limit));
    if (variants.some(v => v.length === 0)) return;

    for (const combo of cartesianProduct(variants)) {
        try { yield { reduced: ground.execute(opName, ...combo), applied: true }; } catch (e) { console.error('Grounded op args error', opName, e); }
    }
}

function* cartesianProduct(arrays) {
    if (arrays.length === 0) { yield []; return; }
    const [head, ...tail] = arrays;
    for (const h of head) {
        if (tail.length === 0) yield [h];
        else for (const t of cartesianProduct(tail)) yield [h, ...t];
    }
}

// --- Reduction Loop ---

export const reduce = (atom, space, ground, limit = 10000, cache = null) => {
    const ctx = { steps: 0, limit };
    const root = { phase: 'EXPAND', term: atom, results: null };
    const stack = [root];

    while (stack.length) {
        const frame = stack[stack.length - 1];

        if (frame.phase === 'EXPAND') {
            let curr = frame.term;
            while (ctx.steps < ctx.limit) {
                const { reduced, applied } = step(curr, space, ground, limit, cache);
                if (applied) { curr = reduced; ctx.steps++; continue; }
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

                if (hasComps) {
                    for (let i = len - 1; i >= 0; i--) {
                        stack.push({ phase: 'EXPAND', term: curr.components[i], parent: frame, index: i + (isReducibleOp ? 1 : 0) });
                    }
                }
                if (isReducibleOp) {
                    stack.push({ phase: 'EXPAND', term: op, parent: frame, index: 0 });
                }
            } else {
                if (frame.parent) frame.parent.results[frame.index] = curr;
                stack.pop();
            }
        } else { // REBUILD
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

const hasChanges = (curr, newOp, newComps, reduceOp) => {
    if (reduceOp && newOp !== curr.operator && !newOp.equals?.(curr.operator)) return true;
    return newComps.some((c, i) => c !== curr.components[i] && !c?.equals?.(curr.components[i]));
};

export const isGroundedCall = (atom, ground) => {
    if (!isExpression(atom)) return false;
    const op = atom.operator?.name;
    return (op && ground.has(op)) || (op === '^' && atom.components?.[0]?.name && ground.has(atom.components[0].name));
};

export const reduceND = (atom, space, ground, limit = 100) => {
    const results = new Set();
    const visited = new Set();
    const queue = [{ atom, steps: 0 }];

    while (queue.length) {
        const { atom: curr, steps } = queue.shift();
        const str = curr.toString();
        if (visited.has(str)) continue;
        visited.add(str);

        if (steps >= limit) { results.add(curr); continue; }

        let any = false;
        const reds = [...stepYield(curr, space, ground, limit)];

        if (reds.length) {
            for (const { reduced, deadEnd } of reds) {
                any = true;
                if (!deadEnd) queue.push({ atom: reduced, steps: steps + 1 });
            }
        } else if (isExpression(curr) && curr.components.length) {
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

const reduceSubcomponentsND = (expr, space, ground, limit) => {
    const { components: comps, operator: op } = expr;

    // Reduce components
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

    // Reduce operator
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

export const match = (space, pattern, template) => {
    const res = [];
    for (const cand of space.all()) {
        const bind = Unify.unify(pattern, cand);
        if (bind) res.push(Unify.subst(template, bind));
    }
    return res;
};
