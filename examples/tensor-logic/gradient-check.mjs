import { Tensor } from '../../core/src/functor/Tensor.js';
import { NativeBackend } from '../../core/src/functor/backends/NativeBackend.js';

const backend = new NativeBackend();
console.log('=== Tensor Logic: Gradient Verification ===\n');

const eps = 1e-5;

function numericalGradient(fn, x, idx = 0) {
    const xPlus = new Tensor([...x.data], { backend });
    const xMinus = new Tensor([...x.data], { backend });
    xPlus.data[idx] += eps;
    xMinus.data[idx] -= eps;
    return (fn(xPlus).data[0] - fn(xMinus).data[0]) / (2 * eps);
}

function checkGradient(name, fn, xVal) {
    const x = new Tensor(xVal, { requiresGrad: true, backend });
    const y = fn(x);
    y.backward();

    const analytical = x.grad.toArray();
    const numerical = xVal.map((_, i) =>
        numericalGradient(t => fn(t), new Tensor(xVal, { backend }), i)
    );

    const maxError = Math.max(...analytical.map((a, i) => Math.abs(a - numerical[i])));
    const pass = maxError < 1e-4 ? '✓' : '✗';

    console.log(`${name}:`);
    console.log(`  Analytical: [${analytical.map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`  Numerical:  [${numerical.map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`  Max Error:  ${maxError.toExponential(2)} ${pass}\n`);

    return maxError < 1e-4;
}

// Test various operations
const tests = [
    ['y = x²', x => backend.mul(x, x), [2, 3, 4]],
    ['y = x³', x => backend.mul(backend.mul(x, x), x), [2]],
    ['y = sum(x)', x => backend.sum(x), [1, 2, 3, 4]],
    ['y = mean(x)', x => backend.mean(x), [1, 2, 3, 4]],
    ['y = relu(x)', x => backend.sum(backend.relu(x)), [-1, 0, 1, 2]],
    ['y = sigmoid(x)', x => backend.sum(backend.sigmoid(x)), [-1, 0, 1]],
    ['y = tanh(x)', x => backend.sum(backend.tanh(x)), [-1, 0, 1]],
    ['y = exp(x)', x => backend.sum(backend.exp(x)), [0, 0.5, 1]],
    ['y = log(x)', x => backend.sum(backend.log(x)), [1, 2, 3]],
    ['y = sqrt(x)', x => backend.sum(backend.sqrt(x)), [1, 4, 9]],
    ['y = x + x', x => backend.sum(backend.add(x, x)), [1, 2, 3]],
    ['y = x - 1', x => backend.sum(backend.sub(x, backend.ones([3]))), [1, 2, 3]],
    ['y = x / 2', x => backend.sum(backend.div(x, 2)), [2, 4, 6]],
    ['y = |x|', x => backend.sum(backend.abs(x)), [-2, 0, 2]],
    ['y = x^3', x => backend.sum(backend.pow(x, 3)), [1, 2]],
];

let passed = 0;
tests.forEach(([name, fn, xVal]) => {
    if (checkGradient(name, fn, xVal)) passed++;
});

console.log('─'.repeat(50));
console.log(`Results: ${passed}/${tests.length} gradient checks passed`);

// Matrix operations
console.log('\n--- Matrix Gradient Check ---');
const A = new Tensor([[1, 2], [3, 4]], { requiresGrad: true, backend });
const B = new Tensor([[5, 6], [7, 8]], { backend });

const C = backend.matmul(A, B);
const loss = backend.sum(C);
loss.backward();

console.log('A @ B then sum:');
console.log('  A.grad:', A.grad.toArray());
console.log('  Expected: [[11, 15], [11, 15]] (sum of B rows, broadcast)');

console.log('\n✅ Gradient verification complete!');
