import { Tensor } from './Tensor.js';

export class LossFunctor {
    constructor(backend = null) {
        this.backend = backend;
    }

    _clipTensor(tensor, eps) {
        const clipped = new Tensor(tensor.data.map(x => Math.max(eps, Math.min(1 - eps, x))),
            { backend: this.backend, requiresGrad: tensor.requiresGrad });
        clipped.shape = tensor.shape;
        return clipped;
    }

    _attachGradient(loss, parents, gradFn) {
        if (parents.some(p => p.requiresGrad)) {
            loss.requiresGrad = true;
            loss._parents = parents;
            loss._gradFn = gradFn;
        }
    }

    mse(predicted, target) {
        const diff = this.backend.sub(predicted, target);
        return this.backend.mean(this.backend.mul(diff, diff));
    }

    mae(predicted, target) {
        const diff = this.backend.sub(predicted, target);
        return this.backend.mean(this.backend.abs(diff));
    }

    binaryCrossEntropy(predicted, target, eps = 1e-7) {
        const clipped = this._clipTensor(predicted, eps);
        const logP = this.backend.log(clipped);
        const oneMinusClipped = this.backend.sub(this.backend.ones(clipped.shape), clipped);
        const log1MinusP = this.backend.log(oneMinusClipped);

        const term1 = this.backend.mul(target, logP);
        const oneMinusTarget = this.backend.sub(this.backend.ones(target.shape), target);
        const term2 = this.backend.mul(oneMinusTarget, log1MinusP);
        const negSum = this.backend.neg(this.backend.add(term1, term2));

        this._attachGradient(negSum, [predicted, target], () => {
            if (predicted.requiresGrad) {
                const grad = new Tensor(predicted.data.map((p, i) => {
                    const y = target.data[i];
                    const pClipped = Math.max(eps, Math.min(1 - eps, p));
                    return -(y / pClipped - (1 - y) / (1 - pClipped));
                }), { backend: this.backend });
                grad.shape = predicted.shape;
                const scaledGrad = this.backend.mul(negSum.grad, grad);
                predicted.grad = predicted.grad ? this.backend.add(predicted.grad, scaledGrad) : scaledGrad;
            }
        });

        return this.backend.mean(negSum);
    }

    crossEntropy(predicted, target, eps = 1e-7) {
        const clipped = this._clipTensor(predicted, eps);
        const logP = this.backend.log(clipped);
        const prod = this.backend.mul(target, logP);
        const loss = this.backend.neg(this.backend.sum(prod));

        this._attachGradient(loss, [predicted, target], () => {
            if (predicted.requiresGrad) {
                const grad = new Tensor(predicted.data.map((p, i) => {
                    const y = target.data[i];
                    return -y / Math.max(eps, Math.min(1 - eps, p));
                }), { backend: this.backend });
                grad.shape = predicted.shape;
                const scaledGrad = this.backend.mul(loss.grad, grad);
                predicted.grad = predicted.grad ? this.backend.add(predicted.grad, scaledGrad) : scaledGrad;
            }
        });

        return this.backend.mean(loss);
    }
}
