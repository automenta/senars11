/**
 * ArithmeticOps.js - Arithmetic operations
 */

import { sym } from '../../kernel/Term.js';
import { OperationHelpers } from './OperationHelpers.js';

export function registerArithmeticOps(registry) {
    const reduceOp = (fn, init) => (...args) => {
        if (args.length === 0) return sym(String(init));
        const nums = OperationHelpers.requireNums(args);
        return sym(String(nums.reduce(fn, init === undefined ? nums.shift() : init)));
    };

    const binaryOp = (fn, checkZero = false) => (...args) => {
        const [a, b] = OperationHelpers.requireNums(args, 2);
        if (checkZero && b === 0) throw new Error("Division by zero");
        return sym(String(fn(a, b)));
    };

    registry.register('&+', reduceOp((a, b) => a + b, 0));
    registry.register('&*', reduceOp((a, b) => a * b, 1));
    registry.register('&%', binaryOp((a, b) => a % b, true)); // Check division by zero

    // Custom logic for - and / to handle unary/binary
    registry.register('&-', (...args) => {
        const nums = OperationHelpers.requireNums(args);
        if (nums.length === 1) return sym(String(-nums[0]));
        if (nums.length === 2) return sym(String(nums[0] - nums[1]));
        throw new Error("&- requires 1 or 2 args");
    });

    registry.register('&/', (...args) => {
        const nums = OperationHelpers.requireNums(args);
        if (nums.length === 1) return sym(String(1 / nums[0]));
        if (nums.length === 2) {
            if (nums[1] === 0) throw new Error("Division by zero");
            return sym(String(nums[0] / nums[1]));
        }
        throw new Error("&/ requires 1 or 2 args");
    });
}