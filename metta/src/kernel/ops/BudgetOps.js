/**
 * BudgetOps.js - Budget operations
 */

import { OperationHelpers } from './OperationHelpers.js';

export function registerBudgetOps(registry) {
    // Budget priority operations
    registry.register('&or-priority', (p1, p2) => {
        const [a, b] = OperationHelpers.requireNums([p1, p2], 2);
        return sym(String(Math.max(a, b)));
    });

    registry.register('&and-priority', (p1, p2) => {
        const [a, b] = OperationHelpers.requireNums([p1, p2], 2);
        return sym(String((a + b) / 2)); // Average for AND
    });

    registry.register('&max', (a, b) => {
        const [x, y] = OperationHelpers.requireNums([a, b], 2);
        return sym(String(Math.max(x, y)));
    });

    registry.register('&min', (a, b) => {
        const [x, y] = OperationHelpers.requireNums([a, b], 2);
        return sym(String(Math.min(x, y)));
    });

    // Conditional for clamping
    registry.register('&if', (cond, thenVal, elseVal) =>
        OperationHelpers.truthy(cond) ? thenVal : elseVal
    );
}