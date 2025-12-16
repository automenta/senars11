/**
 * Truth-Tensor Bridge — Convert NAL truth values ↔ tensor representations
 * Demonstrates the core neuro-symbolic capability of the Tensor Logic API
 * 
 * Run: node examples/tensor-logic/truth-tensor-bridge.mjs
 */
import { T } from '../../core/src/functor/backends/NativeBackend.js';
import { TruthTensorBridge } from '../../core/src/functor/TruthTensorBridge.js';

const bridge = new TruthTensorBridge(T);

console.log('=== Tensor Logic: Truth-Tensor Bridge ===\n');

// NAL truth values: { f: frequency, c: confidence }
const truth = { f: 0.8, c: 0.9 };
console.log('NAL Truth Value:', truth);

// Convert to different tensor modes
console.log('\n--- Truth → Tensor Conversion ---');

const scalar = bridge.truthToTensor(truth, 'scalar');
console.log('scalar mode:', scalar.toArray(), '// Just frequency');

const bounds = bridge.truthToTensor(truth, 'bounds');
console.log('bounds mode:', bounds.toArray().map(v => v.toFixed(3)), '// [lower, upper] bounds');

const vector = bridge.truthToTensor(truth, 'vector');
console.log('vector mode:', vector.toArray().map(v => v.toFixed(3)), '// [f, c, expectation]');

// Reverse conversion
console.log('\n--- Tensor → Truth Conversion ---');

const tensor1 = T.tensor([0.75]);
console.log('sigmoid mode:', bridge.tensorToTruth(tensor1, 'sigmoid'), '// Assumes fixed high confidence');

const tensor2 = T.tensor([0.8, 0.9]);
console.log('dual mode:', bridge.tensorToTruth(tensor2, 'dual'), '// Two-element tensor');

const tensor3 = T.tensor([0.1, 0.3, 0.9, 0.2]);
console.log('softmax mode:', bridge.tensorToTruth(tensor3, 'softmax'), '// Max value as frequency');

// Expectation calculation
console.log('\n--- Expectation (weighted frequency) ---');
const beliefs = [
    { f: 1.0, c: 1.0 },   // Certain true
    { f: 0.0, c: 1.0 },   // Certain false
    { f: 0.5, c: 0.0 },   // Unknown
    { f: 0.8, c: 0.5 },   // Probable, moderate confidence
];

beliefs.forEach(t => {
    const exp = bridge.truthToExpectation(t);
    console.log(`f=${t.f}, c=${t.c} → expectation=${exp.toFixed(3)}`);
});

// Batch conversion for neural processing
console.log('\n--- Batch Conversion for Neural Network ---');
const batchTruths = [
    { f: 0.9, c: 0.8 },
    { f: 0.1, c: 0.5 },
    { f: 0.6, c: 0.95 }
];

const batchScalar = bridge.truthsToTensor(batchTruths, 'scalar');
console.log('Batch (scalar):', batchScalar.toArray());

const batchVector = bridge.truthsToTensor(batchTruths, 'vector');
console.log('Batch (vector) shape:', batchVector.shape, '→ [num_beliefs, 3]');
console.log('Batch (vector) data:');
batchVector.toArray().forEach((row, i) =>
    console.log(`  Belief ${i}: [${row.map(v => v.toFixed(3)).join(', ')}]`)
);

// Use in neural computation
console.log('\n--- Neural Processing of Beliefs ---');
const beliefEmbedding = bridge.truthsToTensor(batchTruths, 'vector');
const projectionWeights = T.randn([3, 4]);  // Project to 4-dim hidden
const hidden = T.matmul(beliefEmbedding, projectionWeights);
console.log('Beliefs projected to hidden:', hidden.shape);

// Compute similarity between truth-encoded beliefs
const t1 = bridge.truthToTensor({ f: 0.9, c: 0.8 }, 'vector');
const t2 = bridge.truthToTensor({ f: 0.9, c: 0.3 }, 'vector');
const similarity = T.cosineSimilarity(t1, t2);
console.log('\nSimilarity of high-conf vs low-conf same-freq:', similarity.data[0].toFixed(3));

console.log('\n✅ Truth-Tensor Bridge demo complete!');
