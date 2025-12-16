/**
 * Initialization Strategies — Zeros, Randn, Xavier, Kaiming
 * Run: node examples/tensor-logic/initialization.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { T } from '../../core/src/functor/backends/NativeBackend.js';

console.log('=== Tensor Logic: Initialization Strategies ===\n');

const shape = [4, 4];

// Basic initializations
console.log('--- Basic Initializations (4×4) ---\n');

console.log('zeros:', T.zeros(shape).toArray().map(r => r.map(v => v.toFixed(1)).join(' ')).join(' | '));
console.log('ones: ', T.ones(shape).toArray().map(r => r.map(v => v.toFixed(1)).join(' ')).join(' | '));
console.log('random:', T.random(shape).toArray().map(r => r.map(v => v.toFixed(2)).join(' ')).join(' | '));

// Normal distribution
console.log('\n--- Normal Distribution (randn) ---');
const normal1 = T.randn([1000]);
const mean1 = normal1.data.reduce((a, b) => a + b, 0) / 1000;
const variance1 = normal1.data.reduce((a, b) => a + (b - mean1) ** 2, 0) / 1000;
console.log('randn([1000], mean=0, std=1):');
console.log(`  Actual mean: ${mean1.toFixed(4)} (expected: 0)`);
console.log(`  Actual std:  ${Math.sqrt(variance1).toFixed(4)} (expected: 1)`);

const normal2 = T.randn([1000], 5, 2);
const mean2 = normal2.data.reduce((a, b) => a + b, 0) / 1000;
const variance2 = normal2.data.reduce((a, b) => a + (b - mean2) ** 2, 0) / 1000;
console.log('\nrandn([1000], mean=5, std=2):');
console.log(`  Actual mean: ${mean2.toFixed(4)} (expected: 5)`);
console.log(`  Actual std:  ${Math.sqrt(variance2).toFixed(4)} (expected: 2)`);

// Xavier initialization (for tanh/sigmoid activations)
console.log('\n--- Xavier Uniform Initialization ---');
console.log('Best for: tanh, sigmoid activations');
console.log('Formula: U[-√(6/(fan_in+fan_out)), √(6/(fan_in+fan_out))]');

const xavierWeights = T.xavierUniform([128, 64]);
const xavierMean = xavierWeights.data.reduce((a, b) => a + b, 0) / xavierWeights.data.length;
const xavierStd = Math.sqrt(xavierWeights.data.reduce((a, b) => a + (b - xavierMean) ** 2, 0) / xavierWeights.data.length);
const expectedBound = Math.sqrt(6.0 / (128 + 64));
console.log(`\nxavierUniform([128, 64]):`);
console.log(`  Mean:     ${xavierMean.toFixed(4)} (expected: ~0)`);
console.log(`  Std:      ${xavierStd.toFixed(4)}`);
console.log(`  Expected bounds: ±${expectedBound.toFixed(4)}`);
console.log(`  Actual range: [${Math.min(...xavierWeights.data).toFixed(4)}, ${Math.max(...xavierWeights.data).toFixed(4)}]`);

// Kaiming initialization (for ReLU activations)
console.log('\n--- Kaiming Normal Initialization ---');
console.log('Best for: ReLU, LeakyReLU activations');
console.log('Formula: N(0, √(2/fan_in)) for ReLU');

const kaimingWeights = T.kaimingNormal([128, 64], 0, 'fan_in', 'relu');
const kaimingMean = kaimingWeights.data.reduce((a, b) => a + b, 0) / kaimingWeights.data.length;
const kaimingStd = Math.sqrt(kaimingWeights.data.reduce((a, b) => a + (b - kaimingMean) ** 2, 0) / kaimingWeights.data.length);
const expectedStd = Math.sqrt(2.0 / 128);
console.log(`\nkaimingNormal([128, 64], mode='fan_in', nonlinearity='relu'):`);
console.log(`  Mean:     ${kaimingMean.toFixed(4)} (expected: ~0)`);
console.log(`  Std:      ${kaimingStd.toFixed(4)} (expected: ${expectedStd.toFixed(4)})`);

// Practical comparison
console.log('\n--- Practical Impact on Forward Pass ---');
console.log('Testing activation variance with different initializations:');

const input = T.randn([1, 128]);
const activations = {};

['zeros', 'random', 'xavier', 'kaiming'].forEach(init => {
    let W;
    switch (init) {
        case 'zeros': W = T.zeros([128, 64]); break;
        case 'random': W = T.random([128, 64]); break;
        case 'xavier': W = T.xavierUniform([128, 64]); break;
        case 'kaiming': W = T.kaimingNormal([128, 64]); break;
    }

    const hidden = T.relu(T.matmul(input, W));
    const mean = hidden.data.reduce((a, b) => a + b, 0) / hidden.data.length;
    const std = Math.sqrt(hidden.data.reduce((a, b) => a + (b - mean) ** 2, 0) / hidden.data.length);
    const deadNeurons = hidden.data.filter(v => v === 0).length;

    console.log(`  ${init.padEnd(8)}: mean=${mean.toFixed(4)}, std=${std.toFixed(4)}, dead=${deadNeurons}/64`);
});

console.log('\nKey insight: Proper initialization maintains activation variance through layers!');
console.log('zeros → exploding/vanishing gradients, proper init → stable training');

console.log('\n✅ Initialization demo complete!');
