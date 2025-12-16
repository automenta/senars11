import { Tensor } from '../../core/src/functor/Tensor.js';
import { T } from '../../core/src/functor/backends/NativeBackend.js';
import { Linear, Module } from '../../core/src/functor/Module.js';
import { LossFunctor } from '../../core/src/functor/LossFunctor.js';
import { AdamOptimizer } from '../../core/src/functor/Optimizer.js';
console.log('=== Tensor Logic: MLP Training on XOR ===\n');

const dataset = [
    [[0, 0], 0], [[0, 1], 1], [[1, 0], 1], [[1, 1], 0]
].map(([x, y]) => [new Tensor([x], { backend: T }), new Tensor([[y]], { backend: T })]);

console.log('XOR:', dataset.map(([x, y]) => `${x.toArray().flat()} → ${y.data[0]}`).join(', '));

class MLP extends Module {
    constructor() {
        super();
        this.fc1 = this.registerModule('fc1', new Linear(2, 8));
        this.fc2 = this.registerModule('fc2', new Linear(8, 1));
    }
    forward(x) {
        return T.sigmoid(this.fc2.forward(T.relu(this.fc1.forward(x))));
    }
}

const model = new MLP(), loss_fn = new LossFunctor(T), optimizer = new AdamOptimizer(0.1);
console.log('\nArchitecture: Linear(2→8) → ReLU → Linear(8→1) → Sigmoid\n');

for (let epoch = 0; epoch < 500; epoch++) {
    let totalLoss = 0;
    for (const [x, y] of dataset) {
        optimizer.zeroGrad(model.parameters());
        const loss = loss_fn.binaryCrossEntropy(model.forward(x), y);
        totalLoss += loss.data[0];
        loss.backward();
        optimizer.step(model.parameters());
    }
    if (epoch % 100 === 0 || epoch === 499)
        console.log(`Epoch ${epoch.toString().padStart(3)}: Loss = ${(totalLoss / 4).toFixed(4)}`);
}

console.log('\n--- Final Predictions ---');
dataset.forEach(([x, y]) => {
    const pred = model.forward(x).data[0];
    const match = Math.round(pred) === y.data[0] ? '✓' : '✗';
    console.log(`${x.toArray().flat()} → ${pred.toFixed(3)} (expected: ${y.data[0]}) ${match}`);
});

const accuracy = dataset.reduce((acc, [x, y]) =>
    acc + (Math.round(model.forward(x).data[0]) === y.data[0] ? 1 : 0), 0) / 4;
console.log(`\nAccuracy: ${(accuracy * 100).toFixed(0)}%`);
