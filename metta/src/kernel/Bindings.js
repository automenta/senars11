import {Term} from './Term.js';

export const objToBindingsAtom = (bindings = {}) =>
    Term.exp('Bindings', Object.entries(bindings).map(([k, v]) => Term.exp('Pair', [Term.var(k), v])));

export const bindingsAtomToObj = (bindingsAtom) => {
    const bindings = {};
    if (bindingsAtom?.operator?.name === 'Bindings') {
        bindingsAtom.components.forEach(pair => {
            if (pair?.operator?.name === 'Pair' && pair.components.length === 2 && pair.components[0].name) {
                bindings[pair.components[0].name] = pair.components[1];
            }
        });
    }
    return bindings;
};
