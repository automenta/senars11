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
                return this.backend.matmul(
                    this.resolve(term.components[0], bindings),
                    this.resolve(term.components[1], bindings)
                );

            case 'add':
                return this.backend.add(
                    this.resolve(term.components[0], bindings),
                    this.resolve(term.components[1], bindings)
                );

            case 'sub':
                return this.backend.sub(
                    this.resolve(term.components[0], bindings),
                    this.resolve(term.components[1], bindings)
                );

            case 'mul':
                return this.backend.mul(
                    this.resolve(term.components[0], bindings),
                    this.resolve(term.components[1], bindings)
                );

            case 'div':
                return this.backend.div(
                    this.resolve(term.components[0], bindings),
                    this.resolve(term.components[1], bindings)
                );

            case 'transpose':
                return this.backend.transpose(this.resolve(term.components[0], bindings));

            case 'reshape': {
                const tensor = this.resolve(term.components[0], bindings);
                const shape = this.resolve(term.components[1], bindings);
                return this.backend.reshape(tensor, Array.isArray(shape) ? shape : shape.toArray ? shape.toArray() : [shape]);
            }

            case 'neg':
                return this.backend.neg(this.resolve(term.components[0], bindings));

            case 'relu':
                return this.backend.relu(this.resolve(term.components[0], bindings));

            case 'sigmoid':
                return this.backend.sigmoid(this.resolve(term.components[0], bindings));

            case 'tanh':
                return this.backend.tanh(this.resolve(term.components[0], bindings));

            case 'softmax': {
                const tensor = this.resolve(term.components[0], bindings);
                const axis = term.components[1] ? this.resolve(term.components[1], bindings) : -1;
                return this.backend.softmax(tensor, axis);
            }

            case 'gelu':
                return this.backend.gelu(this.resolve(term.components[0], bindings));

            case 'sum': {
                const tensor = this.resolve(term.components[0], bindings);
                const axis = term.components[1] ? this.resolve(term.components[1], bindings) : null;
                return this.backend.sum(tensor, axis);
            }

            case 'mean': {
                const tensor = this.resolve(term.components[0], bindings);
                const axis = term.components[1] ? this.resolve(term.components[1], bindings) : null;
                return this.backend.mean(tensor, axis);
            }

            case 'max': {
                const tensor = this.resolve(term.components[0], bindings);
                const axis = term.components[1] ? this.resolve(term.components[1], bindings) : null;
                return this.backend.max(tensor, axis);
            }

            case 'min': {
                const tensor = this.resolve(term.components[0], bindings);
                const axis = term.components[1] ? this.resolve(term.components[1], bindings) : null;
                return this.backend.min(tensor, axis);
            }

            case 'zeros': {
                const shape = this.resolve(term.components[0], bindings);
                return this.backend.zeros(Array.isArray(shape) ? shape : [shape]);
            }

            case 'ones': {
                const shape = this.resolve(term.components[0], bindings);
                return this.backend.ones(Array.isArray(shape) ? shape : [shape]);
            }

            case 'random': {
                const shape = this.resolve(term.components[0], bindings);
                return this.backend.random(Array.isArray(shape) ? shape : [shape]);
            }

            case 'grad': {
                // Usage: grad(loss, weights) returns ∇_W loss
                const output = this.resolve(term.components[0], bindings);
                const input = this.resolve(term.components[1], bindings);

                if (!(output instanceof Tensor)) {
                    throw new Error('grad: output must be a Tensor');
                }
                if (!(input instanceof Tensor)) {
                    throw new Error('grad: input must be a Tensor');
                }
                if (!output.requiresGrad) {
                    throw new Error('Cannot compute gradient: output does not require gradients');
                }

                // Trigger backward pass
                output.backward();

                // Return gradient w.r.t. input
                return input.grad || this.backend.zeros(input.shape);
            }

            case 'backward': {
                // Usage: backward(tensor) triggers backprop, returns tensor for chaining
                const tensor = this.resolve(term.components[0], bindings);
                if (!(tensor instanceof Tensor)) {
                    throw new Error('backward: argument must be a Tensor');
                }
                tensor.backward();
                return tensor;
            }

            case 'zero_grad': {
                // Usage: zero_grad(tensor) clears gradients
                const tensor = this.resolve(term.components[0], bindings);
                if (!(tensor instanceof Tensor)) {
                    throw new Error('zero_grad: argument must be a Tensor');
                }
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
