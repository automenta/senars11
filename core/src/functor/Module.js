import { Tensor } from './Tensor.js';

export class Module {
    constructor() {
        this._modules = new Map();
        this._parameters = new Map();
        this.training = true;
    }

    registerParameter(name, tensor) {
        if (!(tensor instanceof Tensor)) throw new Error('registerParameter requires Tensor');
        tensor.requiresGrad = true;
        this._parameters.set(name, tensor);
        return tensor;
    }

    registerModule(name, module) {
        if (!(module instanceof Module)) throw new Error('registerModule requires Module');
        this._modules.set(name, module);
        return module;
    }

    parameters() {
        return [...this._parameters.values(), ...Array.from(this._modules.values()).flatMap(m => m.parameters())];
    }

    train(mode = true) {
        this.training = mode;
        this._modules.forEach(m => m.train(mode));
        return this;
    }

    eval() { return this.train(false); }

    forward(...args) { throw new Error('forward() not implemented'); }

    stateDict() {
        const dict = Object.fromEntries(Array.from(this._parameters, ([k, v]) => [k, v.data.slice()]));
        for (const [k, m] of this._modules) {
            Object.entries(m.stateDict()).forEach(([ck, cv]) => dict[`${k}.${ck}`] = cv);
        }
        return dict;
    }

    loadStateDict(dict) {
        this._parameters.forEach((v, k) => { if (dict[k]) v.data = dict[k].slice(); });
        for (const [k, m] of this._modules) {
            const prefix = `${k}.`;
            const childDict = Object.fromEntries(
                Object.entries(dict).filter(([key]) => key.startsWith(prefix)).map(([key, val]) => [key.slice(prefix.length), val])
            );
            m.loadStateDict(childDict);
        }
    }
}

export class Linear extends Module {
    constructor(backend, inFeatures, outFeatures, bias = true) {
        super();
        Object.assign(this, { backend, inFeatures, outFeatures });
        this.weight = this.registerParameter('weight', backend.kaimingNormal([inFeatures, outFeatures]));
        this.bias = bias ? this.registerParameter('bias', backend.zeros([outFeatures])) : null;
    }

    forward(input) {
        let out = this.backend.matmul(input, this.weight);
        if (this.bias) {
            const bias = this.bias.ndim === 1 && out.ndim === 2
                ? this.backend.reshape(this.bias, [1, this.outFeatures])
                : this.bias;
            out = this.backend.add(out, bias);
        }
        return out;
    }
}

export class Embedding extends Module {
    constructor(backend, numEmbeddings, embeddingDim) {
        super();
        Object.assign(this, { backend, numEmbeddings, embeddingDim });
        this.weight = this.registerParameter('weight', backend.randn([numEmbeddings, embeddingDim]));
    }

    forward(input) { return this.backend.gather(this.weight, input); }
}

export class Sequential extends Module {
    constructor(...modules) {
        super();
        modules.forEach((m, i) => this.registerModule(String(i), m));
        this.layers = modules;
    }

    forward(input) { return this.layers.reduce((x, layer) => layer.forward(x), input); }
}

export class MultiHeadAttention extends Module {
    constructor(backend, dModel, numHeads) {
        super();
        if (dModel % numHeads) throw new Error('dModel must be divisible by numHeads');
        Object.assign(this, { backend, dModel, numHeads, headDim: dModel / numHeads });
        ['qProj', 'kProj', 'vProj', 'outProj'].forEach(name =>
            this[name] = this.registerModule(name, new Linear(backend, dModel, dModel))
        );
    }

    forward(input) {
        const [q, k, v] = ['qProj', 'kProj', 'vProj'].map(proj => this[proj].forward(input));
        return this.outProj.forward(this.backend.attention(q, k, v));
    }
}
