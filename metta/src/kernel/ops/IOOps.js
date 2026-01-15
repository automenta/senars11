/**
 * IOOps.js - I/O operations
 */

import { sym } from '../../kernel/Term.js';

export function registerIOOps(registry) {
    registry.register('&print', (...args) => {
        console.log(args.map(a => a?.name ?? String(a)).join(' '));
        return args.length === 1 ? args[0] : sym('Null');
    });
    registry.register('&println', (...args) => {
        console.log(...args.map(a => a?.name ?? String(a)));
        return sym('()');
    });
}