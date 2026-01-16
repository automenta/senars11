import { sym, exp } from '../Term.js';

const stateRegistry = new Map();
let stateIdCounter = 0;

export function registerStateOps(registry) {
    registry.register('new-state', (initialValue) => {
        const id = `state-${++stateIdCounter}`;
        stateRegistry.set(id, { value: initialValue, version: 0 });
        return exp(sym('State'), [sym(id)]);
    });

    registry.register('get-state', (stateAtom) => {
        if (stateAtom.operator?.name !== 'State') {
            return exp(sym('Error'), [stateAtom, sym('NotAState')]);
        }
        const id = stateAtom.components[0].name;
        const state = stateRegistry.get(id);
        return state ? state.value : sym('Empty');
    });

    registry.register('change-state!', (stateAtom, newValue) => {
        if (stateAtom.operator?.name !== 'State') {
            return exp(sym('Error'), [stateAtom, sym('NotAState')]);
        }
        const id = stateAtom.components[0].name;
        const state = stateRegistry.get(id);
        if (!state) return exp(sym('Error'), [stateAtom, sym('StateNotFound')]);
        state.value = newValue;
        state.version++;
        return newValue;
    });

    registry.register('with-transaction', (stateAtom, operation) => {
        const id = stateAtom.components?.[0]?.name;
        const state = stateRegistry.get(id);
        if (!state) return exp(sym('Error'), [stateAtom, sym('StateNotFound')]);

        const snapshot = { ...state };
        try {
            return registry.execute(operation.operator?.name, ...operation.components);
        } catch (e) {
            stateRegistry.set(id, snapshot);
            return exp(sym('Error'), [sym('TransactionFailed'), sym(e.message)]);
        }
    }, { lazy: true });

    registry.register('state-version', (stateAtom) => {
        const id = stateAtom.components?.[0]?.name;
        const state = stateRegistry.get(id);
        return state ? sym(String(state.version)) : sym('0');
    });
}
