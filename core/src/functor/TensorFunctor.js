import { Tensor } from './Tensor.js';
import { NativeBackend } from './backends/NativeBackend.js';

/**
 * Evaluates tensor operations as Prolog terms
 */
export class TensorFunctor {
    constructor(backend = null) {
        this.backend = backend || new NativeBackend();
        this.ops = new Map();
        this._registerBuiltins();
    }

    evaluate(term, bindings) {
        const op = term.operator ?? term.name;
        if (this.ops.has(op)) {
            const args = (term.components || []).map(c => this.resolve(c, bindings));
            return this.ops.get(op)(...args);
        }
        switch (op) {
            case 'tensor':
                return this.createTensor(this.resolve(term.components[0], bindings));

            case 'matmul':
            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
                return this._callBinaryOp(op, term, bindings);

            case 'transpose':
            case 'neg':
            case 'relu':
            case 'sigmoid':
            case 'tanh':
            case 'gelu':
                return this._callUnaryOp(op, term, bindings);

            case 'reshape': {
                const tensor = this.resolve(term.components[0], bindings);
                const shape = this.resolve(term.components[1], bindings);
                return this.backend.reshape(tensor, Array.isArray(shape) ? shape : shape.toArray?.() ?? [shape]);
            }

            case 'softmax': {
                const tensor = this.resolve(term.components[0], bindings);
                const axis = term.components[1] ? this.resolve(term.components[1], bindings) : -1;
                return this.backend.softmax(tensor, axis);
            }

            case 'sum':
            case 'mean':
            case 'max':
            case 'min':
                return this._callReductionOp(op, term, bindings);

            case 'zeros':
            case 'ones':
            case 'random':
                return this._callShapeOp(op, term, bindings);

            case 'grad': {
                const output = this.resolve(term.components[0], bindings);
                const input = this.resolve(term.components[1], bindings);

                if (!(output instanceof Tensor)) throw new Error('grad: output must be a Tensor');
                if (!(input instanceof Tensor)) throw new Error('grad: input must be a Tensor');
                if (!output.requiresGrad) throw new Error('Cannot compute gradient: output does not require gradients');

                output.backward();
                return input.grad || this.backend.zeros(input.shape);
            }

            case 'backward': {
                const tensor = this.resolve(term.components[0], bindings);
                if (!(tensor instanceof Tensor)) throw new Error('backward: argument must be a Tensor');
                tensor.backward();
                return tensor;
            }

            case 'zero_grad': {
                const tensor = this.resolve(term.components[0], bindings);
                if (!(tensor instanceof Tensor)) throw new Error('zero_grad: argument must be a Tensor');
                tensor.zeroGrad();
                return tensor;
            }

            default:
                return term;
        }
    }

    resolve(term, bindings) {
        if (term instanceof Tensor) return term;
        if (typeof term === 'number') return term;
        if (Array.isArray(term)) return term;
        if (term && term.isVariable) {
            const varName = term.name || term.toString();
            if (bindings.has(varName)) {
                return this.resolve(bindings.get(varName), bindings);
            }
            return term;
        }
        if (term && term.components) return this.evaluate(term, bindings);
        return term;
    }

    createTensor(data, options = {}) {
        if (data instanceof Tensor) return data;
        return new Tensor(data, {
            requiresGrad: options.requiresGrad ?? false,
            backend: this.backend
        });
    }

    _callBinaryOp(opName, term, bindings) {
        return this.backend[opName](
            this.resolve(term.components[0], bindings),
            this.resolve(term.components[1], bindings)
        );
    }

    _callUnaryOp(opName, term, bindings) {
        return this.backend[opName](this.resolve(term.components[0], bindings));
    }

    _callReductionOp(opName, term, bindings) {
        const tensor = this.resolve(term.components[0], bindings);
        const axis = term.components[1] ? this.resolve(term.components[1], bindings) : null;
        return this.backend[opName](tensor, axis);
    }

    _callShapeOp(opName, term, bindings) {
        const shape = this.resolve(term.components[0], bindings);
        return this.backend[opName](Array.isArray(shape) ? shape : [shape]);
    }

    registerOp(name, fn) {
        this.ops.set(name, fn);
    }

    canEvaluate(term) {
        const op = term.operator ?? term.name;
        return this.ops.has(op) || this._isTensorOp(op);
    }

    _isTensorOp(op) {
        const tensorOps = [
            'tensor', 'matmul', 'add', 'sub', 'mul', 'div',
            'transpose', 'reshape', 'neg',
            'relu', 'sigmoid', 'tanh', 'softmax', 'gelu',
            'sum', 'mean', 'max', 'min',
            'zeros', 'ones', 'random',
            'grad', 'backward', 'zero_grad' // Tier 2
        ];
        return tensorOps.includes(op);
    }

    _registerBuiltins() {
        // Future: layer compositions, loss functions
    }
}
