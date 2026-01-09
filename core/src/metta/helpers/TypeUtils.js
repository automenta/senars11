/**
 * TypeUtils.js - Common type definitions and helpers
 */

let typeVarCounter = 0;
export const freshTypeVar = () => ({ kind: 'TypeVar', id: typeVarCounter++ });

export const TypeConstructors = {
    Arrow: (from, to) => ({ kind: 'Arrow', from, to }),
    List: (elemType) => ({ kind: 'List', elemType }),
    Maybe: (elemType) => ({ kind: 'Maybe', elemType }),
    Either: (left, right) => ({ kind: 'Either', left, right }),
    Vector: (length) => ({ kind: 'Vector', length }),
    Forall: (varName, type) => ({ kind: 'Forall', var: varName, type }),
    Number: { kind: 'Number' },
    String: { kind: 'String' },
    Bool: { kind: 'Bool' },
    Atom: { kind: 'Atom' }
};
