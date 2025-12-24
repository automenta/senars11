# SeNARS Tensor Logic: Neural-Symbolic AI Foundation

SeNARS integrates **Tensor Logic** (Domingos, 2024) - a unified mathematical framework that treats neural operations and logical reasoning as the same fundamental process using tensor mathematics. This enables true neural-symbolic integration with differentiable reasoning.

## Core Capabilities

- **Differentiable Tensors**: N-dimensional arrays with automatic differentiation (autograd)
- **Neural Networks in Prolog**: Express deep learning architectures as logical predicates
- **Truth-Tensor Bridge**: Seamless conversion between symbolic truth values and continuous representations
- **End-to-End Learning**: Gradient descent with MSE, cross-entropy, SGD, Adam, RMSprop
- **Hybrid Reasoning**: Symbolic logic and neural computation in the same framework

## Quick Example

```prolog
% Define a neural network in Prolog
network(Input, Output) :-
    H is relu(add(matmul(w1, Input), b1)),
    Output is sigmoid(add(matmul(w2, H), b2)).

% Train with gradient descent
train(Input, Target) :-
    network(Input, Pred),
    Loss is mse(Pred, Target),
    backward(Loss),
    W1_new is adam_step(w1, 0.01).
```

## JavaScript API

```javascript
import { Tensor, backward, adamStep } from './core/src/functor/Tensor.js';

// Create differentiable tensors
const w1 = Tensor.randn([64, 784], { requiresGrad: true });
const b1 = Tensor.zeros([64], { requiresGrad: true });

// Forward pass
const h = w1.matmul(input).add(b1).relu();
const output = w2.matmul(h).add(b2).sigmoid();

// Backward pass and optimization
const loss = output.mse(target);
backward(loss);
adamStep([w1, b1, w2, b2], 0.01);
```

## Tensor Operations

| Category | Operations |
|----------|------------|
| **Math** | `add`, `sub`, `mul`, `div`, `matmul`, `pow`, `exp`, `log` |
| **Activation** | `relu`, `sigmoid`, `tanh`, `softmax`, `leakyRelu` |
| **Reduction** | `sum`, `mean`, `max`, `min` |
| **Shape** | `reshape`, `transpose`, `flatten`, `squeeze` |
| **Creation** | `zeros`, `ones`, `randn`, `eye`, `fromArray` |
| **Loss** | `mse`, `crossEntropy`, `binaryCrossEntropy` |

## Truth-Tensor Bridge

The bridge enables seamless conversion between NAL truth values and tensor representations:

```javascript
// NAL Truth → Tensor
const truth = { frequency: 0.8, confidence: 0.9 };
const tensor = Tensor.fromTruth(truth);  // [0.8, 0.9]

// Tensor → NAL Truth
const outputTensor = network.forward(inputTensor);
const outputTruth = outputTensor.toTruth();  // { frequency: 0.75, confidence: 0.85 }
```

## When to Use Tensor Logic

Use Tensor Logic when you need:

- **Differentiable Reasoning**: Learning logical rules from data via gradient descent
- **Hybrid Models**: Combining symbolic logic with neural network capabilities
- **End-to-End Learning**: Training entire reasoning pipelines with backprop
- **Neural-Symbolic Integration**: Seamless conversion between symbolic and continuous representations

Use traditional NAL when:
- Pure symbolic reasoning is sufficient
- Interpretability is critical
- Training data is unavailable
- Fast, deterministic inference is required

## Integration with NAL

Tensor Logic bridges symbolic NAL reasoning with neural learning:

```javascript
// Convert NAL truth values to tensors for learning
const belief = { frequency: 0.8, confidence: 0.9 };
const truthTensor = Tensor.fromTruth(belief);

// Train on reasoning patterns
const loss = model.forward(truthTensor).mse(targetTensor);
backward(loss);
adamStep(model.parameters(), learningRate);

// Convert back to NAL truth values
const learnedTruth = output.toTruth();
const updatedBelief = Task.fromTruth(learnedTruth);
```

## Implementation Status

✅ **Complete** (910 lines, 690+ tests passing)

**Available Features:**
- Full tensor operations (math, activation, reduction, shape)
- Automatic differentiation (autograd)
- Optimizers (SGD, Adam, RMSprop)
- Loss functions (MSE, cross-entropy)
- Truth-tensor bridge

**Future Enhancements:**
- GPU acceleration via WebGPU
- More advanced optimizers (AdamW, Lion)
- Attention mechanisms
- Pre-trained embeddings integration

See [`core/src/functor/README.md`](core/src/functor/README.md) for full documentation and examples.

## Troubleshooting

**Gradients not flowing**: Ensure `requiresGrad: true` when creating tensors:
```javascript
const w = Tensor.randn([10, 5], { requiresGrad: true });
```

**Out of memory**: Reduce batch size or model complexity

**Slow training**: Use smaller learning rates or reduce model size

- [Core Components](README.core.md) - NAL truth value system
- [Architecture](README.architecture.md) - Hybrid reasoning patterns
- [Vision](README.vision.md) - Neural-symbolic AI philosophy
- [Resources](README.resources.md) - Resource management in reasoning

## References

- Domingos, P. (2024). "Tensor Logic: A Unified Framework for Neural-Symbolic AI."
