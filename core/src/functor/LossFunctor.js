export class LossFunctor {
    constructor(backend = null) {
        this.backend = backend;
    }



    _clipTensor(tensor, eps, Tensor) {
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
        const Tensor = predicted.constructor;
        const diff = this.backend.sub(predicted, target);
        const abs = new Tensor(diff.data.map(x => Math.abs(x)),
            { backend: this.backend, requiresGrad: diff.requiresGrad });
        abs.shape = diff.shape;
        this._attachGradient(abs, [diff], () => {
            if (diff.requiresGrad) {
                const sign = new Tensor(diff.data.map(x => x >= 0 ? 1 : -1), { backend: this.backend });
                sign.shape = diff.shape;
                const gradDiff = this.backend.mul(abs.grad, sign);
                diff.grad = diff.grad ? this.backend.add(diff.grad, gradDiff) : gradDiff;
            }
        });
        return this.backend.mean(abs);
    }

    binaryCrossEntropy(predicted, target, eps = 1e-7) {
        const Tensor = predicted.constructor;
        const clipped = this._clipTensor(predicted, eps, Tensor);

        const logP = new Tensor(clipped.data.map(x => Math.log(x)), { backend: this.backend });
        logP.shape = clipped.shape;

        const log1MinusP = new Tensor(clipped.data.map(x => Math.log(1 - x)), { backend: this.backend });
        log1MinusP.shape = clipped.shape;

        const term1 = this.backend.mul(target, logP);
        const oneMinusTarget = this.backend.sub(this.backend.ones([target.size]).reshape(target.shape), target);
        const term2 = this.backend.mul(oneMinusTarget, log1MinusP);
        const loss = this.backend.mul(this.backend.add(term1, term2),
            new Tensor([-1], { backend: this.backend }));

        this._attachGradient(loss, [predicted, target], () => {
            if (predicted.requiresGrad) {
                const grad = new Tensor(predicted.data.map((p, i) => {
                    const y = target.data[i];
                    const pClipped = Math.max(eps, Math.min(1 - eps, p));
                    return -(y / pClipped - (1 - y) / (1 - pClipped));
                }), { backend: this.backend });
                grad.shape = predicted.shape;
                const scaledGrad = this.backend.mul(loss.grad, grad);
                predicted.grad = predicted.grad ? this.backend.add(predicted.grad, scaledGrad) : scaledGrad;
            }
        });

        return this.backend.mean(loss);
    }

    crossEntropy(predicted, target, eps = 1e-7) {
        const Tensor = predicted.constructor;
        const clipped = this._clipTensor(predicted, eps, Tensor);

        const logP = new Tensor(clipped.data.map(x => Math.log(x)), { backend: this.backend });
        logP.shape = clipped.shape;

        const prod = this.backend.mul(target, logP);
        const loss = this.backend.mul(this.backend.sum(prod), new Tensor([-1], { backend: this.backend }));

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
