/**
 * SpaceOps.js - Space operations
 */

import { OperationHelpers } from './OperationHelpers.js';
import { Space } from '../Space.js';
import { match } from '../Reduce.js';
import { sym, exp } from '../Term.js';

export function registerSpaceOps(registry, interpreterContext) {
    registry.register('&add-atom', (s, a) => {
        s.add(a);
        return a;
    });
    registry.register('&rm-atom', (s, a) => s.remove(a));
    registry.register('&get-atoms', s => OperationHelpers.listify(s.all()));

    // NEW: Create isolated space
    registry.register('new-space', () => {
        const newSpace = new Space();
        const id = `space-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (interpreterContext && interpreterContext.spaces) {
            interpreterContext.spaces.set(id, newSpace);
        }
        return sym(id);
    });

    // NEW: Add atom to specific space
    registry.register('add-atom-to', (spaceId, atom) => {
        if (!interpreterContext || !interpreterContext.spaces) return exp(sym('Error'), [spaceId, sym('NoContext')]);
        const space = interpreterContext.spaces.get(spaceId.name);
        if (!space) return exp(sym('Error'), [spaceId, sym('SpaceNotFound')]);
        space.add(atom);
        return sym('ok');
    });

    // NEW: Match in specific space
    registry.register('match-in', (spaceId, pattern, template) => {
        if (!interpreterContext || !interpreterContext.spaces) return exp(sym('Error'), [spaceId, sym('NoContext')]);
        const space = interpreterContext.spaces.get(spaceId.name);
        if (!space) return exp(sym('Error'), [spaceId, sym('SpaceNotFound')]);
        return OperationHelpers.listify(match(space, pattern, template));
    }, { lazy: true });

    // NEW: Merge spaces
    registry.register('merge-spaces', (sourceId, targetId) => {
        if (!interpreterContext || !interpreterContext.spaces) return exp(sym('Error'), [sym('NoContext')]);
        const source = interpreterContext.spaces.get(sourceId.name);
        const target = interpreterContext.spaces.get(targetId.name);
        if (!source || !target) return exp(sym('Error'), [sym('SpaceNotFound')]);
        for (const atom of source.all()) target.add(atom);
        return sym('ok');
    });
}
