/**
 * DeterministicReduction.js - Deterministic reduction functions
 */

import { isExpression, exp } from '../../kernel/Term.js';

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
                const { reduced, applied } = stepInternal(curr, space, ground, limit, cache);
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
                const { reduced: rawReduced, applied } = stepInternal(curr, space, ground, limit, cache);
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

// Internal functions that will be imported from StepFunctions
// These are placeholders that will be replaced when the modules are properly connected
let stepInternal = null;
let stepYieldInternal = null;

// This function is used to set the internal references once all modules are loaded
export const setInternalReferences = (stepFunc, stepYieldFunc) => {
    stepInternal = stepFunc;
    stepYieldInternal = stepYieldFunc;
};

// Export the reduce function for internal use by other modules
// Note: These functions are already exported at the bottom of the file, so we don't need to re-export them here