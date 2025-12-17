/**
 * Tensor Basics — Core tensor operations and API
 * Run: node examples/tensor-logic/tensor-basics.mjs
 */
import { T } from '../../core/src/functor/backends/NativeBackend.js';

console.log('=== Tensor Logic: Basics ===\n');

const v = T.tensor([1, 2, 3, 4]);
console.log(`1D Tensor: shape=${v.shape} | ndim=${v.ndim} | size=${v.size}`);
console.log(`Data:`, v.numpy());

const m = T.tensor([[1, 2, 3], [4, 5, 6]]);
console.log(`\n2D Tensor: ${m.shape.join('×')} matrix:`, m.numpy());

const t3d = T.tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
console.log(`\n3D Tensor: shape ${t3d.shape.join('×')}, element[1,0,1] = ${t3d.get([1, 0, 1])}`);

console.log('\n--- Reshape ---');
const flat = T.tensor([1, 2, 3, 4, 5, 6]);
const reshaped = flat.reshape([2, 3]);
console.log(`${flat.shape} → ${reshaped.shape}:`, reshaped.numpy());

console.log('\n--- Transpose ---');
const original = T.tensor([[1, 2, 3], [4, 5, 6]]);
const transposed = original.transpose();
console.log(`Original ${original.shape.join('×')}:`, original.numpy());
console.log(`Transposed ${transposed.shape.join('×')}:`, transposed.numpy());

console.log('\n--- Element Access ---');
const mutable = T.tensor([[10, 20], [30, 40]]);
mutable.set([0, 1], 99);
console.log(`After set([0,1], 99):`, mutable.numpy());

console.log('\n--- New: item() and clone() ---');
const scalar = T.tensor([42]);
console.log(`Scalar extraction: tensor([42]).item() = ${scalar.item()}`);

const cloned = m.clone();
console.log(`Clone preserves data: ${JSON.stringify(cloned.data) === JSON.stringify(m.data)}`);

console.log('\n--- Serialization ---');
const json = m.toJSON();
const restored = T.tensor(json.data);
console.log(`JSON roundtrip: shape ${restored.shape}, data match: ${JSON.stringify(restored.data) === JSON.stringify(m.data)}`);

console.log('\n✅ Tensor basics complete!');
