/**
 * Loss functions for neural network training
 */
export class LossFunctor {
    constructor(backend = null) {
        this.backend = backend;
    }

    /**
     * Mean Squared Error (MSE) loss
     * @param {Tensor} predicted - Predicted values
     * @param {Tensor} target - Target values
     * @returns {Tensor} Scalar loss value
     */
    mse(predicted, target) {
        const diff = this.backend.sub(predicted, target);
        const squared = this.backend.mul(diff, diff);
        return this.backend.mean(squared);
    }

    /**
     * Mean Absolute Error (MAE) loss
     * @param {Tensor} predicted - Predicted values
     * @param {Tensor} target - Target values
     * @returns {Tensor} Scalar loss value
     */
    mae(predicted, target) {
        const diff = this.backend.sub(predicted, target);
        const abs = new (predicted.constructor)(
            diff.data.map(x => Math.abs(x)),
            { backend: this.backend, requiresGrad: diff.requiresGrad }
        );
        abs.shape = diff.shape;

        if (predicted.requiresGrad || target.requiresGrad) {
            abs.requiresGrad = true;
            abs._parents = [diff];
            abs._gradFn = () => {
                if (diff.requiresGrad) {
                    const sign = new (predicted.constructor)(
                        diff.data.map(x => x >= 0 ? 1 : -1),
                        { backend: this.backend }
                    );
                    sign.shape = diff.shape;
                    const gradDiff = this.backend.mul(abs.grad, sign);
                    diff.grad = diff.grad ? this.backend.add(diff.grad, gradDiff) : gradDiff;
                }
            };
        }

        return this.backend.mean(abs);
    }

    /**
     * Binary Cross-Entropy loss
     * @param {Tensor} predicted - Predicted probabilities [0, 1]
     * @param {Tensor} target - Target labels (0 or 1)
     * @param {number} eps - Small constant for numerical stability
     * @returns {Tensor} Scalar loss value
     */
    binaryCrossEntropy(predicted, target, eps = 1e-7) {
        const Tensor = predicted.constructor;

        // Clip predictions for numerical stability
        const clipped = new Tensor(
            predicted.data.map(x => Math.max(eps, Math.min(1 - eps, x))),
            { backend: this.backend, requiresGrad: predicted.requiresGrad }
        );
        clipped.shape = predicted.shape;

        // Loss = -[y*log(p) + (1-y)*log(1-p)]
        const logP = new Tensor(
            clipped.data.map(x => Math.log(x)),
            { backend: this.backend }
        );
        logP.shape = clipped.shape;

        const log1MinusP = new Tensor(
            clipped.data.map(x => Math.log(1 - x)),
            { backend: this.backend }
        );
        log1MinusP.shape = clipped.shape;

        const term1 = this.backend.mul(target, logP);
        const oneMinusTarget = this.backend.sub(
            this.backend.ones([target.size]).reshape(target.shape),
            target
        );
        const term2 = this.backend.mul(oneMinusTarget, log1MinusP);
        const sum = this.backend.add(term1, term2);
        const loss = this.backend.mul(sum, new Tensor([-1], { backend: this.backend }));

        // Add gradient function
        if (predicted.requiresGrad) {
            loss._parents = [predicted, target];
            loss._gradFn = () => {
                if (predicted.requiresGrad) {
                    // ∂L/∂p = -(y/p - (1-y)/(1-p))
                    const grad = new Tensor(
                        predicted.data.map((p, i) => {
                            const y = target.data[i];
                            const pClipped = Math.max(eps, Math.min(1 - eps, p));
                            return -(y / pClipped - (1 - y) / (1 - pClipped));
                        }),
                        { backend: this.backend }
                    );
                    grad.shape = predicted.shape;

                    const scaledGrad = this.backend.mul(loss.grad, grad);
                    predicted.grad = predicted.grad ?
                        this.backend.add(predicted.grad, scaledGrad) : scaledGrad;
                }
            };
        }

        return this.backend.mean(loss);
    }

    /**
     * Categorical Cross-Entropy loss (for softmax outputs)
     * @param {Tensor} predicted - Predicted probabilities (post-softmax)
     * @param {Tensor} target - One-hot encoded targets or class indices
     * @param {number} eps - Small constant for numerical stability
     * @returns {Tensor} Scalar loss value
     */
    crossEntropy(predicted, target, eps = 1e-7) {
        const Tensor = predicted.constructor;

        // Clip predictions
        const clipped = new Tensor(
            predicted.data.map(x => Math.max(eps, Math.min(1 - eps, x))),
            { backend: this.backend, requiresGrad: predicted.requiresGrad }
        );
        clipped.shape = predicted.shape;

        // -sum(y * log(p))
        const logP = new Tensor(
            clipped.data.map(x => Math.log(x)),
            { backend: this.backend }
        );
        logP.shape = clipped.shape;

        const prod = this.backend.mul(target, logP);
        const sum = this.backend.sum(prod);
        const loss = this.backend.mul(sum, new Tensor([-1], { backend: this.backend }));

        // Add gradient function
        if (predicted.requiresGrad) {
            loss._parents = [predicted, target];
            loss._gradFn = () => {
                if (predicted.requiresGrad) {
                    // ∂L/∂p = -y/p
                    const grad = new Tensor(
                        predicted.data.map((p, i) => {
                            const y = target.data[i];
                            const pClipped = Math.max(eps, Math.min(1 - eps, p));
                            return -y / pClipped;
                        }),
                        { backend: this.backend }
                    );
                    grad.shape = predicted.shape;

                    const scaledGrad = this.backend.mul(loss.grad, grad);
                    predicted.grad = predicted.grad ?
                        this.backend.add(predicted.grad, scaledGrad) : scaledGrad;
                }
            };
        }

        return this.backend.mean(loss);
    }
}
