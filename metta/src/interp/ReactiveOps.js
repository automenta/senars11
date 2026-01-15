/**
 * ReactiveOps.js - Reactive operations
 */

import { Term } from '../kernel/Term.js';

export function registerReactiveOps(interpreter) {
    const { sym, exp } = Term;
    const reg = (n, fn, opts) => interpreter.ground.register(n, fn, opts);

    reg('&get-event-log', (sinceAtom) => {
        const since = sinceAtom ? (parseInt(sinceAtom.name) || 0) : 0;
        const log = interpreter.space.getEventLog?.(since) || [];

        return interpreter._listify(log.map(e => {
            let dataAtom = e.data;
            if (e.event === 'addRule') {
                // Convert rule object to (= pattern result)
                dataAtom = exp(sym('='), [e.data.pattern, e.data.result]);
            }

            return exp(sym('Event'), [
                sym(e.event),
                dataAtom,
                sym(String(e.timestamp))
            ]);
        }));
    }, { lazy: true });

    reg('&clear-event-log', () => {
        interpreter.space.clearEventLog?.();
        return sym('()');
    });
}