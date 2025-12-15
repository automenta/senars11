import { TensorBackend } from './TensorBackend.js';
import { Tensor } from '../Tensor.js';

/**
 * NativeBackend - Pure JavaScript tensor operations
 * 
 * Default backend using native JS arrays and Math functions.
 * Not optimized, but works everywhere with no dependencies.
 */
export class NativeBackend extends TensorBackend {
    constructor() {
        super();
    }

    // === Binary operations ===

    matmul(a, b) {
        if (!(a instanceof Tensor) || !(b instanceof Tensor)) {
            throw new Error('matmul requires Tensor arguments');
        }

        let result;

        // Support 1D (vector) and 2D (matrix) multiplication
        if (a.ndim === 1 && b.ndim === 1) {
            // Dot product
            if (a.shape[0] !== b.shape[0]) {
                throw new Error(`Incompatible shapes for dot product: ${a.shape} and ${b.shape}`);
            }
            const value = a.data.reduce((sum, val, i) => sum + val * b.data[i], 0);
            result = new Tensor([value], { backend: this });
        } else if (a.ndim === 2 && b.ndim === 2) {
            // Matrix multiplication
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

            result = new Tensor(0, { backend: this });
            result.data = data;
            result.shape = [m, n];
        } else if (a.ndim === 2 && b.ndim === 1) {
            // Matrix-vector multiplication
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

        // Gradient tracking: ∂L/∂a = ∂L/∂out @ b^T, ∂L/∂b = a^T @ ∂L/∂out
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
        // ∂L/∂a = ∂L/∂out, ∂L/∂b = ∂L/∂out
        return this._elementwise(a, b, (x, y) => x + y, (grad) => [grad, grad]);
    }

    sub(a, b) {
        // ∂L/∂a = ∂L/∂out, ∂L/∂b = -∂L/∂out
        return this._elementwise(a, b, (x, y) => x - y, (grad, a, b, backend) =>
            [grad, backend.neg(grad)]);
    }

    mul(a, b) {
        // ∂L/∂a = ∂L/∂out ⊙ b, ∂L/∂b = ∂L/∂out ⊙ a
        return this._elementwise(a, b, (x, y) => x * y, (grad, a, b, backend) =>
            [backend.mul(grad, b), backend.mul(grad, a)]);
    }

    div(a, b) {
        // ∂L/∂a = ∂L/∂out / b, ∂L/∂b = -∂L/∂out ⊙ a / b²
        return this._elementwise(a, b, (x, y) => x / y, (grad, a, b, backend) => {
            const gradA = backend.div(grad, b);
            const gradB = backend.neg(backend.div(backend.mul(grad, a), backend.mul(b, b)));
            return [gradA, gradB];
        });
    }

    _elementwise(a, b, op, gradOp) {
        // Convert scalars to tensors
        if (typeof a === 'number') a = new Tensor([a], { backend: this });
        if (typeof b === 'number') b = new Tensor([b], { backend: this });

        let result;

        // Handle broadcasting for same-size tensors or scalar broadcast
        if (a.size === b.size && a.shape.join() === b.shape.join()) {
            const data = a.data.map((val, i) => op(val, b.data[i]));
            result = new Tensor(0, { backend: this });
            result.data = data;
            result.shape = a.shape.slice();
        } else if (b.size === 1) {
            // Scalar broadcasting
            const scalar = b.data[0];
            const data = a.data.map(val => op(val, scalar));
            result = new Tensor(0, { backend: this });
            result.data = data;
            result.shape = a.shape.slice();
        } else if (a.size === 1) {
            const scalar = a.data[0];
            const data = b.data.map(val => op(scalar, val));
            result = new Tensor(0, { backend: this });
            result.data = data;
            result.shape = b.shape.slice();
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

    // === Unary operations ===

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
        const result = a.data.map(x => -x);
        const tensor = new Tensor(0, { backend: this });
        tensor.data = result;
        tensor.shape = a.shape.slice();
        return tensor;
    }

    // === Activation functions ===

    relu(a) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        const result = this._createTensor(a.data.map(x => Math.max(0, x)), a.shape.slice());

        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const mask = this._createTensor(a.data.map(x => x > 0 ? 1 : 0), a.shape.slice());
                this._accumulateGrad(a, this.mul(result.grad, mask));
            };
        }

        return result;
    }

    sigmoid(a) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        const result = this._createTensor(a.data.map(x => 1 / (1 + Math.exp(-x))), a.shape.slice());

        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const oneMinusSigmoid = this._createTensor(result.data.map(s => 1 - s), result.shape.slice());
                this._accumulateGrad(a, this.mul(result.grad, this.mul(result, oneMinusSigmoid)));
            };
        }

        return result;
    }

    tanh(a) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        const result = this._createTensor(a.data.map(x => Math.tanh(x)), a.shape.slice());

        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const tanhSquared = this.mul(result, result);
                const oneMinus = this.sub(this.ones(result.shape), tanhSquared);
                this._accumulateGrad(a, this.mul(result.grad, oneMinus));
            };
        }

        return result;
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
        // GELU approximation: 0.5 * x * (1 + tanh(sqrt(2/π) * (x + 0.044715 * x^3)))
        const result = a.data.map(x => {
            const tanh_arg = Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x);
            return 0.5 * x * (1 + Math.tanh(tanh_arg));
        });
        const tensor = new Tensor(0, { backend: this });
        tensor.data = result;
        tensor.shape = a.shape.slice();
        return tensor;
    }

    // === Reduction operations ===

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
        const size = shape.reduce((a, b) => a * b, 1);
        const data = new Array(size).fill(0);
        const tensor = new Tensor(0, { backend: this });
        tensor.data = data;
        tensor.shape = shape;
        return tensor;
    }

    ones(shape) {
        const size = shape.reduce((a, b) => a * b, 1);
        const data = new Array(size).fill(1);
        const tensor = new Tensor(0, { backend: this });
        tensor.data = data;
        tensor.shape = shape;
        return tensor;
    }

    random(shape) {
        const size = shape.reduce((a, b) => a * b, 1);
        const data = new Array(size).fill(0).map(() => Math.random());
        const tensor = new Tensor(0, { backend: this });
        tensor.data = data;
        tensor.shape = shape;
        return tensor;
    }
}
