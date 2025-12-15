import { Tensor } from '../../../core/src/functor/Tensor.js';

describe('Tensor', function () {
    describe('construction and shape inference', function () {
        test('creates 1D tensor from array', function () {
            const t = new Tensor([1, 2, 3]);
            expect(t.shape).toEqual([3]);
            expect(t.ndim).toBe(1);
            expect(t.size).toBe(3);
            expect(t.data).toEqual([1, 2, 3]);
        });

        test('creates 2D tensor from nested array', function () {
            const t = new Tensor([[1, 2], [3, 4]]);
            expect(t.shape).toEqual([2, 2]);
            expect(t.ndim).toBe(2);
            expect(t.size).toBe(4);
            expect(t.data).toEqual([1, 2, 3, 4]);
        });

        test('creates 3D tensor', function () {
            const t = new Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
            expect(t.shape).toEqual([2, 2, 2]);
            expect(t.ndim).toBe(3);
            expect(t.size).toBe(8);
        });
    });

    describe('reshape', function () {
        test('reshapes 1D to 2D', function () {
            const t = new Tensor([1, 2, 3, 4]);
            const reshaped = t.reshape([2, 2]);
            expect(reshaped.shape).toEqual([2, 2]);
            expect(reshaped.toArray()).toEqual([[1, 2], [3, 4]]);
        });

        test('throws on invalid reshape', function () {
            const t = new Tensor([1, 2, 3]);
            expect(function () { t.reshape([2, 2]); }).toThrow();
        });
    });

    describe('transpose', function () {
        test('transposes 2D matrix', function () {
            const t = new Tensor([[1, 2, 3], [4, 5, 6]]);
            const transposed = t.transpose();
            expect(transposed.shape).toEqual([3, 2]);
            expect(transposed.toArray()).toEqual([[1, 4], [2, 5], [3, 6]]);
        });
    });

    describe('serialization', function () {
        test('toJSON and fromJSON round trip', function () {
            const t = new Tensor([[1, 2], [3, 4]]);
            const json = t.toJSON();
            const restored = Tensor.fromJSON(json);

            expect(restored.shape).toEqual(t.shape);
            expect(restored.data).toEqual(t.data);
        });
    });
});
