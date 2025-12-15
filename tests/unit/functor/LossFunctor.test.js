import { describe, test, expect, beforeEach } from '@jest/globals';
import { LossFunctor } from '../../../core/src/functor/LossFunctor.js';
import { Tensor } from '../../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../../core/src/functor/backends/NativeBackend.js';

describe('LossFunctor', function () {
    let loss, backend;

    beforeEach(function () {
        backend = new NativeBackend();
        loss = new LossFunctor(backend);
    });

    describe('MSE (Mean Squared Error)', function () {
        test('calculates MSE correctly', function () {
            const pred = new Tensor([1, 2, 3], { backend });
            const target = new Tensor([1.5, 2.5, 2.5], { backend });
            // diff = [0.5, 0.5, -0.5]
            // squared = [0.25, 0.25, 0.25]
            // mean = 0.25

            const result = loss.mse(pred, target);
            expect(result.data[0]).toBeCloseTo(0.25);
        });

        test('MSE is zero for perfect predictions', function () {
            const pred = new Tensor([1, 2, 3], { backend });
            const target = new Tensor([1, 2, 3], { backend });

            const result = loss.mse(pred, target);
            expect(result.data[0]).toBeCloseTo(0);
        });

        test('MSE with gradients', function () {
            const pred = new Tensor([2, 3], { requiresGrad: true, backend });
            const target = new Tensor([1, 2], { backend });

            const result = loss.mse(pred, target);
            result.backward();

            // ∂MSE/∂pred = 2(pred - target)/n = [2*1/2, 2*1/2] = [1, 1]
            expect(pred.grad).toBeDefined();
            expect(pred.grad.data[0]).toBeCloseTo(1);
            expect(pred.grad.data[1]).toBeCloseTo(1);
        });
    });

    describe('MAE (Mean Absolute Error)', function () {
        test('calculates MAE correctly', function () {
            const pred = new Tensor([1, 2, 3], { backend });
            const target = new Tensor([1.5, 2.5, 2.5], { backend });
            // diff = [0.5, 0.5, -0.5]
            // abs = [0.5, 0.5, 0.5]
            // mean = 0.5

            const result = loss.mae(pred, target);
            expect(result.data[0]).toBeCloseTo(0.5);
        });

        test('MAE is zero for perfect predictions', function () {
            const pred = new Tensor([1, 2, 3], { backend });
            const target = new Tensor([1, 2, 3], { backend });

            const result = loss.mae(pred, target);
            expect(result.data[0]).toBeCloseTo(0);
        });
    });

    describe('Binary Cross-Entropy', function () {
        test('calculates BCE correctly', function () {
            const pred = new Tensor([0.7, 0.3], { backend });
            const target = new Tensor([1, 0], { backend });
            // -[1*log(0.7) + 0*log(0.3)] = -log(0.7) ≈ 0.357
            // -[0*log(0.3) + 1*log(0.7)] = -log(0.7) ≈ 0.357
            // mean ≈ 0.357

            const result = loss.binaryCrossEntropy(pred, target);
            expect(result.data[0]).toBeCloseTo(0.357, 2);
        });

        test('BCE clips predictions for stability', function () {
            const pred = new Tensor([0, 1], { backend }); // Extreme values
            const target = new Tensor([0, 1], { backend });

            const result = loss.binaryCrossEntropy(pred, target);
            expect(result.data[0]).toBeDefined();
            expect(isFinite(result.data[0])).toBe(true);
        });

        test('BCE with gradients', function () {
            const pred = new Tensor([0.7, 0.3], { requiresGrad: true, backend });
            const target = new Tensor([1, 0], { backend });

            const result = loss.binaryCrossEntropy(pred, target);
            result.backward();

            expect(pred.grad).toBeDefined();
            expect(pred.grad.data.length).toBe(2);
        });
    });

    describe('Cross-Entropy (Categorical)', function () {
        test('calculates cross-entropy correctly', function () {
            const pred = new Tensor([0.7, 0.2, 0.1], { backend });
            const target = new Tensor([1, 0, 0], { backend }); // One-hot
            // -sum(y * log(p)) = -[1*log(0.7) + 0*log(0.2) + 0*log(0.1)]
            // = -log(0.7) ≈ 0.357

            const result = loss.crossEntropy(pred, target);
            expect(result.data[0]).toBeCloseTo(0.357, 2);
        });

        test('cross-entropy clips predictions', function () {
            const pred = new Tensor([1, 0, 0], { backend }); // Extreme values
            const target = new Tensor([1, 0, 0], { backend });

            const result = loss.crossEntropy(pred, target);
            expect(isFinite(result.data[0])).toBe(true);
        });

        test('cross-entropy with gradients', function () {
            const pred = new Tensor([0.7, 0.2, 0.1], { requiresGrad: true, backend });
            const target = new Tensor([1, 0, 0], { backend });

            const result = loss.crossEntropy(pred, target);
            result.backward();

            expect(pred.grad).toBeDefined();
            expect(pred.grad.data.length).toBe(3);
        });
    });

    describe('Loss comparison', function () {
        test('MSE penalizes large errors more than MAE', function () {
            const pred = new Tensor([1, 5], { backend });
            const target = new Tensor([1, 1], { backend });
            // MAE = (0 + 4) / 2 = 2
            // MSE = (0 + 16) / 2 = 8

            const maeResult = loss.mae(pred, target);
            const mseResult = loss.mse(pred, target);

            expect(mseResult.data[0]).toBeGreaterThan(maeResult.data[0]);
        });
    });
});
