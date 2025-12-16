import { TensorBackend } from './TensorBackend.js';
import { Tensor } from '../Tensor.js';


export class NativeBackend extends TensorBackend {
    constructor() {
        super();
    }

    _unaryWithGrad(a, forwardFn, gradMaskFn) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        const result = this._createTensor(a.data.map(forwardFn), [...a.shape]);
        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => this._accumulateGrad(a, this.mul(result.grad, gradMaskFn(a, result)));
        }
        return result;
    }



    matmul(a, b) {
        if (!(a instanceof Tensor) || !(b instanceof Tensor)) throw new Error('matmul requires Tensor arguments');

        let result;
        if (a.ndim === 1 && b.ndim === 1) {
            if (a.shape[0] !== b.shape[0]) {
                throw new Error(`Incompatible shapes for dot product: ${a.shape} and ${b.shape}`);
            }
            const value = a.data.reduce((sum, val, i) => sum + val * b.data[i], 0);
            result = new Tensor([value], { backend: this });
        } else if (a.ndim === 2 && b.ndim === 2) {
            const [m, k1] = a.shape;
            const [k2, n] = b.shape;

            if (k1 !== k2) {
                throw new Error(`Incompatible shapes for matmul: ${a.shape} and ${b.shape}`);
            }

            const data = new Array(m * n);
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    let sum = 0;
                    for (let k = 0; k < k1; k++) {
                        sum += a.data[i * k1 + k] * b.data[k * n + j];
                    }
                    data[i * n + j] = sum;
                }
            }

            result = this._createTensor(data, [m, n]);
        } else if (a.ndim === 2 && b.ndim === 1) {
            const [m, k1] = a.shape;
            const k2 = b.shape[0];

            if (k1 !== k2) {
                throw new Error(`Incompatible shapes for matmul: ${a.shape} and ${b.shape}`);
            }

            const data = new Array(m);
            for (let i = 0; i < m; i++) {
                let sum = 0;
                for (let k = 0; k < k1; k++) {
                    sum += a.data[i * k1 + k] * b.data[k];
                }
                data[i] = sum;
            }

            result = new Tensor(data, { backend: this });
        } else {
            throw new Error(`matmul not supported for shapes ${a.shape} and ${b.shape}`);
        }
        if (a.requiresGrad || b.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a, b];
            result._gradFn = () => {
                if (a.requiresGrad) {
                    this._accumulateGrad(a, this.matmul(result.grad, this.transpose(b)));
                }
                if (b.requiresGrad) {
                    this._accumulateGrad(b, this.matmul(this.transpose(a), result.grad));
                }
            };
        }

        return result;
    }

    add(a, b) {
        return this._elementwise(a, b, (x, y) => x + y, (grad) => [grad, grad]);
    }

    sub(a, b) {
        return this._elementwise(a, b, (x, y) => x - y, (grad, a, b, backend) => [grad, backend.neg(grad)]);
    }

    mul(a, b) {
        return this._elementwise(a, b, (x, y) => x * y, (grad, a, b, backend) =>
            [backend.mul(grad, b), backend.mul(grad, a)]);
    }

    div(a, b) {
        return this._elementwise(a, b, (x, y) => x / y, (grad, a, b, backend) => [
            backend.div(grad, b),
            backend.neg(backend.div(backend.mul(grad, a), backend.mul(b, b)))
        ]);
    }

    _elementwise(a, b, op, gradOp) {
        if (typeof a === 'number') a = new Tensor([a], { backend: this });
        if (typeof b === 'number') b = new Tensor([b], { backend: this });

        let result;
        if (a.size === b.size && a.shape.join() === b.shape.join()) {
            result = this._createTensor(a.data.map((val, i) => op(val, b.data[i])), [...a.shape]);
        } else if (b.size === 1) {
            result = this._createTensor(a.data.map(val => op(val, b.data[0])), [...a.shape]);
        } else if (a.size === 1) {
            result = this._createTensor(b.data.map(val => op(a.data[0], val)), [...b.shape]);
        } else {
            throw new Error(`Broadcasting not supported for shapes ${a.shape} and ${b.shape}`);
        }

        if (a.requiresGrad || b.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a, b];
            result._gradFn = () => {
                if (gradOp) {
                    const [gradA, gradB] = gradOp(result.grad, a, b, this);
                    if (a.requiresGrad) this._accumulateGrad(a, gradA);
                    if (b.requiresGrad) this._accumulateGrad(b, gradB);
                }
            };
        }

        return result;
    }

    _accumulateGrad(tensor, grad) {
        tensor.grad = tensor.grad ? this.add(tensor.grad, grad) : grad;
    }

    _createTensor(data, shape) {
        const tensor = new Tensor(0, { backend: this });
        tensor.data = data;
        tensor.shape = shape;
        return tensor;
    }

    transpose(a) {
        if (!(a instanceof Tensor)) {
            throw new Error('transpose requires Tensor argument');
        }
        return a.transpose();
    }

    reshape(a, shape) {
        if (!(a instanceof Tensor)) {
            throw new Error('reshape requires Tensor argument');
        }
        return a.reshape(shape);
    }

    neg(a) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        return this._createTensor(a.data.map(x => -x), [...a.shape]);
    }

    relu(a) {
        return this._unaryWithGrad(a, x => Math.max(0, x), (input) =>
            this._createTensor(input.data.map(x => x > 0 ? 1 : 0), input.shape));
    }

    sigmoid(a) {
        return this._unaryWithGrad(a, x => 1 / (1 + Math.exp(-x)), (_, result) => {
            const oneMinusSigmoid = this._createTensor(result.data.map(s => 1 - s), result.shape);
            return this.mul(result, oneMinusSigmoid);
        });
    }

    tanh(a) {
        return this._unaryWithGrad(a, x => Math.tanh(x), (_, result) =>
            this.sub(this.ones(result.shape), this.mul(result, result)));
    }

    softmax(a, axis = -1) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        // Normalize axis
        if (axis < 0) axis = a.ndim + axis;

        // For 1D or when axis is last dimension
        if (a.ndim === 1 || axis === a.ndim - 1) {
            const max = Math.max(...a.data);
            const exp = a.data.map(x => Math.exp(x - max));
            const sum = exp.reduce((a, b) => a + b, 0);
            const result = exp.map(x => x / sum);
            const tensor = new Tensor(0, { backend: this });
            tensor.data = result;
            tensor.shape = a.shape.slice();
            return tensor;
        }

        throw new Error('Softmax only implemented for 1D or last axis');
    }

    gelu(a) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        return this._createTensor(a.data.map(x => {
            const tanh_arg = Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3);
            return 0.5 * x * (1 + Math.tanh(tanh_arg));
        }), [...a.shape]);
    }



    sum(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const value = a.data.reduce((sum, val) => sum + val, 0);
            const result = new Tensor([value], { backend: this });

            if (a.requiresGrad) {
                result.requiresGrad = true;
                result._parents = [a];
                result._gradFn = () => {
                    const gradA = this._createTensor(new Array(a.size).fill(result.grad.data[0]), a.shape.slice());
                    this._accumulateGrad(a, gradA);
                };
            }

            return result;
        }

        throw new Error('Axis-wise sum not yet implemented');
    }

    mean(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const sum = a.data.reduce((sum, val) => sum + val, 0);
            const value = sum / a.size;
            const result = new Tensor([value], { backend: this });

            if (a.requiresGrad) {
                result.requiresGrad = true;
                result._parents = [a];
                result._gradFn = () => {
                    const gradValue = result.grad.data[0] / a.size;
                    const gradA = this._createTensor(new Array(a.size).fill(gradValue), a.shape.slice());
                    this._accumulateGrad(a, gradA);
                };
            }

            return result;
        }

        throw new Error('Axis-wise mean not yet implemented');
    }

    max(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const result = Math.max(...a.data);
            return new Tensor([result], { backend: this });
        }

        throw new Error('Axis-wise max not yet implemented');
    }

    min(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const result = Math.min(...a.data);
            return new Tensor([result], { backend: this });
        }

        throw new Error('Axis-wise min not yet implemented');
    }

    // === Utilities ===

    zeros(shape) {
        return this._createTensor(Array(shape.reduce((a, b) => a * b, 1)).fill(0), shape);
    }

    ones(shape) {
        return this._createTensor(Array(shape.reduce((a, b) => a * b, 1)).fill(1), shape);
    }

    random(shape) {
        const size = shape.reduce((a, b) => a * b, 1);
        return this._createTensor(Array(size).fill(0).map(() => Math.random()), shape);
    }
}
