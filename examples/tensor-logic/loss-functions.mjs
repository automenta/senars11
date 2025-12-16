/**
 * Loss Functions — Compare MSE, MAE, Binary Cross-Entropy, Cross-Entropy
 * Run: node examples/tensor-logic/loss-functions.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { T } from '../../core/src/functor/backends/NativeBackend.js';
import { LossFunctor } from '../../core/src/functor/LossFunctor.js';
const loss_fn = new LossFunctor(T);

console.log('=== Tensor Logic: Loss Functions ===\n');

// Regression scenario
console.log('--- Regression Losses ---');
const target = new Tensor([3.0, -0.5, 2.0, 7.5], { backend: T });

console.log('Predictions:', pred.toArray().map(v => v.toFixed(1)).join(', '));
console.log('Targets:', target.toArray().map(v => v.toFixed(1)).join(', '));
console.log('Errors:', pred.toArray().map((p, i) => (p - target.data[i]).toFixed(1)).join(', '));

const mse = loss_fn.mse(pred, target);
const mae = loss_fn.mae(pred, target);
console.log(`\nMSE Loss: ${mse.data[0].toFixed(4)} (mean squared error)`);
console.log(`MAE Loss: ${mae.data[0].toFixed(4)} (mean absolute error)`);

// Binary classification scenario
console.log('\n--- Binary Classification Losses ---');
const probabilities = new Tensor([0.9, 0.2, 0.8, 0.1], { backend, requiresGrad: true });
const labels = new Tensor([1, 0, 1, 0], { backend: T });

console.log('Predicted probabilities:', probabilities.toArray());
console.log('True labels:', labels.toArray());

const bce = loss_fn.binaryCrossEntropy(probabilities, labels);
console.log(`\nBinary Cross-Entropy: ${bce.data[0].toFixed(4)}`);

// Show gradient computation
probabilities.zeroGrad();
const bce2 = loss_fn.binaryCrossEntropy(
    new Tensor([0.9, 0.2, 0.8, 0.1], { backend, requiresGrad: true }),
    labels
);
bce2.backward();

// Multi-class classification scenario  
console.log('\n--- Multi-Class Classification ---');
const softmaxPred = new Tensor([0.7, 0.2, 0.1], { backend, requiresGrad: true }); // Class probs
const oneHot = new Tensor([1, 0, 0], { backend: T }); // True class is 0

console.log('Predicted distribution:', softmaxPred.toArray());
console.log('One-hot target:', oneHot.toArray());

const ce = loss_fn.crossEntropy(softmaxPred, oneHot);
console.log(`Cross-Entropy: ${ce.data[0].toFixed(4)}`);

// Loss sensitivity comparison
console.log('\n--- Loss Sensitivity Analysis ---');
console.log('How loss changes as prediction moves away from target (1.0):');
console.log('Pred   MSE      MAE      BCE');
console.log('─────────────────────────────');
[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].forEach(p => {
    const predT = new Tensor([p], { backend: T });
    const targT = new Tensor([1], { backend: T });
    const mseV = loss_fn.mse(predT, targT).data[0];
    const maeV = loss_fn.mae(predT, targT).data[0];
    const bceV = loss_fn.binaryCrossEntropy(predT, targT).data[0];
    console.log(`${p.toFixed(1)}    ${mseV.toFixed(4)}   ${maeV.toFixed(4)}   ${bceV.toFixed(4)}`);
});

console.log('\n✅ Loss functions demo complete!');
