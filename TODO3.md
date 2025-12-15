# SeNARS Development Plan

> **Semantic Non-Axiomatic Reasoning System**  
> **Status**: Phase 3 Complete | NAL-1 to NAL-6 + NAL-8 | 99.8% Test Pass Rate  
> **Updated**: 2025-12-15

---

## Principles

| Principle | Implication |
|-----------|-------------|
| **NAL First** | LM augments, not replaces formal semantics |
| **Declarative** | Logic defined by patterns, not imperative code |
| **Compiled** | Patterns compiled to optimized decision trees |
| **Composable** | Standard interfaces, plug-and-play |
| **Observable** | Emit events, bounded retention |
| **Resource-Aware** | Budgets, timeouts, graceful degradation |
| **Leverage Existing** | Build on existing code, don't rewrite |
| **Tensor-Native** | Neural operations as first-class terms |

---

## Quick Reference

| I want to... | Command / Location |
|--------------|-------------------|
| Run reasoning | `const nar = new NAR(); nar.input('(a --> b).');` |
| Start REPL | `node repl/src/Repl.js` |
| Run demos | `node agent/src/demo/demoRunner.js` |
| Start MCP server | `node agent/src/mcp/start-server.js` |
| Run all tests | `npm test` |

---

## Phase Roadmap

```
Phase 4: Core Observability     ──► Phase 5: TensorFunctor ──► Phase 6: RLFP
   (Tracing, Serialization)           (ML as Terms)            (leverages Tensors)
                                           │
                                           ▼
                                    Phase 7: Interactive
                                    (Demo Runner, Playground)
                                           │
                                           ▼
                                    Phase 8: Scale
                                    (Advanced Indexing)
                                           │
                                           ▼
                                    Phase 9: Temporal
                                    (NAL-7, deferred)
```

---

## Foundation Status

### Complete Systems

