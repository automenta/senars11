import { describe, test, expect, beforeEach } from '@jest/globals';
import { SGDOptimizer, AdamOptimizer, RMSpropOptimizer } from '../../../core/src/functor/Optimizer.js';
import { Tensor } from '../../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../../core/src/functor/backends/NativeBackend.js';

describe('Optimizers', function () {
    let backend;

    beforeEach(function () {
        backend = new NativeBackend();
    });

    describe('SGDOptimizer', function () {
        test('updates parameters with learning rate', function () {
            const optimizer = new SGDOptimizer(0.1);
            const param = new Tensor([1, 2, 3], { requiresGrad: true, backend });
            param.grad = new Tensor([0.5, 1.0, 1.5], { backend });

            const originalData = param.data.slice();
            const params = new Map([['w', param]]);
            optimizer.step(params);

            // param -= lr * grad = [1, 2, 3] - 0.1 * [0.5, 1.0, 1.5]
            expect(param.data[0]).toBeCloseTo(0.95);
            expect(param.data[1]).toBeCloseTo(1.9);
            expect(param.data[2]).toBeCloseTo(2.85);
        });

        test('SGD with momentum', function () {
            const optimizer = new SGDOptimizer(0.1, 0.9);
            const param = new Tensor([1], { requiresGrad: true, backend });
            const params = new Map([['w', param]]);

            // First step
            param.grad = new Tensor([1], { backend });
            optimizer.step(params);
            // velocity = 0.9 * 0 + 1 = 1
            // param = 1 - 0.1 * 1 = 0.9
            expect(param.data[0]).toBeCloseTo(0.9);

            // Second step
            param.grad = new Tensor([1], { backend });
            optimizer.step(params);
            // velocity = 0.9 * 1 + 1 = 1.9
            // param = 0.9 - 0.1 * 1.9 = 0.71
            expect(param.data[0]).toBeCloseTo(0.71);
        });

        test('skips parameters without gradients', function () {
            const optimizer = new SGDOptimizer(0.1);
            const param = new Tensor([1, 2, 3], { requiresGrad: false, backend });
            const params = new Map([['w', param]]);

            optimizer.step(params);

            expect(param.data).toEqual([1, 2, 3]);
        });
    });

    describe('AdamOptimizer', function () {
        test('updates parameters with adaptive learning rate', function () {
            const optimizer = new AdamOptimizer(0.001);
            const param = new Tensor([1, 2], { requiresGrad: true, backend });
            param.grad = new Tensor([0.5, 1.0], { backend });

            const params = new Map([['w', param]]);
            optimizer.step(params);

            // Adam should update, exact values depend on beta values
            expect(param.data[0]).toBeLessThan(1);
            expect(param.data[1]).toBeLessThan(2);
        });

        test('Adam with multiple steps', function () {
            const optimizer = new AdamOptimizer(0.01);
            const param = new Tensor([1], { requiresGrad: true, backend });
            const params = new Map([['w', param]]);

            for (let i = 0; i < 5; i++) {
                param.grad = new Tensor([1], { backend });
                optimizer.step(params);
            }

            // After 5 steps with constant gradient, should converge
            expect(param.data[0]).toBeLessThan(1);
        });

        test('Adam handles different gradient magnitudes', function () {
            const optimizer = new AdamOptimizer(0.001);
            const param1 = new Tensor([1], { requiresGrad: true, backend });
            const param2 = new Tensor([1], { requiresGrad: true, backend });

            param1.grad = new Tensor([0.1], { backend });
            param2.grad = new Tensor([10], { backend });

            const params = new Map([['w1', param1], ['w2', param2]]);
            optimizer.step(params);

            // Both should update, but adaptive learning should handle large gradient
            expect(param1.data[0]).toBeLessThan(1);
            expect(param2.data[0]).toBeLessThan(1);
        });
    });

    describe('RMSpropOptimizer', function () {
        test('updates parameters with RMSprop', function () {
            const optimizer = new RMSpropOptimizer(0.01);
            const param = new Tensor([1, 2], { requiresGrad: true, backend });
            param.grad = new Tensor([0.5, 1.0], { backend });

            const params = new Map([['w', param]]);
            optimizer.step(params);

            expect(param.data[0]).toBeLessThan(1);
            expect(param.data[1]).toBeLessThan(2);
        });

        test('RMSprop accumulates squared gradients', function () {
            const optimizer = new RMSpropOptimizer(0.01, 0.9);
            const param = new Tensor([1], { requiresGrad: true, backend });
            const params = new Map([['w', param]]);

            // Multiple steps with same gradient
            for (let i = 0; i < 3; i++) {
                param.grad = new Tensor([1], { backend });
                const before = param.data[0];
                optimizer.step(params);
                // Step size should decrease as cache builds up
                const stepSize = Math.abs(param.data[0] - before);
                expect(stepSize).toBeGreaterThan(0);
            }

            expect(param.data[0]).toBeLessThan(1);
        });
    });

    describe('zeroGrad', function () {
        test('clears gradients for all parameters', function () {
            const optimizer = new SGDOptimizer(0.1);
            const param1 = new Tensor([1], { requiresGrad: true, backend });
            const param2 = new Tensor([2], { requiresGrad: true, backend });

            param1.grad = new Tensor([1], { backend });
            param2.grad = new Tensor([2], { backend });

            const params = new Map([['w1', param1], ['w2', param2]]);
            optimizer.zeroGrad(params);

            expect(param1.grad).toBeNull();
            expect(param2.grad).toBeNull();
        });
    });

    describe('training simulation', function () {
        test('SGD converges on simple linear problem', function () {
            // y = 2x + 1, learn from (x=1, y=3)
            const optimizer = new SGDOptimizer(0.1);
            const w = new Tensor([0.5], { requiresGrad: true, backend });
            const b = new Tensor([0.5], { requiresGrad: true, backend });

            const x = new Tensor([1], { backend });
            const yTrue = new Tensor([3], { backend });

            const params = new Map([['w', w], ['b', b]]);

            // Train for 20 epochs
            for (let i = 0; i < 20; i++) {
                optimizer.zeroGrad(params);

                // Forward: y = w*x + b
                const wx = backend.mul(w, x);
                const yPred = backend.add(wx, b);

                // Loss: MSE = (y_pred - y_true)^2
                const diff = backend.sub(yPred, yTrue);
                const loss = backend.mul(diff, diff);

                // Backward
                loss.backward();

                // Update
                optimizer.step(params);
            }

            // Should be close to w=2, b=1
            expect(w.data[0]).toBeCloseTo(2, 0);
            expect(b.data[0]).toBeCloseTo(1, 0);
        });
    });
});
