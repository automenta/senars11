export class Optimizer {
    constructor(learningRate = 0.01) {
        this.learningRate = learningRate;
    }

    get lr() { return this.learningRate; }
    set lr(value) { this.learningRate = value; }

    step(parameters) { throw new Error('Optimizer.step() must be implemented by subclass'); }

    zeroGrad(parameters) {
        parameters.forEach(param => param.zeroGrad());
    }

    _ensureState(stateMap, name, size, defaultValue = 0) {
        return stateMap.has(name) ? stateMap.get(name) : stateMap.set(name, new Array(size).fill(defaultValue)).get(name);
    }

    _updateParams(parameters, updateFn) {
        Array.from(parameters.entries())
            .filter(([_, param]) => param.requiresGrad && param.grad)
            .forEach(([name, param]) => updateFn(name, param));
    }
}

export class SGDOptimizer extends Optimizer {
    constructor(learningRate = 0.01, momentum = 0) {
        super(learningRate);
        Object.assign(this, { momentum, velocities: new Map() });
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
            param.data.forEach((val, i) => param.data[i] -= this.learningRate * update[i]);
        });
    }
}

export class AdamOptimizer extends Optimizer {
    constructor(learningRate = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8) {
        super(learningRate);
        Object.assign(this, { beta1, beta2, epsilon, m: new Map(), v: new Map(), t: 0 });
    }

    step(parameters) {
        this.t++;
        const biasCorrection1 = 1 - Math.pow(this.beta1, this.t);
        const biasCorrection2 = 1 - Math.pow(this.beta2, this.t);

        this._updateParams(parameters, (name, param) => {
            const m = this._ensureState(this.m, name, param.size);
            const v = this._ensureState(this.v, name, param.size);
            const grad = param.grad.data;

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
        Object.assign(this, { decay, epsilon, cache: new Map() });
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
