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
        let params = [...this._parameters.values()];
        for (const mod of this._modules.values()) params.push(...mod.parameters());
        return params;
    }

    train(mode = true) {
        this.training = mode;
        for (const mod of this._modules.values()) mod.train(mode);
        return this;
    }

    eval() { return this.train(false); }

    forward(...args) {
        throw new Error('forward() not implemented');
    }

    stateDict() {
        const dict = {};
        for (const [k, v] of this._parameters) dict[k] = v.data.slice();
        for (const [k, m] of this._modules) {
            const childDict = m.stateDict();
            for (const [ck, cv] of Object.entries(childDict)) {
                dict[`${k}.${ck}`] = cv;
            }
        }
        return dict;
    }

    loadStateDict(dict) {
        for (const [k, v] of this._parameters) {
            if (dict[k]) v.data = dict[k].slice();
        }
        for (const [k, m] of this._modules) {
            const childDict = {};
            Object.keys(dict)
                .filter(key => key.startsWith(`${k}.`))
                .forEach(key => childDict[key.slice(k.length + 1)] = dict[key]);
            m.loadStateDict(childDict);
        }
    }
}

export class Linear extends Module {
    constructor(backend, inFeatures, outFeatures, bias = true) {
        super();
        this.backend = backend;
        this.inFeatures = inFeatures;
        this.outFeatures = outFeatures;

        this.weight = this.registerParameter(
            'weight',
            backend.kaimingNormal([inFeatures, outFeatures])
        );
        this.bias = bias ? this.registerParameter('bias', backend.zeros([outFeatures])) : null;
    }

    forward(input) {
        let out = this.backend.matmul(input, this.weight);
        if (this.bias) {
            // Ensure bias can broadcast: reshape [n] to [1, n] if needed
            const biasReshaped = this.bias.ndim === 1 && out.ndim === 2
                ? this.backend.reshape(this.bias, [1, this.outFeatures])
                : this.bias;
            out = this.backend.add(out, biasReshaped);
        }
        return out;
    }
}

export class Embedding extends Module {
    constructor(backend, numEmbeddings, embeddingDim) {
        super();
        this.backend = backend;
        this.numEmbeddings = numEmbeddings;
        this.embeddingDim = embeddingDim;

        this.weight = this.registerParameter(
            'weight',
            backend.randn([numEmbeddings, embeddingDim])
        );
    }

    forward(input) {
        return this.backend.gather(this.weight, input);
    }
}

export class Sequential extends Module {
    constructor(...modules) {
        super();
        modules.forEach((m, i) => this.registerModule(String(i), m));
        this.layers = modules;
    }

    forward(input) {
        return this.layers.reduce((x, layer) => layer.forward(x), input);
    }
}

export class MultiHeadAttention extends Module {
    constructor(backend, dModel, numHeads) {
        super();
        if (dModel % numHeads !== 0) {
            throw new Error('dModel must be divisible by numHeads');
        }
        this.backend = backend;
        this.dModel = dModel;
        this.numHeads = numHeads;
        this.headDim = dModel / numHeads;

        this.qProj = this.registerModule('qProj', new Linear(backend, dModel, dModel));
        this.kProj = this.registerModule('kProj', new Linear(backend, dModel, dModel));
        this.vProj = this.registerModule('vProj', new Linear(backend, dModel, dModel));
        this.outProj = this.registerModule('outProj', new Linear(backend, dModel, dModel));
    }

    forward(input) {
        const q = this.qProj.forward(input);
        const k = this.kProj.forward(input);
        const v = this.vProj.forward(input);

        // Simplified: use single-head attention
        // Full multi-head would need proper reshaping and concatenation
        const attn = this.backend.attention(q, k, v);
        return this.outProj.forward(attn);
    }
}