| System | Location | README | Status |
|--------|----------|--------|--------|
| **Core NAR** | `core/src/nar/NAR.js` | — | ✅ |
| **Unifier** | `core/src/term/Unifier.js` | — | ✅ |
| **RuleCompiler** | `core/src/reason/rules/compiler/` | — | ✅ |
| **All 10 Strategies** | `core/src/reason/strategy/` | [README](file:///home/me/senars10/core/src/reason/strategy/README.md) | ✅ |
| **EmbeddingLayer** | `core/src/lm/EmbeddingLayer.js` | — | ✅ |
| **MCP Server** | `agent/src/mcp/` | [README](file:///home/me/senars10/agent/src/mcp/README.md) | ✅ |
| **Demo System** | `agent/src/demo/` | [README](file:///home/me/senars10/agent/src/demo/README.md) | ✅ |
| **RLFP Framework** | `agent/src/rlfp/` | [README](file:///home/me/senars10/agent/src/rlfp/README.md) | Skeleton |
| **Knowledge System** | `agent/src/know/` | [README](file:///home/me/senars10/agent/src/know/README.md) | ✅ |
| **WebSocket API** | `agent/src/server/` | — | ✅ |
| **REPL** | `repl/src/` | — | ✅ |
| **Serialization** | NAR, Memory, Task, Term, Bag, Concept | — | ✅ |
| **Events** | `IntrospectionEvents.js` | — | ✅ |

### NAL Completion

| Level | Status |
|-------|--------|
| NAL-1 to NAL-6 | ✅ |
| NAL-7 (Temporal) | Deferred → Phase 9 |
| NAL-8 (Goals) | ✅ |

### Test Coverage: 105 files, 99.8% pass

---

## Phase 4: Core Observability

> **Goal**: Universal tracing and data exchange foundation  
> **Effort**: ~1 day  
> **Unlocks**: Debugging, RLFP, Playground, API

### 4.1 DerivationTracer

**File**: `core/src/util/DerivationTracer.js`  
**Effort**: 3 hours

```javascript
class DerivationTracer {
    constructor(eventBus);
    startTrace(task?) → traceId;
    endTrace(traceId?) → Trace;
    getTrace(traceId) → Trace;
    export(traceId, format: 'json' | 'mermaid' | 'dot') → string;
    findPath(from, to) → Step[];
    whyNot(term) → Skip[];
    save(traceId, path);
    load(path) → Trace;
}
```

**Trace Structure**:
```javascript
{
    id, task, startTime, endTime,
    steps: [{ rule, premises, conclusion, truth, depth }],
    skips: [{ rule, reason }],
    derivations: [],
    metrics: { totalSteps, uniqueRules, maxDepth }
}
```

**Leverages**: `TraceId.js`, `IntrospectionEvents`, `task.serialize()`

### 4.2 Serializer Facade

**File**: `core/src/util/Serializer.js`  
**Effort**: 2 hours

```javascript
class Serializer {
    static toJSON(entity) → object;
    static fromJSON(json, type) → Entity;
    static toNarsese(task) → string;
    static fromNarsese(str) → Term;
    static exportState(nar) → NARState;
    static importState(nar, state);
}
```

**Leverages**: Existing `serialize()` methods on all components

### 4.3 LM Configuration

**File**: `core/src/lm/LMConfig.js`  
**Effort**: 2 hours

```javascript
class LMConfig {
    static PROVIDERS = ['transformers', 'ollama', 'openai', 'huggingface'];
    setProvider(name, config);
    getActive() → ProviderConfig;
    save(path?); load(path?);
    test(name?) → Promise<boolean>;
}
```

**Phase 4 Total**: ~7 hours (~1 day)

---

## Phase 5: TensorFunctor — ML as Terms

> **Goal**: Neural operations as first-class Prolog terms  
> **Effort**: ~2 weeks  
> **Unlocks**: Unified neuro-symbolic, RLFP ML strategies, Differentiable reasoning

### Why Early?
- Establishes **Tensor architecture** before RLFP needs it
- RLFP can then use **gradient-based preference learning**
- Enables **proof-of-concept differentiable NAL**

### 5.1 TensorFunctor Base

**File**: `core/src/functor/TensorFunctor.js`  
**Effort**: 3 days

```javascript
class TensorFunctor extends Functor {
    evaluate(term, bindings) {
        switch (term.operator) {
            case 'tensor': return this.createTensor(term);
            case 'matmul': return matmul(this.resolve(term.comp(0)), this.resolve(term.comp(1)));
            case 'add': return add(...);
            case 'mul': return mul(...);
            case 'transpose': return transpose(...);
        }
    }
    
    resolve(term) {
        return term.isVariable ? this.bindings.get(term.name) : term;
    }
    
    createTensor(term) → Tensor;
}
```

### 5.2 Activation Functions

**Effort**: 1 day

```javascript
// Extend TensorFunctor
case 'relu': return relu(this.resolve(term.comp(0)));
case 'sigmoid': return sigmoid(...);
case 'tanh': return tanh(...);
case 'softmax': return softmax(...);
case 'gelu': return gelu(...);
```

### 5.3 Layer Abstraction

**Effort**: 2 days

```prolog
% Define layers as terms
layer(In, Out, W, B, Act) :-
    Out is Act(add(matmul(W, In), B)).

% MLP as composition
mlp(Input, Output) :-
    layer(Input, H1, w1, b1, relu),
    layer(H1, H2, w2, b2, relu),
    layer(H2, Output, w3, b3, sigmoid).

% Query
?- mlp([0.5, 0.3], Prediction).
?- mlp(_, _), layer(_, H, W, _, _).  % Inspect hidden weights
```

### 5.4 Gradient Tracking

**Effort**: 1 week

```javascript
class GradientTensor extends Tensor {
    constructor(data, requiresGrad = false);
    backward();
    grad → Tensor;
}

// In TensorFunctor
case 'grad': return this.resolve(term.comp(0)).grad;
case 'backward': return this.resolve(term.comp(0)).backward();
```

### 5.5 Backpropagation

**Effort**: 1 week

```javascript
class TensorFunctor {
    // Automatic differentiation via term structure
    differentiate(outputTerm, wrtVariable) → GradientTerm;
    
    // Loss functions
    case 'mse': return mse(predicted, target);
    case 'cross_entropy': return crossEntropy(...);
    
    // Optimization step
    case 'sgd_step': return sgdStep(params, grads, lr);
}
```

### 5.6 Integration Tests

**Effort**: 2 days

```javascript
// Test: Forward pass
test('mlp forward pass', () => {
    nar.input('layer(In, Out, W, B, relu) :- Out is relu(add(matmul(W, In), B)).');
    nar.input('?- layer([1,2], Out, [[0.5,0.5],[0.3,0.3]], [0.1,0.1], relu).');
    expect(nar.answer()).toHaveProperty('Out');
});

// Test: Gradient
test('gradient tracking', () => {
    const result = nar.input('?- grad(matmul(W, X), W).');
    expect(result).toBeDefined();
});
```

### Phase 5 Summary

| Task | Effort |
|------|--------|
| TensorFunctor base | 3 days |
| Activations | 1 day |
| Layer abstraction | 2 days |
| Gradient tracking | 1 week |
| Backpropagation | 1 week |
| Integration tests | 2 days |
| **Total** | **~2.5 weeks** |

---

## Phase 6: RLFP — Reinforcement Learning from Preferences

> **Goal**: Learn reasoning preferences from human feedback  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing), Phase 5 (TensorFunctor)

### 6.1 Trajectory Logger (Complete Skeleton)

**File**: `agent/src/rlfp/ReasoningTrajectoryLogger.js`  
**Effort**: 4 hours

Subscribe to agent events, capture full reasoning traces using DerivationTracer.

### 6.2 Preference Collector

**File**: `agent/src/rlfp/PreferenceCollector.js`  
**Effort**: 4 hours

A/B comparison UI, preference recording.

### 6.3 RLFP Learner with Tensor Support

**File**: `agent/src/rlfp/RLFPLearner.js`  
**Effort**: 2 days

```javascript
class RLFPLearner {
    constructor(tensorFunctor);
    
    // Reward model (neural via TensorFunctor)
    rewardModel(trajectory) → score;
    
    // Preference learning
    trainRewardModel(preferences: Preference[]);
    
    // Policy update
    updatePolicy(trajectory, reward);
}
```

**Leverages TensorFunctor for**:
- Neural reward model (`mlp(trajectory_embedding, score)`)
- Gradient-based policy optimization
- Differentiable NAL (experimental)

### 6.4 Integration Loop

**Effort**: 1 day

```javascript
async function rlfpLoop(agent) {
    const logger = new ReasoningTrajectoryLogger(agent.eventBus);
    const collector = new PreferenceCollector();
    const learner = new RLFPLearner(tensorFunctor);
    
    while (true) {
        const traj1 = await runTask(agent, task);
        const traj2 = await runTask(agent, task, { variant: true });
        
        const preference = await collector.collect(traj1, traj2);
        await learner.trainRewardModel([preference]);
    }
}
```

### Phase 6 Total: ~1 week

---

## Phase 7: Interactive — Demo Runner & Playground

> **Goal**: Visual debugging, heuristic tuning  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing, Serialization)

### 7.1 Enhanced Demo Runner

**Extend**: `agent/src/demo/DemoWrapper.js`  
**Effort**: 4-6 hours

- 🟢 Color-coded output (Belief/Goal/Question)
- 🔴 Duplicate detection
- Filtering by punctuation/priority/depth
- Problem domains: logic, causal, goals, analogy, variables

### 7.2 Web Playground

**Location**: `ui/src/pages/Playground.jsx`  
**Effort**: 3-4 days

- InputPanel (Narsese editor)
- BeliefsPanel (real-time)
- TraceViewer (mermaid from DerivationTracer)
- MemoryGraph (D3 visualization)
- ControlPanel (Step/Run/Pause)

**Leverages**: Existing `ui/src/components/`, `WebSocketManager.js`

### Phase 7 Total: ~1 week

---

## Phase 8: Scale — Advanced Indexing

> **Goal**: Support 100K+ concepts  
> **Effort**: 1-2 weeks  
> **Optional** — defer until needed

```javascript
class TermIndex {
    findByPattern(pattern) → Term[];
    findByOperator(op) → Term[];
    findSimilar(term, k) → Term[];
    topK(k, filter?) → Term[];
}
```

| Scale | Strategy |
|-------|----------|
| <10K | In-memory Map |
| 10K-100K | Trie + B-Tree + LRU |
| 100K-1M | Web Workers |
| 1M+ | External store |

---

## Phase 9: Temporal — NAL-7 (Deferred)

> **Prerequisite**: Temporal representation spec

| Task | Effort |
|------|--------|
| Representation spec | 1 week |
| Operators: `=/>`, `=\>`, `=\|>` | 1 week |
| TemporalBuffer | 1 week |
| NAL-7 rules | 1 week |
| CausalStrategy | 4 hours |

---

## ML Technique Priority

| Technique | Phase | Prereqs | Benefit |
|-----------|-------|---------|---------|
| **TensorFunctor** | 5 | Unifier ✅ | Neural ops as terms |
| **RLFP** | 6 | Phase 5 | Preference learning |
| **Hopfield** | 6+ | Embeddings ✅ | Associative retrieval |
| **Bayesian** | 6+ | None | Principled uncertainty |
| **GNN** | 8+ | Indexing | Graph learning |
| **Differentiable Logic** | 6+ | Phase 5 | End-to-end training |

---

## Ecosystem Status

| Component | Status | Phase |
|-----------|--------|-------|
| MCP Server | ✅ | Done |
| Demo System | ✅ | Done (enhance in 7) |
| Knowledge System | ✅ | Done |
| RLFP | Skeleton | 6 |
| WebSocket API | ✅ | Done |
| REPL | ✅ | Done |
| Tools | ✅ | Done |
| Web Playground | ❌ | 7 |
| TensorFunctor | ❌ | 5 |

---

## Domain Applications

| Domain | Requirements | Phase Ready |
|--------|-------------|-------------|
| **Legal** | Unification ✅ | Now |
| **Education** | Tracing | 4 |
| **Research** | RLFP | 6 |
| **ML Research** | TensorFunctor | 5 |
| **Medical** | Temporal | 9 |
| **Game AI** | Temporal | 9 |

---

## Speculative / Long-Term

| Item | Prereqs |
|------|---------|
| Neuromorphic NARS | Phase 9 |
| Embodied Reasoning | Phase 9 |
| Distributed Multi-Agent | WebSocket ✅ |
| Self-Modifying Architecture | Phase 6 |
| Proof-Carrying Code | Phase 5 |
| Attention-Guided Inference | Embeddings ✅ |
| Belief Compression | Phase 8 |
| Active Learning | Phase 4, 6 |
| Rule Induction | Phase 4, 5 |

---

## Leverage Shortcuts

| Task | Naive | Actual |
|------|-------|--------|
| Tracing | 1 week | **3 hrs** |
| Serialization | 3 days | **2 hrs** |
| Demo Runner | 3-4 days | **4-6 hrs** |
| RLFP | 1 week | **1 week** (after Phase 5) |
| MCP Server | 1 week | **0** (done!) |

---

## Verification

```bash
npm test
npm test -- --testPathPattern=TensorFunctor
npm test -- --testPathPattern=DerivationTracer
node agent/src/mcp/start-server.js
node agent/src/demo/demoRunner.js
node repl/src/Repl.js
```

---

## Key Files

| Purpose | Location |
|---------|----------|
| NAR API | [NAR.js](file:///home/me/senars10/core/src/nar/NAR.js) |
| Unifier | [Unifier.js](file:///home/me/senars10/core/src/term/Unifier.js) |
| Strategies | [strategy/](file:///home/me/senars10/core/src/reason/strategy/) |
| Events | [IntrospectionEvents.js](file:///home/me/senars10/core/src/util/IntrospectionEvents.js) |
| MCP Server | [mcp/Server.js](file:///home/me/senars10/agent/src/mcp/Server.js) |
| Demo System | [demo/](file:///home/me/senars10/agent/src/demo/) |
| RLFP | [rlfp/](file:///home/me/senars10/agent/src/rlfp/) |
| Subsystems | [agent/src/README.md](file:///home/me/senars10/agent/src/README.md) |

---

## Phase Summary

| Phase | Focus | Effort | Unlocks |
|-------|-------|--------|---------|
| **4** | Core Observability | 1 day | Debugging, API |
| **5** | TensorFunctor | 2.5 weeks | Neuro-symbolic, RLFP ML |
| **6** | RLFP | 1 week | Preference learning |
| **7** | Interactive | 1 week | Visual debugging |
| **8** | Scale | 1-2 weeks | 100K+ concepts |
| **9** | Temporal | 4 weeks | NAL-7 |

**Critical Path**: Phase 4 → Phase 5 → Phase 6

---

*Tensor-first architecture. TensorFunctor enables gradient-based RLFP.*  
*Build on what exists. The subsystems are documented and ready.*
