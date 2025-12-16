/**
 * Array Operations — concat, slice, gather, reshape
 * Run: node examples/tensor-logic/array-ops.mjs
 */
import { Tensor } from '../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../core/src/functor/backends/NativeBackend.js';

const backend = new NativeBackend();

console.log('=== Tensor Logic: Array Operations ===\n');

// Concat
console.log('--- Concatenation ---');
const a = new Tensor([[1, 2], [3, 4]], { backend });
const b = new Tensor([[5, 6], [7, 8]], { backend });

console.log('A:', a.toArray());
console.log('B:', b.toArray());

const concatAxis0 = backend.concat([a, b], 0);
console.log('\nconcat([A, B], axis=0):');
console.log(concatAxis0.toArray());
console.log('Shape:', concatAxis0.shape, '(stacked vertically)');

const concatAxis1 = backend.concat([a, b], 1);
console.log('\nconcat([A, B], axis=1):');
console.log(concatAxis1.toArray());
console.log('Shape:', concatAxis1.shape, '(stacked horizontally)');

// Slice
console.log('\n--- Slicing ---');
const big = new Tensor([[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]], { backend });
console.log('Original (3×4):');
console.log(big.toArray());

const sliced0 = backend.slice(big, 0, 2, 0);
console.log('\nslice(arr, 0, 2, axis=0) — first 2 rows:');
console.log(sliced0.toArray());

const sliced1 = backend.slice(big, 1, 3, 1);
console.log('\nslice(arr, 1, 3, axis=1) — cols 1-2:');
console.log(sliced1.toArray());

// Gather (index selection) 
console.log('\n--- Gathering ---');
const embeddings = new Tensor([
    [1.0, 0.0, 0.0],  // word 0
    [0.0, 1.0, 0.0],  // word 1
    [0.0, 0.0, 1.0],  // word 2
    [1.0, 1.0, 0.0],  // word 3
    [0.0, 1.0, 1.0],  // word 4
], { backend });

console.log('Embeddings (5 words, 3 dims):');
embeddings.toArray().forEach((row, i) => console.log(`  word ${i}: [${row.join(', ')}]`));

const indices = new Tensor([0, 2, 4, 1], { backend });
console.log('\nIndices to gather:', indices.toArray());

const gathered = backend.gather(embeddings, indices);
console.log('\ngather(embeddings, [0, 2, 4, 1]):');
gathered.toArray().forEach((row, i) => console.log(`  [${row.join(', ')}]`));

// Reshape flow
console.log('\n--- Reshape Pipeline ---');
const flat = new Tensor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], { backend });
console.log('Flat (12,):', flat.toArray());

const r3x4 = flat.reshape([3, 4]);
console.log('\nReshaped to (3, 4):');
console.log(r3x4.toArray());

const r2x6 = flat.reshape([2, 6]);
console.log('\nReshaped to (2, 6):');
console.log(r2x6.toArray());

const r2x2x3 = flat.reshape([2, 2, 3]);
console.log('\nReshaped to (2, 2, 3):');
console.log(r2x2x3.toArray());

// Gradient through concat
console.log('\n--- Gradients Through Concat ---');
const x = new Tensor([[1, 2]], { requiresGrad: true, backend });
const y = new Tensor([[3, 4]], { requiresGrad: true, backend });
const combined = backend.concat([x, y], 0);
const loss = backend.sum(combined);
loss.backward();

console.log('x:', x.toArray(), '| y:', y.toArray());
console.log('concat([x, y], 0):', combined.toArray());
console.log('After backward(), x.grad:', x.grad.toArray());
console.log('After backward(), y.grad:', y.grad.toArray());

console.log('\n✅ Array operations demo complete!');
