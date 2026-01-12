import {Tensor} from '@senars/tensor/src/Tensor.js';

/**
 * Checks the gradient of a unary operation numerically.
 * @param {Object} backend - The tensor backend
 * @param {Function} op - The operation to test (e.g., backend.sigmoid)
 * @param {Tensor} inputTensor - The input tensor
 * @param {number} eps - Epsilon for numerical differentiation
 * @param {number} tolerance - Tolerance for comparison
 */
export function checkUnaryGradient(backend, op, inputTensor, eps = 1e-4, tolerance = 1e-3) {
    // Forward and backward for analytical gradient
    const y = op.call(backend, inputTensor);
    y.backward();
    const analytical = inputTensor.grad.data[0];

    // Numerical gradient: (f(x+ε) - f(x-ε)) / 2ε
    const xPlus = new Tensor([inputTensor.data[0] + eps], {backend});
    const xMinus = new Tensor([inputTensor.data[0] - eps], {backend});

    // We need to bind the op to backend if it's a method, or call it directly
    const fPlus = op.call(backend, xPlus).data[0];
    const fMinus = op.call(backend, xMinus).data[0];

    const numerical = (fPlus - fMinus) / (2 * eps);

    expect(analytical).toBeCloseTo(numerical, -Math.log10(tolerance));
}

/**
 * Checks the gradient of a binary operation numerically with respect to the first argument.
 * @param {Object} backend - The tensor backend
 * @param {Function} op - The operation to test (e.g., backend.mul)
 * @param {Tensor} a - The first input tensor (target for gradient check)
 * @param {Tensor} b - The second input tensor (constant)
 * @param {number} eps - Epsilon for numerical differentiation
 * @param {number} tolerance - Tolerance for comparison
 */
export function checkBinaryGradientA(backend, op, a, b, eps = 1e-4, tolerance = 1e-3) {
    // Forward and backward
    const y = op.call(backend, a, b);
    y.backward();
    const analytical = a.grad.data[0];

    // Numerical
    const aPlus = new Tensor([a.data[0] + eps], {backend});
    const aMinus = new Tensor([a.data[0] - eps], {backend});

    // Create copies of b to avoid side effects if op modifies in place (unlikely but safe)
    // For simple ops we can reuse b usually, but let's be safe if b is a tensor

    const fPlus = op.call(backend, aPlus, b).data[0];
    const fMinus = op.call(backend, aMinus, b).data[0];

    const numerical = (fPlus - fMinus) / (2 * eps);

    expect(analytical).toBeCloseTo(numerical, -Math.log10(tolerance));
}
