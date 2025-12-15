import { Tensor } from './Tensor.js';

export class TruthTensorBridge {
    constructor(backend = null) {
        this.backend = backend;
    }

    _normalizeTruth(truth) {
        return Array.isArray(truth) ? { f: truth[0], c: truth[1] } : truth;
    }

    _createTensor(data) {
        return new Tensor(data, { backend: this.backend });
    }

    truthToTensor(truth, mode = 'scalar') {
        const { f, c } = this._normalizeTruth(truth);

        switch (mode) {
            case 'scalar':
                return this._createTensor([f]);
            case 'bounds':
                return this._createTensor([f * c, f * c + (1 - c)]);
            case 'vector':
                return this._createTensor([f, c, c * (f - 0.5) + 0.5]);
            default:
                throw new Error(`Unknown truthToTensor mode: ${mode}`);
        }
    }

    tensorToTruth(tensor, mode = 'sigmoid') {
        const data = tensor.data;

        switch (mode) {
            case 'sigmoid':
                return { f: data[0], c: 0.9 };
            case 'dual':
                return { f: data[0], c: data[1] };
            case 'softmax':
                return { f: Math.max(...data), c: 1 - 1 / (data.length + 1) };
            default:
                throw new Error(`Unknown tensorToTruth mode: ${mode}`);
        }
    }

    truthToExpectation(truth) {
        const { f, c } = this._normalizeTruth(truth);
        return c * (f - 0.5) + 0.5;
    }

    truthsToTensor(truths, mode = 'scalar') {
        const tensors = truths.map(t => this.truthToTensor(t, mode));
        const data = tensors.flatMap(t => t.data);

        return mode === 'scalar'
            ? this._createTensor(data)
            : this._createTensor(data).reshape([truths.length, tensors[0].size]);
    }
}
