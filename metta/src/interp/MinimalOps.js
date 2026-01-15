/**
 * MinimalOps.js - Minimal core operations
 */

import { Term } from '../kernel/Term.js';
import { step, reduce, reduceND } from '../kernel/Reduce.js';

export function registerMinimalOps(interpreter) {
    const { sym, exp, isExpression } = Term;
    const reg = (n, fn, opts) => interpreter.ground.register(n, fn, opts);

    reg('eval', (atom) =>
        step(atom, interpreter.space, interpreter.ground, interpreter.config.maxReductionSteps, interpreter.memoCache).reduced,
        { lazy: true }
    );

    reg('chain', (atom, vari, templ) => {
        const res = reduce(atom, interpreter.space, interpreter.ground, interpreter.config.maxReductionSteps, interpreter.memoCache);
        return (res.name === 'Empty' || (isExpression(res) && res.operator?.name === 'Error'))
            ? res
            : Unify.subst(templ, { [vari.name]: res });
    }, { lazy: true });

    reg('unify', (atom, pat, thenB, elseB) => {
        const b = Unify.unify(atom, pat);
        return b ? Unify.subst(thenB, b) : elseB;
    }, { lazy: true });

    reg('function', (body) => {
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
    }, { lazy: true });

    reg('return', (val) => exp(sym('return'), [val]), { lazy: true });

    reg('collapse-bind', (atom) =>
        interpreter._listify(reduceND(atom, interpreter.space, interpreter.ground, interpreter.config.maxReductionSteps)),
        { lazy: true }
    );

    reg('superpose-bind', (collapsed) => {
        const items = interpreter.ground._flattenExpr(collapsed);
        return items.length === 1 ? items[0] : exp(sym('superpose'), items);
    });

    reg('context-space', () => interpreter.space, { lazy: true });
    reg('noeval', (atom) => atom, { lazy: true });
}