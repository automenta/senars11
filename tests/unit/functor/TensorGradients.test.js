import { describe, test, expect, beforeEach } from '@jest/globals';
import { Tensor } from '../../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../../core/src/functor/backends/NativeBackend.js';

describe('Tensor Gradients (Autograd)', function () {
    let backend;

    beforeEach(function () {
        backend = new NativeBackend();
    });

    describe('binary operations', function () {
        test('scalar multiplication gradient', function () {
            const a = new Tensor([2], { requiresGrad: true, backend });
            const b = new Tensor([3], { requiresGrad: true, backend });
            const c = backend.mul(a, b);  // c = 6

            c.backward();

            // ∂c/∂a = b = 3, ∂c/∂b = a = 2
            expect(a.grad.data[0]).toBeCloseTo(3);
            expect(b.grad.data[0]).toBeCloseTo(2);
        });

        test('scalar addition gradient', function () {
            const a = new Tensor([5], { requiresGrad: true, backend });
            const b = new Tensor([10], { requiresGrad: true, backend });
            const c = backend.add(a, b);  // c = 15

            c.backward();

            // ∂c/∂a = 1, ∂c/∂b = 1
            expect(a.grad.data[0]).toBeCloseTo(1);
            expect(b.grad.data[0]).toBeCloseTo(1);
        });

        test('scalar subtraction gradient', function () {
            const a = new Tensor([10], { requiresGrad: true, backend });
            const b = new Tensor([3], { requiresGrad: true, backend });
            const c = backend.sub(a, b);  // c = 7

            c.backward();

            // ∂c/∂a = 1, ∂c/∂b = -1
            expect(a.grad.data[0]).toBeCloseTo(1);
            expect(b.grad.data[0]).toBeCloseTo(-1);
        });

        test('scalar division gradient', function () {
            const a = new Tensor([6], { requiresGrad: true, backend });
            const b = new Tensor([2], { requiresGrad: true, backend });
            const c = backend.div(a, b);  // c = 3

            c.backward();

            // ∂c/∂a = 1/b = 0.5, ∂c/∂b = -a/b² = -1.5
            expect(a.grad.data[0]).toBeCloseTo(0.5);
            expect(b.grad.data[0]).toBeCloseTo(-1.5);
        });

        test('matrix multiplication gradient', function () {
            const W = new Tensor([[1, 2], [3, 4]], { requiresGrad: true, backend });
            const x = new Tensor([[5], [6]], { requiresGrad: true, backend });
            const y = backend.matmul(W, x);  // 2x1

            y.backward();

            // Check shapes
            expect(W.grad.shape).toEqual([2, 2]);
            expect(x.grad.shape).toEqual([2, 1]);

            // Check gradient values
            // ∂y/∂W = x^T (outer product with gradient)
            // Since grad(y) = [1, 1]^T and x = [5, 6]^T
            expect(W.grad.data[0]).toBeCloseTo(5);  // [0,0]
            expect(W.grad.data[1]).toBeCloseTo(6);  // [0,1]
            expect(W.grad.data[2]).toBeCloseTo(5);  // [1,0]
            expect(W.grad.data[3]).toBeCloseTo(6);  // [1,1]
        });
    });

    describe('activation gradients', function () {
        test('relu gradient mask', function () {
            const a = new Tensor([-1, 0, 1], { requiresGrad: true, backend });
            const b = backend.relu(a);

            b.backward();

            // Gradient only flows through positive values
            expect(a.grad.toArray()).toEqual([0, 0, 1]);
        });

        test('sigmoid gradient at zero', function () {
            const a = new Tensor([0], { requiresGrad: true, backend });
            const b = backend.sigmoid(a);

            b.backward();

            // σ'(0) = σ(0) * (1 - σ(0)) = 0.5 * 0.5 = 0.25
            expect(a.grad.data[0]).toBeCloseTo(0.25);
        });

        test('tanh gradient at zero', function () {
            const a = new Tensor([0], { requiresGrad: true, backend });
            const b = backend.tanh(a);

            b.backward();

            // tanh'(0) = 1 - tanh²(0) = 1 - 0 = 1
            expect(a.grad.data[0]).toBeCloseTo(1.0);
        });
    });

    describe('reduction gradients', function () {
        test('sum broadcasts gradient', function () {
            const a = new Tensor([1, 2, 3], { requiresGrad: true, backend });
            const b = backend.sum(a);  // b = 6

            b.backward();

            // Gradient is broadcast: all elements get 1
            expect(a.grad.toArray()).toEqual([1, 1, 1]);
        });

        test('mean divides gradient by size', function () {
            const a = new Tensor([2, 4, 6], { requiresGrad: true, backend });
            const b = backend.mean(a);  // b = 4

            b.backward();

            // Gradient is divided by size: all elements get 1/3
            expect(a.grad.data[0]).toBeCloseTo(1 / 3);
            expect(a.grad.data[1]).toBeCloseTo(1 / 3);
            expect(a.grad.data[2]).toBeCloseTo(1 / 3);
        });
    });

    describe('numerical gradient checking', function () {
        test('verify analytical gradient with numerical (quadratic)', function () {
            const eps = 1e-4;
            const x = new Tensor([2.0], { requiresGrad: true, backend });

            // f(x) = x²
            const y = backend.mul(x, x);
            y.backward();
            const analytical = x.grad.data[0];

            // Numerical: (f(x+ε) - f(x-ε)) / 2ε
            const xPlus = new Tensor([2.0 + eps], { backend });
            const xMinus = new Tensor([2.0 - eps], { backend });
            const fPlus = backend.mul(xPlus, xPlus).data[0];
            const fMinus = backend.mul(xMinus, xMinus).data[0];
            const numerical = (fPlus - fMinus) / (2 * eps);

            // f'(x) = 2x = 4 at x=2
            expect(analytical).toBeCloseTo(4.0, 5);
            expect(analytical).toBeCloseTo(numerical, 2);
        });

        test('numerical gradient for sigmoid', function () {
            const eps = 1e-5;
            const x = new Tensor([1.0], { requiresGrad: true, backend });

            const y = backend.sigmoid(x);
            y.backward();
            const analytical = x.grad.data[0];

            // Numerical gradient
            const xPlus = new Tensor([1.0 + eps], { backend });
            const xMinus = new Tensor([1.0 - eps], { backend });
            const fPlus = backend.sigmoid(xPlus).data[0];
            const fMinus = backend.sigmoid(xMinus).data[0];
            const numerical = (fPlus - fMinus) / (2 * eps);

            expect(analytical).toBeCloseTo(numerical, 4);
        });
    });

    describe('computation graph', function () {
        test('simple MLP forward and backward', function () {
            const x = new Tensor([[1, 2]], { backend });
            const W1 = new Tensor([[0.1, 0.2], [0.3, 0.4]], { requiresGrad: true, backend });
            const W2 = new Tensor([[0.5], [0.6]], { requiresGrad: true, backend });

            // Forward: x -> W1 -> ReLU -> W2
            const h = backend.relu(backend.matmul(x, W1));  // 1x2
            const y = backend.matmul(h, W2);  // 1x1

            // Backward
            y.backward();

            // Verify gradients exist and have correct shapes
            expect(W1.grad).not.toBeNull();
            expect(W1.grad.shape).toEqual([2, 2]);
            expect(W2.grad).not.toBeNull();
            expect(W2.grad.shape).toEqual([2, 1]);
        });

        test('gradient accumulation across multiple paths', function () {
            const x = new Tensor([3], { requiresGrad: true, backend });

            // y = x * x + x * 2
            const x_squared = backend.mul(x, x);
            const x_times_two = backend.mul(x, new Tensor([2], { backend }));
            const y = backend.add(x_squared, x_times_two);

            y.backward();

            // dy/dx = 2x + 2 = 8 at x=3
            expect(x.grad.data[0]).toBeCloseTo(8.0);
        });

        test('zeroGrad clears gradients', function () {
            const x = new Tensor([5], { requiresGrad: true, backend });
            const y = backend.mul(x, x);

            y.backward();
            expect(x.grad).not.toBeNull();

            x.zeroGrad();
            expect(x.grad).toBeNull();
        });
    });

    describe('training example', function () {
        test('simple linear regression converges', function () {
            // Data: y = 2x
            const X = new Tensor([[1], [2], [3], [4]], { backend });
            const y_true = new Tensor([[2], [4], [6], [8]], { backend });

            // Parameters (learnable)
            const W = new Tensor([[0.5]], { requiresGrad: true, backend });

            const lr = 0.05;  // Learning rate

            for (let epoch = 0; epoch < 30; epoch++) {
                // Forward pass: y_pred = X @ W
                const y_pred = backend.matmul(X, W);

                // Loss: MSE = mean((y_pred - y_true)²)
                const diff = backend.sub(y_pred, y_true);
                const squared = backend.mul(diff, diff);
                const loss = backend.mean(squared);

                // Backward pass
                W.zeroGrad();
                loss.backward();

                // SGD update: W -= lr * ∇W
                W.data[0] -= lr * W.grad.data[0];
            }

            // W should converge to ~2.0
            expect(W.data[0]).toBeCloseTo(2.0, 1);
        });
    });
});
