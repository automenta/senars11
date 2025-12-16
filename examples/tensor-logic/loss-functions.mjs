/**
 * Loss Functions — Compare MSE, MAE, Binary Cross-Entropy, Cross-Entropy
 * Run: node examples/tensor-logic/loss-functions.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../core/src/functor/backends/NativeBackend.js';
import { LossFunctor } from '../../core/src/functor/LossFunctor.js';

const backend = new NativeBackend();
const loss = new LossFunctor(backend);

console.log('=== Tensor Logic: Loss Functions ===\n');

// Regression scenario
console.log('--- Regression Losses ---');
const pred = new Tensor([2.5, 0.0, 2.1, 7.8], { backend, requiresGrad: true });
const target = new Tensor([3.0, -0.5, 2.0, 7.5], { backend });

console.log('Predictions:', pred.toArray().map(v => v.toFixed(1)).join(', '));
console.log('Targets:', target.toArray().map(v => v.toFixed(1)).join(', '));
console.log('Errors:', pred.toArray().map((p, i) => (p - target.data[i]).toFixed(1)).join(', '));

const mse = loss.mse(pred, target);
const mae = loss.mae(pred, target);
console.log(`\nMSE Loss: ${mse.data[0].toFixed(4)} (mean squared error)`);
console.log(`MAE Loss: ${mae.data[0].toFixed(4)} (mean absolute error)`);

// Binary classification scenario
console.log('\n--- Binary Classification Losses ---');
const probabilities = new Tensor([0.9, 0.2, 0.8, 0.1], { backend, requiresGrad: true });
const labels = new Tensor([1, 0, 1, 0], { backend });

console.log('Predicted probabilities:', probabilities.toArray());
console.log('True labels:', labels.toArray());

const bce = loss.binaryCrossEntropy(probabilities, labels);
console.log(`\nBinary Cross-Entropy: ${bce.data[0].toFixed(4)}`);

// Show gradient computation
probabilities.zeroGrad();
const bce2 = loss.binaryCrossEntropy(
    new Tensor([0.9, 0.2, 0.8, 0.1], { backend, requiresGrad: true }),
    labels
);
bce2.backward();

// Multi-class classification scenario  
console.log('\n--- Multi-Class Classification ---');
const softmaxPred = new Tensor([0.7, 0.2, 0.1], { backend, requiresGrad: true }); // Class probs
const oneHot = new Tensor([1, 0, 0], { backend }); // True class is 0

console.log('Predicted distribution:', softmaxPred.toArray());
console.log('One-hot target:', oneHot.toArray());

const ce = loss.crossEntropy(softmaxPred, oneHot);
console.log(`Cross-Entropy: ${ce.data[0].toFixed(4)}`);

// Loss sensitivity comparison
console.log('\n--- Loss Sensitivity Analysis ---');
console.log('How loss changes as prediction moves away from target (1.0):');
console.log('Pred   MSE      MAE      BCE');
console.log('─────────────────────────────');
[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].forEach(p => {
    const predT = new Tensor([p], { backend });
    const targT = new Tensor([1], { backend });
    const mseV = loss.mse(predT, targT).data[0];
    const maeV = loss.mae(predT, targT).data[0];
    const bceV = loss.binaryCrossEntropy(predT, targT).data[0];
    console.log(`${p.toFixed(1)}    ${mseV.toFixed(4)}   ${maeV.toFixed(4)}   ${bceV.toFixed(4)}`);
});

console.log('\n✅ Loss functions demo complete!');
