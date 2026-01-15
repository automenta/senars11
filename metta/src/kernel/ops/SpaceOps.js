/**
 * SpaceOps.js - Space operations
 */

import { OperationHelpers } from './OperationHelpers.js';

export function registerSpaceOps(registry) {
    registry.register('&add-atom', (s, a) => {
        s.add(a);
        return a;
    });
    registry.register('&rm-atom', (s, a) => s.remove(a));
    registry.register('&get-atoms', s => OperationHelpers.listify(s.all()));
}