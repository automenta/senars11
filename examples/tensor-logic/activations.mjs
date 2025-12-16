/**
 * Activation Functions — Visual comparison of ReLU, Sigmoid, Tanh, GELU, Softmax
 * Run: node examples/tensor-logic/activations.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { T } from '../../core/src/functor/backends/NativeBackend.js';

console.log('=== Tensor Logic: Activation Functions ===\n');

// Sample input range
const range = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
const x = new Tensor(range, { backend, requiresGrad: true });

console.log('Input x:', range.join(', '));
console.log();

// Apply each activation
const activations = [
    { name: 'ReLU', fn: () => T.relu(x), desc: 'max(0, x) — sparse, fast' },
    { name: 'Sigmoid', fn: () => T.sigmoid(x), desc: '1/(1+e^-x) — probability' },
    { name: 'Tanh', fn: () => T.tanh(x), desc: '(e^x-e^-x)/(e^x+e^-x) — centered' },
    { name: 'GELU', fn: () => T.gelu(x), desc: 'x·Φ(x) — smooth, modern' },
];

activations.forEach(({ name, fn, desc }) => {
    const result = fn();
    const formatted = result.toArray().map(v => v.toFixed(3).padStart(7)).join(' ');
    console.log(`${name.padEnd(8)}: ${formatted}`);
    console.log(`          ${desc}\n`);
});

// Softmax (normalizes to probability distribution)
console.log('--- Softmax (normalizes to probabilities) ---');
const logits = new Tensor([2.0, 1.0, 0.1], { backend: T });
const probs = T.softmax(logits);
console.log('Logits:', logits.toArray().map(v => v.toFixed(1)).join(', '));
console.log('Softmax:', probs.toArray().map(v => v.toFixed(3)).join(', '));
console.log('Sum:', T.sum(probs).data[0].toFixed(3), '(always 1.0)');

// Temperature scaling
console.log('\n--- Temperature Scaling (Softmax) ---');
console.log('Higher temp → more uniform, Lower temp → more peaked');
[0.5, 1.0, 2.0, 5.0].forEach(temp => {
    const scaled = T.softmax(T.div(logits, temp));
    const formatted = scaled.toArray().map(v => v.toFixed(3)).join(', ');
    console.log(`T=${temp.toFixed(1)}: [${formatted}]`);
});

// Gradient flow comparison
console.log('\n--- Gradient Characteristics ---');
const testPoints = [-2, 0, 2];

console.log('Point   ReLU grad   Sigmoid grad   Tanh grad');
console.log('─────────────────────────────────────────────');
testPoints.forEach(val => {
    // ReLU gradient
    const xRelu = new Tensor([val], { requiresGrad: true, backend });
    const yRelu = T.relu(xRelu);
    yRelu.backward();
    const reluGrad = xRelu.grad.data[0];

    // Sigmoid gradient
    const xSig = new Tensor([val], { requiresGrad: true, backend });
    const ySig = T.sigmoid(xSig);
    ySig.backward();
    const sigGrad = xSig.grad.data[0];

    // Tanh gradient  
    const xTanh = new Tensor([val], { requiresGrad: true, backend });
    const yTanh = T.tanh(xTanh);
    yTanh.backward();
    const tanhGrad = xTanh.grad.data[0];

    console.log(`${String(val).padStart(4)}    ${reluGrad.toFixed(3).padStart(8)}   ${sigGrad.toFixed(3).padStart(11)}   ${tanhGrad.toFixed(3).padStart(9)}`);
});

console.log('\nKey insight: Sigmoid/Tanh gradients vanish at extremes, ReLU doesn\'t!');
console.log('But ReLU has "dead neurons" (grad=0 when x<0).');

console.log('\n✅ Activations demo complete!');
