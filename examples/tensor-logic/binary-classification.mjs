/**
 * Binary Classification — Classify 2D points with decision boundary
 * Run: node examples/tensor-logic/binary-classification.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../core/src/functor/backends/NativeBackend.js';
import { Linear, Module } from '../../core/src/functor/Module.js';
import { LossFunctor } from '../../core/src/functor/LossFunctor.js';
import { AdamOptimizer } from '../../core/src/functor/Optimizer.js';

const backend = new NativeBackend();

console.log('=== Tensor Logic: Binary Classification ===\n');

// Generate two clusters
console.log('--- Generating Data ---');
const cluster1 = [], cluster2 = [];
for (let i = 0; i < 25; i++) {
    cluster1.push([1 + Math.random() * 2, 1 + Math.random() * 2, 0]);
    cluster2.push([4 + Math.random() * 2, 4 + Math.random() * 2, 1]);
}
const data = [...cluster1, ...cluster2].sort(() => Math.random() - 0.5);

console.log('Cluster 1 (label=0): centered at (2, 2)');
console.log('Cluster 2 (label=1): centered at (5, 5)');
console.log(`Total samples: ${data.length}\n`);

// Visualize
const width = 40, height = 15;
const grid = Array(height).fill().map(() => Array(width).fill(' '));
data.forEach(([x, y, label]) => {
    const px = Math.floor(x / 7 * (width - 1));
    const py = height - 1 - Math.floor(y / 7 * (height - 1));
    if (py >= 0 && py < height && px >= 0 && px < width) {
        grid[py][px] = label === 0 ? '○' : '●';
    }
});
grid.forEach(row => console.log('│' + row.join('') + '│'));
console.log('└' + '─'.repeat(width) + '┘');
console.log('○ = class 0, ● = class 1\n');

// Build classifier
class Classifier extends Module {
    constructor() {
        super();
        this.fc1 = this.registerModule('fc1', new Linear(backend, 2, 8));
        this.fc2 = this.registerModule('fc2', new Linear(backend, 8, 1));
    }

    forward(x) {
        let h = backend.relu(this.fc1.forward(x));
        return backend.sigmoid(this.fc2.forward(h));
    }
}

const model = new Classifier();
const loss_fn = new LossFunctor(backend);
const optimizer = new AdamOptimizer(0.1);

console.log('--- Training ---');
console.log('Model: Linear(2→8) → ReLU → Linear(8→1) → Sigmoid\n');

const epochs = 100;
for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    let correct = 0;

    data.forEach(([x, y, label]) => {
        optimizer.zeroGrad(model.parameters());

        const input = new Tensor([[x, y]], { backend });
        const target = new Tensor([[label]], { backend });

        const pred = model.forward(input);
        const loss = loss_fn.binaryCrossEntropy(pred, target);
        totalLoss += loss.data[0];

        if (Math.round(pred.data[0]) === label) correct++;

        loss.backward();
        optimizer.step(model.parameters());
    });

    if (epoch % 25 === 0 || epoch === epochs - 1) {
        const acc = (correct / data.length * 100).toFixed(1);
        console.log(`Epoch ${String(epoch).padStart(3)}: loss=${(totalLoss / data.length).toFixed(4)}, acc=${acc}%`);
    }
}

// Final accuracy
let finalCorrect = 0;
data.forEach(([x, y, label]) => {
    const pred = model.forward(new Tensor([[x, y]], { backend }));
    if (Math.round(pred.data[0]) === label) finalCorrect++;
});
console.log(`\nFinal Accuracy: ${(finalCorrect / data.length * 100).toFixed(1)}%`);

// Visualize decision boundary
console.log('\n--- Decision Boundary ---');
const grid2 = Array(height).fill().map(() => Array(width).fill(' '));

// Fill with predictions
for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
        const x = px / (width - 1) * 7;
        const y = (height - 1 - py) / (height - 1) * 7;
        const pred = model.forward(new Tensor([[x, y]], { backend }));
        grid2[py][px] = pred.data[0] > 0.5 ? '▓' : '░';
    }
}

// Overlay data points
data.forEach(([x, y, label]) => {
    const px = Math.floor(x / 7 * (width - 1));
    const py = height - 1 - Math.floor(y / 7 * (height - 1));
    if (py >= 0 && py < height && px >= 0 && px < width) {
        grid2[py][px] = label === 0 ? '○' : '●';
    }
});

grid2.forEach(row => console.log('│' + row.join('') + '│'));
console.log('└' + '─'.repeat(width) + '┘');
console.log('░ = predict 0, ▓ = predict 1');

console.log('\n✅ Binary classification demo complete!');
