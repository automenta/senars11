/**
 * ComparisonOps.js - Comparison operations
 */

import { OperationHelpers } from './OperationHelpers.js';

export function registerComparisonOps(registry) {
    const cmp = fn => (...args) => {
        const [a, b] = OperationHelpers.requireNums(args, 2);
        return OperationHelpers.bool(fn(a, b));
    };

    registry.register('&<', cmp((a, b) => a < b));
    registry.register('&>', cmp((a, b) => a > b));
    registry.register('&<=', cmp((a, b) => a <= b));
    registry.register('&>=', cmp((a, b) => a >= b));

    registry.register('&==', (a, b) => OperationHelpers.bool(a?.equals ? a.equals(b) : a === b));
    registry.register('&!=', (a, b) => OperationHelpers.bool(!(a?.equals ? a.equals(b) : a === b)));
}