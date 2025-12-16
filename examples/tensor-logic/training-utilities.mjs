/**
 * Training Utilities — DataLoader, schedulers, and metrics
 * Run: node examples/tensor-logic/training-utilities.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { T } from '../../core/src/functor/backends/NativeBackend.js';
import { Linear } from '../../core/src/functor/Module.js';
import { LossFunctor } from '../../core/src/functor/LossFunctor.js';
import { SGDOptimizer } from '../../core/src/functor/Optimizer.js';
import { DataLoader, LRScheduler, EarlyStopping, MetricsTracker } from '../../core/src/functor/TrainingUtils.js';

console.log('=== Tensor Logic: Training Utilities ===\n');

// Create synthetic dataset: y = 2x + 1
const dataset = Array.from({ length: 20 }, (_, i) => ({
    x: new Tensor([[i * 0.1]], { backend: T }),
    y: new Tensor([[i * 0.2 + 1]], { backend: T })  // y = 2x + 1
}));

console.log('--- DataLoader ---');
const loader = new DataLoader(dataset, 4, true);  // batch_size=4, shuffle=true

let batchCount = 0;
for (const batch of loader) {
    batchCount++;
    if (batchCount === 1) {
        console.log(`First batch size: ${batch.length} samples`);
        console.log(`Sample x: ${batch[0].x.data[0].toFixed(2)}, y: ${batch[0].y.data[0].toFixed(2)}`);
    }
}
console.log(`Total batches: ${batchCount} (20 samples / 4 batch_size = 5)`);

// LR Scheduler demo
console.log('\n--- LR Scheduler ---');
const dummyOptimizer = { lr: 0.1 };

const stepScheduler = new LRScheduler(dummyOptimizer, 'step', 10, 0.5);
console.log('Step scheduler (step_size=10, gamma=0.5):');
[0, 5, 10, 15, 20].forEach(epoch => {
    stepScheduler.step(epoch);
    console.log(`  Epoch ${epoch.toString().padStart(2)}: lr = ${dummyOptimizer.lr.toFixed(4)}`);
});

dummyOptimizer.lr = 0.1;
const cosineScheduler = new LRScheduler(dummyOptimizer, 'cosine', 30, 0.1, 50);
console.log('\nCosine scheduler (max_epochs=50):');
[0, 12, 25, 37, 50].forEach(epoch => {
    cosineScheduler.step(epoch);
    console.log(`  Epoch ${epoch.toString().padStart(2)}: lr = ${dummyOptimizer.lr.toFixed(4)}`);
});

// Early Stopping demo
console.log('\n--- Early Stopping ---');
const stopper = new EarlyStopping(3, 0.01);  // patience=3, min_delta=0.01

const losses = [1.0, 0.8, 0.6, 0.59, 0.58, 0.58, 0.59, 0.60];
losses.forEach((loss, epoch) => {
    const shouldStop = stopper.step(loss);
    console.log(`Epoch ${epoch}: loss=${loss.toFixed(2)}, stop=${shouldStop}`);
    if (shouldStop) console.log('  → Training stopped!');
});

// Metrics Tracker demo
console.log('\n--- Metrics Tracker ---');
const tracker = new MetricsTracker();

// Simulate training metrics
for (let epoch = 0; epoch < 5; epoch++) {
    tracker.log(epoch, {
        loss: 1.0 - epoch * 0.15,
        accuracy: 0.5 + epoch * 0.1
    });
}

console.log('History (loss):', tracker.get('loss').map(e => `${e.value.toFixed(2)}`).join(', '));
console.log('History (accuracy):', tracker.get('accuracy').map(e => `${e.value.toFixed(2)}`).join(', '));
console.log('Summary:', tracker.summary());

// Complete training run with all utilities
console.log('\n--- Complete Training Run ---');

const model = new Linear(1, 1);
const loss_fn = new LossFunctor(T);
const optimizer = new SGDOptimizer(0.01, 0.9);  // SGD with momentum
const scheduler = new LRScheduler(optimizer, 'step', 20, 0.5);
const early_stopping = new EarlyStopping(10, 0.0001);
const metrics = new MetricsTracker();

const trainLoader = new DataLoader(dataset, 4, true);

console.log('Training Linear(1→1) to learn y = 2x + 1...');

for (let epoch = 0; epoch < 100; epoch++) {
    let epochLoss = 0;
    let batches = 0;

    for (const batch of trainLoader) {
        optimizer.zeroGrad(model.parameters());

        for (const sample of batch) {
            const pred = model.forward(sample.x);
            const loss = loss_fn.mse(pred, sample.y);
            epochLoss += loss.data[0];
            loss.backward();
        }

        optimizer.step(model.parameters());
        batches++;
    }

    const avgLoss = epochLoss / (batches * 4);
    scheduler.step(epoch);
    metrics.log(epoch, { loss: avgLoss, lr: optimizer.learningRate });

    if (epoch % 20 === 0) {
        console.log(`Epoch ${epoch.toString().padStart(2)}: loss=${avgLoss.toFixed(4)}, lr=${optimizer.learningRate.toFixed(4)}`);
    }

    if (early_stopping.step(avgLoss)) {
        console.log(`Early stopping at epoch ${epoch}`);
        break;
    }
}

// Show learned parameters
console.log('\nLearned parameters:');
console.log(`  Weight: ${model.weight.data[0].toFixed(3)} (target: 2.0)`);
console.log(`  Bias: ${model.bias.data[0].toFixed(3)} (target: 1.0)`);

console.log('\nFinal metrics summary:', metrics.summary());

console.log('\n✅ Training utilities demo complete!');
