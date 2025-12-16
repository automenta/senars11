import { Tensor } from '../../core/src/functor/Tensor.js';

console.log('=== Tensor Logic: Basics ===\n');

const v = new Tensor([1, 2, 3, 4]);
console.log(`1D Tensor: ${v} | shape: ${v.shape} | ndim: ${v.ndim} | size: ${v.size}`);

const m = new Tensor([[1, 2, 3], [4, 5, 6]]);
console.log(`\n2D Tensor: ${m.shape.join('×')} matrix\n`, m.toArray());

const t3d = new Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
console.log(`\n3D Tensor: shape ${t3d.shape.join('×')}, element[1,0,1] = ${t3d.get([1, 0, 1])}`);

console.log('\n--- Reshape ---');
const flat = new Tensor([1, 2, 3, 4, 5, 6]);
const reshaped = flat.reshape([2, 3]);
console.log(`${flat.shape} → ${reshaped.shape}:`, reshaped.toArray());

console.log('\n--- Transpose ---');
const original = new Tensor([[1, 2, 3], [4, 5, 6]]);
const transposed = original.transpose();
console.log(`Original ${original.shape.join('×')}:`, original.toArray());
console.log(`Transposed ${transposed.shape.join('×')}:`, transposed.toArray());

console.log('\n--- Element Access ---');
const mutable = new Tensor([[10, 20], [30, 40]]);
mutable.set([0, 1], 99);
console.log(`Before: [[10,20],[30,40]], After set([0,1],99): ${JSON.stringify(mutable.toArray())}`);

console.log('\n--- Serialization ---');
const json = m.toJSON();
const restored = Tensor.fromJSON(json);
console.log(`JSON roundtrip: shape ${restored.shape}, data match: ${JSON.stringify(restored.data) === JSON.stringify(m.data)}`);

console.log('\n✅ Tensor basics complete!');
