/**
 * MinimalOps.js - Minimal core operations
 */

import { Term } from '../kernel/Term.js';
import { Unify } from '../kernel/Unify.js';
import { step, reduce, reduceND } from '../kernel/Reduce.js';

export function registerMinimalOps(interpreter) {
    const { sym, exp, isExpression } = Term;
    const reg = (n, fn, opts) => interpreter.ground.register(n, fn, opts);

    // Register minimal core operations
    reg('eval', createEvalOp(interpreter), { lazy: true });
    reg('chain', createChainOp(interpreter), { lazy: true });
    reg('unify', createUnifyOp(interpreter), { lazy: true });
    reg('function', createFunctionOp(interpreter), { lazy: true });
    reg('return', createReturnOp(interpreter), { lazy: true });
    reg('collapse-bind', createCollapseBindOp(interpreter), { lazy: true });
    reg('superpose-bind', createSuperposeBindOp(interpreter), { lazy: true });
    reg('context-space', createContextSpaceOp(interpreter), { lazy: true });
    reg('noeval', createNoEvalOp(interpreter), { lazy: true });
}

/**
 * Create the eval operation
 */
function createEvalOp(interpreter) {
    return (atom) =>
        step(atom, interpreter.space, interpreter.ground, interpreter.config.maxReductionSteps, interpreter.memoCache).reduced;
}

/**
 * Create the chain operation
 */
function createChainOp(interpreter) {
    const { isExpression } = Term;

    return (atom, vari, templ) => {
        const res = reduce(atom, interpreter.space, interpreter.ground, interpreter.config.maxReductionSteps, interpreter.memoCache);
        return (res.name === 'Empty' || (isExpression(res) && res.operator?.name === 'Error'))
            ? res
            : Unify.subst(templ, { [vari.name]: res });
    };
}

/**
 * Create the unify operation
 */
function createUnifyOp(interpreter) {
    return (atom, pat, thenB, elseB) => {
        const b = Unify.unify(atom, pat);
        return b ? Unify.subst(thenB, b) : elseB;
    };
}

/**
 * Create the function operation
 */
function createFunctionOp(interpreter) {
    const { sym, exp, isExpression } = Term;

    return (body) => {
        let curr = body;
        const limit = interpreter.config.maxReductionSteps || 1000;

        for (let i = 0; i < limit; i++) {
            const res = step(curr, interpreter.space, interpreter.ground, limit, interpreter.memoCache);
            const red = res.reduced;

            if (isExpression(red) && red.operator?.name === 'return') {
                return red.components[0] || sym('()');
            }

            if (red === curr || red.equals?.(curr)) break;
            if (!res.applied) break;

            curr = red;
        }

        return exp(sym('Error'), [body, sym('NoReturn')]);
    };
}

/**
 * Create the return operation
 */
function createReturnOp(interpreter) {
    const { sym, exp } = Term;

    return (val) => exp(sym('return'), [val]);
}

/**
 * Create the collapse-bind operation
 */
function createCollapseBindOp(interpreter) {
    return (atom) =>
        interpreter._listify(reduceND(atom, interpreter.space, interpreter.ground, interpreter.config.maxReductionSteps));
}

/**
 * Create the superpose-bind operation
 */
function createSuperposeBindOp(interpreter) {
    const { sym, exp } = Term;

    return (collapsed) => {
        const items = interpreter.ground._flattenExpr(collapsed);
        return items.length === 1 ? items[0] : exp(sym('superpose'), items);
    };
}

/**
 * Create the context-space operation
 */
function createContextSpaceOp(interpreter) {
    return () => interpreter.space;
}

/**
 * Create the noeval operation
 */
function createNoEvalOp(interpreter) {
    return (atom) => atom;
}