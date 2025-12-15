import { Tensor } from './Tensor.js';
import { NativeBackend } from './backends/NativeBackend.js';
import { TruthTensorBridge } from './TruthTensorBridge.js';
import { LossFunctor } from './LossFunctor.js';
import { SGDOptimizer, AdamOptimizer } from './Optimizer.js';

export class TensorFunctor {
    constructor(backend = null) {
        this.backend = backend || new NativeBackend();
        this.bridge = new TruthTensorBridge(this.backend);
        this.loss = new LossFunctor(this.backend);
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
                const normalizedShape = Array.isArray(shape) ? shape : (shape.toArray?.() ?? [shape]);
                return this.backend.reshape(tensor, normalizedShape);
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

            case 'truth_to_tensor': {
                const truth = this.resolve(term.components[0], bindings);
                const mode = term.components[1] ? this.resolve(term.components[1], bindings)?.value || this.resolve(term.components[1], bindings) : 'scalar';
                return this.bridge.truthToTensor(truth, mode);
            }

            case 'tensor_to_truth': {
                const tensor = this.resolve(term.components[0], bindings);
                const mode = term.components[1] ? this.resolve(term.components[1], bindings)?.value || this.resolve(term.components[1], bindings) : 'sigmoid';
                return this.bridge.tensorToTruth(tensor, mode);
            }

            case 'mse': {
                const pred = this.resolve(term.components[0], bindings);
                const target = this.resolve(term.components[1], bindings);
                return this.loss.mse(pred, target);
            }

            case 'mae': {
                const pred = this.resolve(term.components[0], bindings);
                const target = this.resolve(term.components[1], bindings);
                return this.loss.mae(pred, target);
            }

            case 'binary_cross_entropy': {
                const pred = this.resolve(term.components[0], bindings);
                const target = this.resolve(term.components[1], bindings);
                const eps = term.components[2] ? this.resolve(term.components[2], bindings) : 1e-7;
                return this.loss.binaryCrossEntropy(pred, target, eps);
            }

            case 'cross_entropy': {
                const pred = this.resolve(term.components[0], bindings);
                const target = this.resolve(term.components[1], bindings);
                const eps = term.components[2] ? this.resolve(term.components[2], bindings) : 1e-7;
                return this.loss.crossEntropy(pred, target, eps);
            }

            case 'sgd_step': {
                const param = this.resolve(term.components[0], bindings);
                const lr = this.resolve(term.components[1], bindings);
                const momentum = term.components[2] ? this.resolve(term.components[2], bindings) : 0;

                if (!(param instanceof Tensor)) throw new Error('sgd_step: parameter must be a Tensor');
                if (!param.grad) return param;

                const optimizer = new SGDOptimizer(lr, momentum);
                const params = new Map([['param', param]]);
                optimizer.step(params);
                return param;
            }

            case 'adam_step': {
                const param = this.resolve(term.components[0], bindings);
                const lr = this.resolve(term.components[1], bindings);
                const beta1 = term.components[2] ? this.resolve(term.components[2], bindings) : 0.9;
                const beta2 = term.components[3] ? this.resolve(term.components[3], bindings) : 0.999;

                if (!(param instanceof Tensor)) throw new Error('adam_step: parameter must be a Tensor');
                if (!param.grad) return param;

                const optimizer = new AdamOptimizer(lr, beta1, beta2);
                const params = new Map([['param', param]]);
                optimizer.step(params);
                return param;
            }

            default:
                return term;
        }
    }

    resolve(term, bindings) {
        if (term instanceof Tensor) return term;
        if (typeof term === 'number') return term;
        if (Array.isArray(term)) return term;

        if (term?.isVariable) {
            const varName = term.name || term.toString();
            return bindings.has(varName) ? this.resolve(bindings.get(varName), bindings) : term;
        }

        if (term?.components) return this.evaluate(term, bindings);
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
            'grad', 'backward', 'zero_grad', // Tier 2
            'truth_to_tensor', 'tensor_to_truth', // Tier 3: Truth-Tensor
            'mse', 'mae', 'binary_cross_entropy', 'cross_entropy', // Tier 3: Loss
            'sgd_step', 'adam_step' // Tier 3: Optimizers
        ];
        return tensorOps.includes(op);
    }

    _registerBuiltins() {
        // Tier 3 operations registered via evaluate() switch statement
    }
}
