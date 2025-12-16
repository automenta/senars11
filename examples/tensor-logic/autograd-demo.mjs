import { Tensor } from '../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../core/src/functor/backends/NativeBackend.js';

const backend = new NativeBackend();
console.log('=== Tensor Logic: Automatic Differentiation ===\n');

console.log('--- Example 1: y = x² ---');
let x = new Tensor([2], { requiresGrad: true, backend });
let y = backend.mul(x, x);
y.backward();
console.log(`x = ${x.data[0]}, y = ${y.data[0]}, dy/dx = ${x.grad.data[0]} (expected: 4)`);

console.log('\n--- Example 2: y = (x + 1)² (chain rule) ---');
x = new Tensor([3], { requiresGrad: true, backend });
const xPlus1 = backend.add(x, new Tensor([1], { backend }));
y = backend.mul(xPlus1, xPlus1);
y.backward();
console.log(`x = ${x.data[0]}, y = ${y.data[0]}, dy/dx = ${x.grad.data[0]} (expected: 8)`);

console.log('\n--- Example 3: z = x * y (multivariate) ---');
x = new Tensor([3], { requiresGrad: true, backend });
y = new Tensor([4], { requiresGrad: true, backend });
const z = backend.mul(x, y);
z.backward();
console.log(`z = ${z.data[0]}, dz/dx = ${x.grad.data[0]} (y), dz/dy = ${y.grad.data[0]} (x)`);

console.log('\n--- Example 4: MSE loss gradient ---');
const W = new Tensor([2], { requiresGrad: true, backend });
const input = new Tensor([3], { backend });
const target = new Tensor([10], { backend });
const pred = backend.mul(W, input);
const diff = backend.sub(pred, target);
const loss = backend.mul(diff, diff);
loss.backward();
console.log(`loss = ${loss.data[0]}, dL/dW = ${W.grad.data[0]} (expected: -24)`);

console.log('\n--- Example 5: zeroGrad() ---');
console.log(`W.grad before: ${W.grad.data[0]}, after zeroGrad(): ${W.zeroGrad() ?? 'null'}`);

console.log('\n--- Example 6: Gradient through ReLU ---');
x = new Tensor([-2, 0, 3], { requiresGrad: true, backend });
y = backend.relu(x);
backend.sum(y).backward();
console.log(`x = [${x.toArray()}], relu = [${y.toArray()}], grad = [${x.grad.toArray()}]`);

console.log('\n✅ Autograd demo complete!');
