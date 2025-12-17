import { Tensor } from '../../../core/src/functor/Tensor.js';

describe('Tensor', () => {
    describe('construction and shape inference', () => {
        test('creates 1D tensor from array', () => {
            const t = new Tensor([1, 2, 3]);
            expect(t.shape).toEqual([3]);
            expect(t.ndim).toBe(1);
            expect(t.size).toBe(3);
            expect(t.data).toEqual([1, 2, 3]);
        });

        test('creates 2D tensor from nested array', () => {
            const t = new Tensor([[1, 2], [3, 4]]);
            expect(t.shape).toEqual([2, 2]);
            expect(t.ndim).toBe(2);
            expect(t.size).toBe(4);
            expect(t.data).toEqual([1, 2, 3, 4]);
        });

        test('creates 3D tensor', () => {
            const t = new Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
            expect(t.shape).toEqual([2, 2, 2]);
            expect(t.ndim).toBe(3);
            expect(t.size).toBe(8);
        });
    });

    describe('reshape', () => {
        test('reshapes 1D to 2D', () => {
            const t = new Tensor([1, 2, 3, 4]);
            const reshaped = t.reshape([2, 2]);
            expect(reshaped.shape).toEqual([2, 2]);
            expect(reshaped.toArray()).toEqual([[1, 2], [3, 4]]);
        });

        test('throws on invalid reshape', () => {
            const t = new Tensor([1, 2, 3]);
            expect(() => { t.reshape([2, 2]); }).toThrow();
        });
    });

    describe('transpose', () => {
        test('transposes 2D matrix', () => {
            const t = new Tensor([[1, 2, 3], [4, 5, 6]]);
            const transposed = t.transpose();
            expect(transposed.shape).toEqual([3, 2]);
            expect(transposed.toArray()).toEqual([[1, 4], [2, 5], [3, 6]]);
        });
    });

    describe('serialization', () => {
        test('toJSON and fromJSON round trip', () => {
            const t = new Tensor([[1, 2], [3, 4]]);
            const json = t.toJSON();
            const restored = Tensor.fromJSON(json);

            expect(restored.shape).toEqual(t.shape);
            expect(restored.data).toEqual(t.data);
        });
    });
});
