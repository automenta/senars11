import { Tensor } from './Tensor.js';

/**
 * Bidirectional conversion between NARS truth values and tensor representations
 */
export class TruthTensorBridge {
    constructor(backend = null) {
        this.backend = backend;
    }

    /**
     * Convert NARS truth value to tensor representation
     * @param {Object|Array} truth - NARS truth value {f, c} or [f, c]
     * @param {string} mode - 'scalar' | 'bounds' | 'vector'
     * @returns {Tensor}
     */
    truthToTensor(truth, mode = 'scalar') {
        const { f, c } = Array.isArray(truth) ? { f: truth[0], c: truth[1] } : truth;

        switch (mode) {
            case 'scalar':
                return new Tensor([f], { backend: this.backend });

            case 'bounds': {
                const lower = f * c;
                const upper = f * c + (1 - c);
                return new Tensor([lower, upper], { backend: this.backend });
            }

            case 'vector': {
                const e = c * (f - 0.5) + 0.5;  // NAL expectation
                return new Tensor([f, c, e], { backend: this.backend });
            }

            default:
                throw new Error(`Unknown truthToTensor mode: ${mode}`);
        }
    }

    /**
     * Convert tensor output to NARS truth value
     * @param {Tensor} tensor - Neural network output
     * @param {string} mode - 'sigmoid' | 'dual' | 'softmax'
     * @returns {Object} Truth value {f, c}
     */
    tensorToTruth(tensor, mode = 'sigmoid') {
        const data = tensor.data;

        switch (mode) {
            case 'sigmoid':
                return { f: data[0], c: 0.9 };

            case 'dual':
                return { f: data[0], c: data[1] };

            case 'softmax': {
                const maxProb = Math.max(...data);
                return { f: maxProb, c: 1 - 1 / (data.length + 1) };
            }

            default:
                throw new Error(`Unknown tensorToTruth mode: ${mode}`);
        }
    }

    /**
     * Convert truth value to expectation (single number)
     * @param {Object|Array} truth - NARS truth value {f, c} or [f, c]
     * @returns {number} Expectation value
     */
    truthToExpectation(truth) {
        const { f, c } = Array.isArray(truth) ? { f: truth[0], c: truth[1] } : truth;
        return c * (f - 0.5) + 0.5;
    }

    /**
     * Batch convert array of truth values to tensor
     * @param {Array} truths - Array of truth values
     * @param {string} mode - Conversion mode
     * @returns {Tensor} Batch tensor
     */
    truthsToTensor(truths, mode = 'scalar') {
        const tensors = truths.map(t => this.truthToTensor(t, mode));
        const data = tensors.map(t => t.data).flat();

        if (mode === 'scalar') {
            return new Tensor(data, { backend: this.backend });
        } else {
            const shape = [truths.length, tensors[0].size];
            return new Tensor(data, { backend: this.backend }).reshape(shape);
        }
    }
}
