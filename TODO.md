# SeNARS Development Plan

> **Semantic Non-Axiomatic Reasoning System**  

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


---


## Phase 7: RLFP — Reinforcement Learning from Preferences

> **Goal**: Learn reasoning preferences from human feedback  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing), Phase 5 (TensorFunctor)

### 7.1 Trajectory Logger (Complete Skeleton)

**File**: `agent/src/rlfp/ReasoningTrajectoryLogger.js`  
**Effort**: 4 hours

Subscribe to agent events, capture full reasoning traces using DerivationTracer.

### 7.2 Preference Collector

**File**: `agent/src/rlfp/PreferenceCollector.js`  
**Effort**: 4 hours

A/B comparison UI, preference recording.

### 7.3 RLFP Learner with Tensor Support

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

### 7.4 Integration Loop

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

### Phase 7 Total: ~1 week

---

## Phase 8: Interactive — Demo Runner & Playground

> **Goal**: Visual debugging, heuristic tuning  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing, Serialization)

### 8.1 Enhanced Demo Runner

**Extend**: `agent/src/demo/DemoWrapper.js`  
**Effort**: 4-6 hours

- 🟢 Color-coded output (Belief/Goal/Question)
- 🔴 Duplicate detection
- Filtering by punctuation/priority/depth
- Problem domains: logic, causal, goals, analogy, variables

### 8.2 Web Playground

**Location**: `ui/src/pages/Playground.jsx`  
**Effort**: 3-4 days

- InputPanel (Narsese editor)
- BeliefsPanel (real-time)
- TraceViewer (mermaid from DerivationTracer)
- MemoryGraph (D3 visualization)
- ControlPanel (Step/Run/Pause)

**Leverages**: Existing `ui/src/components/`, `WebSocketManager.js`

### Phase 8 Total: ~1 week

---

## Phase 9: Scale — Advanced Indexing

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

## Phase 10: Temporal — NAL-7 (Deferred)

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
| **RLFP** | 6 | Phase 6 | Preference learning |
| **Hopfield** | 6+ | Embeddings ✅ | Associative retrieval |
| **Bayesian** | 6+ | None | Principled uncertainty |
| **GNN** | 8+ | Indexing | Graph learning |
| **Differentiable Logic** | 6+ | Phase 6 | End-to-end training |

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
| Proof-Carrying Code | Phase 6 |
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
