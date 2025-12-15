/**
 * Base class for optimizers
 */
export class Optimizer {
    constructor(learningRate = 0.01) {
        this.learningRate = learningRate;
    }

    /**
     * Perform a single optimization step
     * @param {Map<string, Tensor>} parameters - Named parameters to update
     */
    step(parameters) {
        throw new Error('Optimizer.step() must be implemented by subclass');
    }

    /**
     * Zero out all parameter gradients
     * @param {Map<string, Tensor>} parameters - Named parameters
     */
    zeroGrad(parameters) {
        for (const param of parameters.values()) {
            param.zeroGrad();
        }
    }
}

/**
 * Stochastic Gradient Descent optimizer
 */
export class SGDOptimizer extends Optimizer {
    constructor(learningRate = 0.01, momentum = 0) {
        super(learningRate);
        this.momentum = momentum;
        this.velocities = new Map();
    }

    step(parameters) {
        for (const [name, param] of parameters.entries()) {
            if (!param.requiresGrad || !param.grad) continue;

            let update = param.grad.data.slice();

            if (this.momentum > 0) {
                if (!this.velocities.has(name)) {
                    this.velocities.set(name, new Array(param.size).fill(0));
                }
                const velocity = this.velocities.get(name);

                for (let i = 0; i < update.length; i++) {
                    velocity[i] = this.momentum * velocity[i] + update[i];
                    update[i] = velocity[i];
                }
            }

            for (let i = 0; i < param.data.length; i++) {
                param.data[i] -= this.learningRate * update[i];
            }
        }
    }
}

/**
 * Adam optimizer (Adaptive Moment Estimation)
 */
export class AdamOptimizer extends Optimizer {
    constructor(learningRate = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8) {
        super(learningRate);
        this.beta1 = beta1;
        this.beta2 = beta2;
        this.epsilon = epsilon;
        this.m = new Map();  // First moment (mean)
        this.v = new Map();  // Second moment (variance)
        this.t = 0;          // Time step
    }

    step(parameters) {
        this.t++;

        for (const [name, param] of parameters.entries()) {
            if (!param.requiresGrad || !param.grad) continue;

            if (!this.m.has(name)) {
                this.m.set(name, new Array(param.size).fill(0));
                this.v.set(name, new Array(param.size).fill(0));
            }

            const m = this.m.get(name);
            const v = this.v.get(name);
            const grad = param.grad.data;

            for (let i = 0; i < param.data.length; i++) {
                m[i] = this.beta1 * m[i] + (1 - this.beta1) * grad[i];
                v[i] = this.beta2 * v[i] + (1 - this.beta2) * grad[i] * grad[i];

                const mHat = m[i] / (1 - Math.pow(this.beta1, this.t));
                const vHat = v[i] / (1 - Math.pow(this.beta2, this.t));

                param.data[i] -= this.learningRate * mHat / (Math.sqrt(vHat) + this.epsilon);
            }
        }
    }
}

/**
 * RMSprop optimizer
 */
export class RMSpropOptimizer extends Optimizer {
    constructor(learningRate = 0.01, decay = 0.9, epsilon = 1e-8) {
        super(learningRate);
        this.decay = decay;
        this.epsilon = epsilon;
        this.cache = new Map();
    }

    step(parameters) {
        for (const [name, param] of parameters.entries()) {
            if (!param.requiresGrad || !param.grad) continue;

            if (!this.cache.has(name)) {
                this.cache.set(name, new Array(param.size).fill(0));
            }

            const cache = this.cache.get(name);
            const grad = param.grad.data;

            for (let i = 0; i < param.data.length; i++) {
                cache[i] = this.decay * cache[i] + (1 - this.decay) * grad[i] * grad[i];
                param.data[i] -= this.learningRate * grad[i] / (Math.sqrt(cache[i]) + this.epsilon);
            }
        }
    }
}
