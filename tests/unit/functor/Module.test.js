import { describe, test, expect, beforeEach } from '@jest/globals';
import { NativeBackend } from '../../../core/src/functor/backends/NativeBackend.js';
import { Module, Linear, Embedding, Sequential, MultiHeadAttention } from '../../../core/src/functor/Module.js';
import { Tensor } from '../../../core/src/functor/Tensor.js';

describe('Module System', () => {
    let backend;

    beforeEach(() => {
        backend = new NativeBackend();
    });

    describe('Module base class', () => {
        test('registers parameters', () => {
            const mod = new Module();
            const param = new Tensor([[1, 2]], { backend });
            mod.registerParameter('weight', param);

            expect(mod._parameters.has('weight')).toBe(true);
            expect(param.requiresGrad).toBe(true);
        });

        test('registers submodules', () => {
            const parent = new Module();
            const child = new Module();
            parent.registerModule('child', child);

            expect(parent._modules.has('child')).toBe(true);
        });

        test('collects parameters recursively', () => {
            const parent = new Module();
            const child = new Module();

            parent.registerParameter('p1', new Tensor([1], { backend }));
            child.registerParameter('p2', new Tensor([2], { backend }));
            parent.registerModule('child', child);

            const params = parent.parameters();
            expect(params.length).toBe(2);
        });

        test('train/eval modes cascade', () => {
            const parent = new Module();
            const child = new Module();
            parent.registerModule('child', child);

            parent.eval();
            expect(parent.training).toBe(false);
            expect(child.training).toBe(false);

            parent.train();
            expect(parent.training).toBe(true);
            expect(child.training).toBe(true);
        });

        test('stateDict serializes parameters', () => {
            const mod = new Module();
            mod.registerParameter('weight', new Tensor([[1, 2], [3, 4]], { backend }));

            const state = mod.stateDict();
            expect(state).toHaveProperty('weight');
            expect(state.weight).toEqual([1, 2, 3, 4]);
        });

        test('stateDict includes nested modules', () => {
            const parent = new Module();
            const child = new Module();

            parent.registerParameter('p1', new Tensor([1], { backend }));
            child.registerParameter('p2', new Tensor([2], { backend }));
            parent.registerModule('child', child);

            const state = parent.stateDict();
            expect(state).toHaveProperty('p1');
            expect(state).toHaveProperty('child.p2');
        });

        test('loadStateDict restores parameters', () => {
            const mod = new Module();
            const weight = new Tensor([[1, 2]], { backend });
            mod.registerParameter('weight', weight);

            const originalState = mod.stateDict();
            weight.data.fill(999);

            mod.loadStateDict(originalState);
            expect(weight.data).toEqual(originalState.weight);
        });
    });

    describe('Linear layer', () => {
        test('forward pass', () => {
            const layer = new Linear(backend, 2, 3);
            const input = new Tensor([[1, 2]], { backend });
            const output = layer.forward(input);

            expect(output.shape).toEqual([1, 3]);
        });

        test('has correct parameters', () => {
            const layer = new Linear(backend, 2, 3, true);
            const params = layer.parameters();

            expect(params.length).toBe(2); // weight + bias
            expect(params[0].shape).toEqual([2, 3]);
            expect(params[1].shape).toEqual([3]);
        });

        test('can disable bias', () => {
            const layer = new Linear(backend, 2, 3, false);
            const params = layer.parameters();

            expect(params.length).toBe(1); // weight only
            expect(layer.bias).toBeNull();
        });

        test('gradient flows through layer', () => {
            const layer = new Linear(backend, 2, 1);
            const input = new Tensor([[1, 2]], { backend });
            const output = layer.forward(input);

            output.backward();

            expect(layer.weight.grad).not.toBeNull();
            expect(layer.bias.grad).not.toBeNull();
        });
    });

    describe('Embedding layer', () => {
        test('forward pass', () => {
            const layer = new Embedding(backend, 10, 5);
            const indices = new Tensor([0, 2, 4], { backend });
            const output = layer.forward(indices);

            expect(output.shape).toEqual([3, 5]);
        });

        test('has correct weight shape', () => {
            const layer = new Embedding(backend, 100, 50);
            expect(layer.weight.shape).toEqual([100, 50]);
        });

        test('gradient updates embeddings', () => {
            const layer = new Embedding(backend, 5, 3);
            const indices = new Tensor([0, 2], { backend });
            const output = layer.forward(indices);
            const loss = backend.sum(output);

            loss.backward();
            expect(layer.weight.grad).not.toBeNull();
        });
    });

    describe('Sequential container', () => {
        test('chains layers', () => {
            const net = new Sequential(
                new Linear(backend, 2, 4),
                new Linear(backend, 4, 1)
            );

            const input = new Tensor([[1, 2]], { backend });
            const output = net.forward(input);

            expect(output.shape).toEqual([1, 1]);
        });

        test('collects all parameters', () => {
            const net = new Sequential(
                new Linear(backend, 2, 4),
                new Linear(backend, 4, 1)
            );

            const params = net.parameters();
            expect(params.length).toBe(4); // 2 weights + 2 biases
        });

        test('backward pass through network', () => {
            const net = new Sequential(
                new Linear(backend, 2, 4),
                new Linear(backend, 4, 1)
            );

            const input = new Tensor([[1, 2]], { backend });
            const output = net.forward(input);

            output.backward();

            const params = net.parameters();
            expect(params.every(p => p.grad !== null)).toBe(true);
        });
    });

    describe('MultiHeadAttention', () => {
        test('creates with correct dimensions', () => {
            const mha = new MultiHeadAttention(backend, 8, 2);
            expect(mha.dModel).toBe(8);
            expect(mha.numHeads).toBe(2);
            expect(mha.headDim).toBe(4);
        });

        test('throws if dModel not divisible by numHeads', () => {
            expect(() => new MultiHeadAttention(backend, 7, 2)).toThrow(/divisible/);
        });

        test('forward pass', () => {
            const mha = new MultiHeadAttention(backend, 4, 2);
            const input = new Tensor([[1, 2, 3, 4]], { backend });
            const output = mha.forward(input);

            expect(output.shape).toEqual([1, 4]);
        });
    });
});
