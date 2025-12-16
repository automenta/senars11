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
        return this._unaryWithGrad(a, x => -x, () =>
            this._createTensor(Array(a.size).fill(-1), a.shape));
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
        const sqrt2Pi = Math.sqrt(2 / Math.PI);
        return this._unaryWithGrad(a,
            x => 0.5 * x * (1 + Math.tanh(sqrt2Pi * (x + 0.044715 * x ** 3))),
            (input) => this._createTensor(input.data.map(x => {
                const u = sqrt2Pi * (x + 0.044715 * x ** 3);
                const tanhU = Math.tanh(u);
                const sech2 = 1 - tanhU * tanhU;
                return 0.5 * (1 + tanhU) + 0.5 * x * sech2 * sqrt2Pi * (1 + 0.134145 * x * x);
            }), input.shape)
        );
    }

    // === Mathematical Operations ===

    exp(a) {
        return this._unaryWithGrad(a, x => Math.exp(x), (_, result) => result);
    }

    log(a) {
        return this._unaryWithGrad(a, x => Math.log(x), (input) =>
            this._createTensor(input.data.map(x => 1 / x), input.shape));
    }

    sqrt(a) {
        return this._unaryWithGrad(a, x => Math.sqrt(x), (_, result) =>
            this._createTensor(result.data.map(s => 0.5 / s), result.shape));
    }

    pow(a, n) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        const result = this._createTensor(a.data.map(x => Math.pow(x, n)), [...a.shape]);
        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const gradA = this._createTensor(a.data.map(x => n * Math.pow(x, n - 1)), a.shape);
                this._accumulateGrad(a, this.mul(result.grad, gradA));
            };
        }
        return result;
    }

    abs(a) {
        return this._unaryWithGrad(a, x => Math.abs(x), (input) =>
            this._createTensor(input.data.map(x => x >= 0 ? 1 : -1), input.shape));
    }

    // === Reduction Operations ===

    _reduceAxis(a, axis, reduceFn, gradFn) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        if (axis < 0) axis = a.ndim + axis;

        const newShape = a.shape.filter((_, i) => i !== axis);
        if (newShape.length === 0) newShape.push(1);

        const axisSize = a.shape[axis];
        const outerSize = a.shape.slice(0, axis).reduce((p, c) => p * c, 1);
        const innerSize = a.shape.slice(axis + 1).reduce((p, c) => p * c, 1);
        const resultSize = outerSize * innerSize;

        const resultData = new Array(resultSize);
        for (let outer = 0; outer < outerSize; outer++) {
            for (let inner = 0; inner < innerSize; inner++) {
                const values = [];
                for (let ax = 0; ax < axisSize; ax++) {
                    values.push(a.data[outer * axisSize * innerSize + ax * innerSize + inner]);
                }
                resultData[outer * innerSize + inner] = reduceFn(values);
            }
        }

        const result = this._createTensor(resultData, newShape);

        if (a.requiresGrad && gradFn) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => gradFn(a, result, axis, axisSize, outerSize, innerSize, this);
        }

        return result;
    }

    sum(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const value = a.data.reduce((sum, val) => sum + val, 0);
            const result = new Tensor([value], { backend: this });
            if (a.requiresGrad) {
                result.requiresGrad = true;
                result._parents = [a];
                result._gradFn = () => this._accumulateGrad(a,
                    this._createTensor(new Array(a.size).fill(result.grad.data[0]), a.shape.slice()));
            }
            return result;
        }

        return this._reduceAxis(a, axis, vals => vals.reduce((s, v) => s + v, 0),
            (a, result, axis, axisSize, outerSize, innerSize, backend) => {
                const gradA = new Array(a.size);
                for (let outer = 0; outer < outerSize; outer++) {
                    for (let inner = 0; inner < innerSize; inner++) {
                        const gradVal = result.grad.data[outer * innerSize + inner];
                        for (let ax = 0; ax < axisSize; ax++) {
                            gradA[outer * axisSize * innerSize + ax * innerSize + inner] = gradVal;
                        }
                    }
                }
                backend._accumulateGrad(a, backend._createTensor(gradA, a.shape.slice()));
            });
    }

    mean(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const value = a.data.reduce((s, v) => s + v, 0) / a.size;
            const result = new Tensor([value], { backend: this });
            if (a.requiresGrad) {
                result.requiresGrad = true;
                result._parents = [a];
                result._gradFn = () => this._accumulateGrad(a,
                    this._createTensor(new Array(a.size).fill(result.grad.data[0] / a.size), a.shape.slice()));
            }
            return result;
        }

        return this._reduceAxis(a, axis, vals => vals.reduce((s, v) => s + v, 0) / vals.length,
            (a, result, axis, axisSize, outerSize, innerSize, backend) => {
                const gradA = new Array(a.size);
                for (let outer = 0; outer < outerSize; outer++) {
                    for (let inner = 0; inner < innerSize; inner++) {
                        const gradVal = result.grad.data[outer * innerSize + inner] / axisSize;
                        for (let ax = 0; ax < axisSize; ax++) {
                            gradA[outer * axisSize * innerSize + ax * innerSize + inner] = gradVal;
                        }
                    }
                }
                backend._accumulateGrad(a, backend._createTensor(gradA, a.shape.slice()));
            });
    }

    max(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const maxVal = Math.max(...a.data);
            const result = new Tensor([maxVal], { backend: this });
            if (a.requiresGrad) {
                result.requiresGrad = true;
                result._parents = [a];
                result._gradFn = () => {
                    const gradA = a.data.map(v => v === maxVal ? result.grad.data[0] : 0);
                    this._accumulateGrad(a, this._createTensor(gradA, a.shape.slice()));
                };
            }
            return result;
        }

        return this._reduceAxis(a, axis, vals => Math.max(...vals),
            (a, result, axis, axisSize, outerSize, innerSize, backend) => {
                const gradA = new Array(a.size).fill(0);
                for (let outer = 0; outer < outerSize; outer++) {
                    for (let inner = 0; inner < innerSize; inner++) {
                        const resultIdx = outer * innerSize + inner;
                        const maxVal = result.data[resultIdx];
                        for (let ax = 0; ax < axisSize; ax++) {
                            const idx = outer * axisSize * innerSize + ax * innerSize + inner;
                            if (a.data[idx] === maxVal) {
                                gradA[idx] = result.grad.data[resultIdx];
                                break;
                            }
                        }
                    }
                }
                backend._accumulateGrad(a, backend._createTensor(gradA, a.shape.slice()));
            });
    }

    min(a, axis = null) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });

        if (axis === null) {
            const minVal = Math.min(...a.data);
            const result = new Tensor([minVal], { backend: this });
            if (a.requiresGrad) {
                result.requiresGrad = true;
                result._parents = [a];
                result._gradFn = () => {
                    const gradA = a.data.map(v => v === minVal ? result.grad.data[0] : 0);
                    this._accumulateGrad(a, this._createTensor(gradA, a.shape.slice()));
                };
            }
            return result;
        }

        return this._reduceAxis(a, axis, vals => Math.min(...vals),
            (a, result, axis, axisSize, outerSize, innerSize, backend) => {
                const gradA = new Array(a.size).fill(0);
                for (let outer = 0; outer < outerSize; outer++) {
                    for (let inner = 0; inner < innerSize; inner++) {
                        const resultIdx = outer * innerSize + inner;
                        const minVal = result.data[resultIdx];
                        for (let ax = 0; ax < axisSize; ax++) {
                            const idx = outer * axisSize * innerSize + ax * innerSize + inner;
                            if (a.data[idx] === minVal) {
                                gradA[idx] = result.grad.data[resultIdx];
                                break;
                            }
                        }
                    }
                }
                backend._accumulateGrad(a, backend._createTensor(gradA, a.shape.slice()));
            });
    }

    // === Einsum & Tensor Contractions ===

    einsum(subscripts, ...tensors) {
        const normalized = subscripts.replace(/\s/g, '');
        const patterns = {
            'ij,jk->ik': () => this.matmul(tensors[0], tensors[1]),
            'i,i->': () => this.sum(this.mul(tensors[0], tensors[1])),
            'i,j->ij': () => this.outer(tensors[0], tensors[1]),
            'ij->ji': () => this.transpose(tensors[0]),
            'ii->': () => this.trace(tensors[0]),
            'ij->i': () => this.sum(tensors[0], 1),
            'ij->j': () => this.sum(tensors[0], 0),
        };
        if (patterns[normalized]) return patterns[normalized]();
        return this._fallbackEinsum(normalized, tensors);
    }

    outer(a, b) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        if (!(b instanceof Tensor)) b = new Tensor([b], { backend: this });
        if (a.ndim !== 1 || b.ndim !== 1) throw new Error('outer requires 1D tensors');

        const result = this._createTensor(
            a.data.flatMap(x => b.data.map(y => x * y)),
            [a.shape[0], b.shape[0]]
        );

        if (a.requiresGrad || b.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a, b];
            result._gradFn = () => {
                // c[i,j] = a[i] * b[j]
                // ∂L/∂a[i] = Σ_j (∂L/∂c[i,j] * b[j])
                // ∂L/∂b[j] = Σ_i (∂L/∂c[i,j] * a[i])
                if (a.requiresGrad) {
                    const gradA = new Array(a.size).fill(0);
                    for (let i = 0; i < a.size; i++) {
                        for (let j = 0; j < b.size; j++) {
                            gradA[i] += result.grad.data[i * b.size + j] * b.data[j];
                        }
                    }
                    this._accumulateGrad(a, this._createTensor(gradA, a.shape));
                }
                if (b.requiresGrad) {
                    const gradB = new Array(b.size).fill(0);
                    for (let j = 0; j < b.size; j++) {
                        for (let i = 0; i < a.size; i++) {
                            gradB[j] += result.grad.data[i * b.size + j] * a.data[i];
                        }
                    }
                    this._accumulateGrad(b, this._createTensor(gradB, b.shape));
                }
            };
        }
        return result;
    }

    trace(a) {
        if (!(a instanceof Tensor)) a = new Tensor([a], { backend: this });
        if (a.ndim !== 2) throw new Error('trace requires 2D tensor');

        const n = Math.min(a.shape[0], a.shape[1]);
        let val = 0;
        for (let i = 0; i < n; i++) val += a.data[i * a.shape[1] + i];

        const result = new Tensor([val], { backend: this });
        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const gradA = this.zeros(a.shape);
                for (let i = 0; i < n; i++) gradA.data[i * a.shape[1] + i] = result.grad.data[0];
                this._accumulateGrad(a, gradA);
            };
        }
        return result;
    }

    _fallbackEinsum(subscripts, tensors) {
        throw new Error(`Einsum pattern '${subscripts}' not supported. Supported patterns: ij,jk->ik | i,i-> | i,j->ij | ij->ji | ii-> | ij->i | ij->j`);
    }

    // === Composed Operations ===

    attention(q, k, v, scale = null) {
        const d = scale ?? Math.sqrt(k.shape[k.shape.length - 1]);
        const scores = this.div(this.matmul(q, this.transpose(k)), d);
        const weights = this.softmax(scores, -1);
        return this.matmul(weights, v);
    }

    layerNorm(x, eps = 1e-5) {
        const mean = this.mean(x, -1);
        const centered = this.sub(x, mean);
        const variance = this.mean(this.pow(centered, 2), -1);
        const std = this.sqrt(this.add(variance, eps));
        return this.div(centered, std);
    }

    cosineSimilarity(a, b) {
        const dot = this.sum(this.mul(a, b));
        const normA = this.sqrt(this.sum(this.mul(a, a)));
        const normB = this.sqrt(this.sum(this.mul(b, b)));
        return this.div(dot, this.mul(normA, normB));
    }

    dropout(x, p = 0.5, training = true) {
        if (!training) return x;
        const mask = this._createTensor(
            x.data.map(() => Math.random() > p ? 1 : 0),
            x.shape
        );
        return this.div(this.mul(x, mask), 1 - p);
    }

    clamp(x, minVal, maxVal) {
        if (!(x instanceof Tensor)) x = new Tensor([x], { backend: this });
        const minT = typeof minVal === 'number' ? new Tensor([minVal], { backend: this }) : minVal;
        const maxT = typeof maxVal === 'number' ? new Tensor([maxVal], { backend: this }) : maxVal;
        return this.min(this.max(x, minT), maxT);
    }

    // === Array Operations ===

    concat(tensors, axis = 0) {
        if (!Array.isArray(tensors) || tensors.length === 0) {
            throw new Error('concat requires non-empty array of tensors');
        }
        if (axis < 0) axis = tensors[0].ndim + axis;

        const shapes = tensors.map(t => t.shape);
        const newShape = [...shapes[0]];
        newShape[axis] = shapes.reduce((s, sh) => s + sh[axis], 0);

        const resultData = [];
        const outerSize = shapes[0].slice(0, axis).reduce((a, b) => a * b, 1);
        const innerSize = shapes[0].slice(axis + 1).reduce((a, b) => a * b, 1);

        for (let outer = 0; outer < outerSize; outer++) {
            for (const t of tensors) {
                const axisSize = t.shape[axis];
                for (let ax = 0; ax < axisSize; ax++) {
                    for (let inner = 0; inner < innerSize; inner++) {
                        resultData.push(t.data[outer * axisSize * innerSize + ax * innerSize + inner]);
                    }
                }
            }
        }

        const result = this._createTensor(resultData, newShape);
        if (tensors.some(t => t.requiresGrad)) {
            result.requiresGrad = true;
            result._parents = tensors;
            result._gradFn = () => {
                let offset = 0;
                for (const t of tensors) {
                    if (!t.requiresGrad) {
                        offset += t.shape[axis];
                        continue;
                    }
                    const gradSlice = this.slice(result.grad, offset, offset + t.shape[axis], axis);
                    this._accumulateGrad(t, gradSlice);
                    offset += t.shape[axis];
                }
            };
        }
        return result;
    }

    slice(a, start, end, axis = 0) {
        if (!(a instanceof Tensor)) throw new Error('slice requires Tensor argument');
        if (axis < 0) axis = a.ndim + axis;

        const newShape = [...a.shape];
        newShape[axis] = end - start;

        const resultData = [];
        const outerSize = a.shape.slice(0, axis).reduce((acc, s) => acc * s, 1);
        const innerSize = a.shape.slice(axis + 1).reduce((acc, s) => acc * s, 1);
        const axisSize = a.shape[axis];

        for (let outer = 0; outer < outerSize; outer++) {
            for (let ax = start; ax < end; ax++) {
                for (let inner = 0; inner < innerSize; inner++) {
                    resultData.push(a.data[outer * axisSize * innerSize + ax * innerSize + inner]);
                }
            }
        }

        const result = this._createTensor(resultData, newShape);
        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const gradA = this.zeros(a.shape);
                let idx = 0;
                for (let outer = 0; outer < outerSize; outer++) {
                    for (let ax = start; ax < end; ax++) {
                        for (let inner = 0; inner < innerSize; inner++) {
                            gradA.data[outer * axisSize * innerSize + ax * innerSize + inner] = result.grad.data[idx++];
                        }
                    }
                }
                this._accumulateGrad(a, gradA);
            };
        }
        return result;
    }

    unsqueeze(a, axis = 0) {
        if (!(a instanceof Tensor)) throw new Error('unsqueeze requires Tensor argument');
        if (axis < 0) axis = a.ndim + 1 + axis;

        const newShape = [...a.shape];
        newShape.splice(axis, 0, 1);
        return a.reshape(newShape);
    }

    stack(tensors, axis = 0) {
        const expanded = tensors.map(t => this.unsqueeze(t, axis));
        return this.concat(expanded, axis);
    }

    gather(a, indices, axis = 0) {
        if (!(a instanceof Tensor)) throw new Error('gather requires Tensor argument');
        if (!(indices instanceof Tensor)) indices = new Tensor(indices, { backend: this });
        if (axis < 0) axis = a.ndim + axis;

        const idxData = indices.data.map(x => Math.floor(x));
        const newShape = [...a.shape];
        newShape[axis] = idxData.length;

        const resultData = [];
        const outerSize = a.shape.slice(0, axis).reduce((acc, s) => acc * s, 1);
        const innerSize = a.shape.slice(axis + 1).reduce((acc, s) => acc * s, 1);
        const axisSize = a.shape[axis];

        for (let outer = 0; outer < outerSize; outer++) {
            for (const idx of idxData) {
                for (let inner = 0; inner < innerSize; inner++) {
                    resultData.push(a.data[outer * axisSize * innerSize + idx * innerSize + inner]);
                }
            }
        }

        const result = this._createTensor(resultData, newShape);
        if (a.requiresGrad) {
            result.requiresGrad = true;
            result._parents = [a];
            result._gradFn = () => {
                const gradA = this.zeros(a.shape);
                let resIdx = 0;
                for (let outer = 0; outer < outerSize; outer++) {
                    for (const idx of idxData) {
                        for (let inner = 0; inner < innerSize; inner++) {
                            const aIdx = outer * axisSize * innerSize + idx * innerSize + inner;
                            gradA.data[aIdx] += result.grad.data[resIdx++];
                        }
                    }
                }
                this._accumulateGrad(a, gradA);
            };
        }
        return result;
    }

    // === Initialization & Randomness ===

    randn(shape, mean = 0, std = 1) {
        const size = shape.reduce((a, b) => a * b, 1);
        const data = new Array(size);
        for (let i = 0; i < size; i += 2) {
            const u = 1 - Math.random();
            const v = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
            data[i] = z1 * std + mean;
            if (i + 1 < size) data[i + 1] = z2 * std + mean;
        }
        return this._createTensor(data, shape);
    }

    xavierUniform(shape, gain = 1.0) {
        const fanIn = shape[0], fanOut = shape[1] ?? shape[0];
        const bound = gain * Math.sqrt(6.0 / (fanIn + fanOut));
        const rand = this.random(shape);
        return this.sub(this.mul(rand, 2 * bound), bound);
    }

    kaimingNormal(shape, a = 0, mode = 'fan_in', nonlinearity = 'leaky_relu') {
        const fan = mode === 'fan_in' ? shape[0] : (shape[1] ?? shape[0]);
        const gain = nonlinearity === 'relu' ? Math.sqrt(2.0) : 1.0;
        const std = gain / Math.sqrt(fan);
        return this.randn(shape, 0, std);
    }

    // === Quantifiers (aliases for logical operations) ===


    forall(a, axis = null) { return this.min(a, axis); }
    exists(a, axis = null) { return this.max(a, axis); }

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
