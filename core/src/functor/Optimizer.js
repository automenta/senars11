export class Optimizer {
    constructor(learningRate = 0.01) {
        this.learningRate = learningRate;
    }

    step(parameters) {
        throw new Error('Optimizer.step() must be implemented by subclass');
    }

    zeroGrad(parameters) {
        parameters.forEach(param => param.zeroGrad());
    }

    _ensureState(stateMap, name, size, defaultValue = 0) {
        if (!stateMap.has(name)) {
            stateMap.set(name, new Array(size).fill(defaultValue));
        }
        return stateMap.get(name);
    }

    _updateParams(parameters, updateFn) {
        for (const [name, param] of parameters.entries()) {
            if (!param.requiresGrad || !param.grad) continue;
            updateFn(name, param);
        }
    }
}

export class SGDOptimizer extends Optimizer {
    constructor(learningRate = 0.01, momentum = 0) {
        super(learningRate);
        this.momentum = momentum;
        this.velocities = new Map();
    }

    step(parameters) {
        this._updateParams(parameters, (name, param) => {
            const update = param.grad.data.slice();

            if (this.momentum > 0) {
                const velocity = this._ensureState(this.velocities, name, param.size);
                update.forEach((grad, i) => {
                    velocity[i] = this.momentum * velocity[i] + grad;
                    update[i] = velocity[i];
                });
            }

            param.data.forEach((val, i) => {
                param.data[i] -= this.learningRate * update[i];
            });
        });
    }
}

export class AdamOptimizer extends Optimizer {
    constructor(learningRate = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8) {
        super(learningRate);
        this.beta1 = beta1;
        this.beta2 = beta2;
        this.epsilon = epsilon;
        this.m = new Map();
        this.v = new Map();
        this.t = 0;
    }

    step(parameters) {
        this.t++;

        this._updateParams(parameters, (name, param) => {
            const m = this._ensureState(this.m, name, param.size);
            const v = this._ensureState(this.v, name, param.size);
            const grad = param.grad.data;

            const biasCorrection1 = 1 - Math.pow(this.beta1, this.t);
            const biasCorrection2 = 1 - Math.pow(this.beta2, this.t);

            param.data.forEach((val, i) => {
                m[i] = this.beta1 * m[i] + (1 - this.beta1) * grad[i];
                v[i] = this.beta2 * v[i] + (1 - this.beta2) * grad[i] * grad[i];

                const mHat = m[i] / biasCorrection1;
                const vHat = v[i] / biasCorrection2;

                param.data[i] -= this.learningRate * mHat / (Math.sqrt(vHat) + this.epsilon);
            });
        });
    }
}

export class RMSpropOptimizer extends Optimizer {
    constructor(learningRate = 0.01, decay = 0.9, epsilon = 1e-8) {
        super(learningRate);
        this.decay = decay;
        this.epsilon = epsilon;
        this.cache = new Map();
    }

    step(parameters) {
        this._updateParams(parameters, (name, param) => {
            const cache = this._ensureState(this.cache, name, param.size);
            const grad = param.grad.data;

            param.data.forEach((val, i) => {
                cache[i] = this.decay * cache[i] + (1 - this.decay) * grad[i] * grad[i];
                param.data[i] -= this.learningRate * grad[i] / (Math.sqrt(cache[i]) + this.epsilon);
            });
        });
    }
}
