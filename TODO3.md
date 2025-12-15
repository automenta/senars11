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

---

## Quick Reference

| I want to... | Command / Location |
|--------------|-------------------|
| Run reasoning | `const nar = new NAR(); nar.input('(a --> b).');` |
| Start REPL | `node repl/src/Repl.js` |
| Run demos | `node agent/src/demo/demoRunner.js` |
| Start MCP server | `node agent/src/mcp/start-server.js` |
| Run all tests | `npm test` |
| WebSocket monitor | `node agent/src/server/WebSocketMonitor.js` |

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
| **Persistence** | `PersistenceManager.js` | — | ✅ |
| **Display** | `DisplayUtils.js` | — | ✅ |

### NAL Completion

| Level | Core | Rules | Strategy | Status |
|-------|------|-------|----------|--------|
| NAL-1 | Inheritance | ✅ | ✅ | ✅ |
| NAL-2 | Similarity | ✅ | ✅ | ✅ |
| NAL-3 | Compounds | ✅ | ✅ | ✅ |
| NAL-4 | Relations | ✅ | ✅ | ✅ |
| NAL-5 | Implication | ✅ | ✅ | ✅ |
| NAL-6 | Variables | ✅ | ✅ | ✅ |
| NAL-7 | Temporal | ❌ | ❌ | Deferred |
| NAL-8 | Goals | ✅ | ✅ | ✅ |

### Test Coverage: 105 files, 99.8% pass

---

## Phase 4: Architectural Foundation

> **Goal**: Establish flexible, complete infrastructure supporting all future phases  
> **Effort**: ~3-4 days total

### 4.1 DerivationTracer — Universal Observability

**File**: `core/src/util/DerivationTracer.js`  
**Effort**: 3 hours  
**Unlocks**: Debugger, Explainer, RLFP rewards, Why-Not analysis, Visualization

**Interface**:
```javascript
class DerivationTracer {
    constructor(eventBus);
    
    // Lifecycle
    startTrace(task?) → traceId;
    endTrace(traceId?) → Trace;
    
    // Recording (auto via events)
    _recordStep(event);      // RULE_FIRED
    _recordSkip(event);      // RULE_NOT_FIRED
    _recordDerivation(event); // REASONING_DERIVATION
    
    // Query
    getTrace(traceId) → Trace;
    getActiveTrace() → Trace | null;
    
    // Export
    export(traceId, format: 'json' | 'mermaid' | 'dot' | 'html') → string;
    
    // Analysis
    findPath(from, to) → Step[];        // Derivation path between terms
    whyNot(term) → Skip[];              // Why term wasn't derived
    hotRules() → Map<ruleName, count>;  // Most-fired rules
    
    // Persistence
    save(traceId, path);
    load(path) → Trace;
}
```

**Trace Structure**:
```javascript
{
    id: string,
    task: TaskSerialized | null,
    startTime: number,
    endTime: number | null,
    steps: [{
        timestamp: number,
        rule: string,
        premises: TaskSerialized[],
        conclusion: TaskSerialized,
        truth: { frequency, confidence },
        depth: number
    }],
    skips: [{
        timestamp: number,
        rule: string,
        reason: string
    }],
    derivations: TaskSerialized[],
    metrics: {
        totalSteps: number,
        uniqueRules: Set<string>,
        maxDepth: number,
        duration: number
    }
}
```

**Leverages**: `TraceId.js`, `IntrospectionEvents`, `task.serialize()`, `EventBus`

---

### 4.2 Serializer — Unified Data Exchange

**File**: `core/src/util/Serializer.js`  
**Effort**: 2 hours  
**Unlocks**: API payloads, Playground, Import/Export, State snapshots

**Interface**:
```javascript
class Serializer {
    // Core
    static toJSON(entity) → object;
    static fromJSON(json, type: 'task' | 'term' | 'memory' | 'nar') → Entity;
    
    // Narsese
    static toNarsese(task) → string;
    static fromNarsese(str) → Term;
    
    // Detection
    static detect(input) → 'json' | 'narsese' | 'object';
    static parse(input, defaultType?) → Entity;
    
    // Bulk
    static exportState(nar) → NARState;
    static importState(nar, state);
    
    // Versioning
    static version(state) → VersionedState;
    static migrate(state, toVersion) → State;
}
```

**State Structure**:
```javascript
{
    version: string,
    timestamp: number,
    nar: {
        memory: MemorySerialized,
        taskManager: TaskManagerSerialized,
        focus: FocusSerialized,
        config: ConfigSerialized
    },
    traces?: TraceSerialized[]
}
```

**Leverages**: Existing `serialize()` on NAR, Memory, Task, Term, Bag, Concept, Focus

---

### 4.3 Enhanced Demo Runner — Multi-Domain Interactive Testing

**Extend**: `agent/src/demo/DemoWrapper.js`  
**Effort**: 4-6 hours  
**Unlocks**: Visual debugging, Heuristic tuning, Regression detection

**New Features**:

| Feature | Implementation |
|---------|---------------|
| **Color Coding** | 🟢 Belief `.` 🟡 Goal `!` 🔵 Question `?` 🔴 Error/Duplicate |
| **Duplicate Detection** | Hash derivations, highlight repeats |
| **Filtering** | By punctuation, priority, depth, rule name, truth threshold |
| **Truth Evolution** | Track f/c changes over steps |
| **Metrics Panel** | derivations/sec, concepts, depth, memory pressure |
| **Problem Domains** | Logic, Causal, Goals, Analogy, Variables, Semantic |

**Problem Domains** (exercise all rules):
```javascript
const DOMAINS = {
    logic: '(bird-->animal). (robin-->bird). (robin-->?x)?',
    causal: '(rain==>wet). (wet==>slippery). rain. slippery?',
    goals: '((work&go_store)==>have_food). have_food!',
    analogy: '(bird<->airplane). (bird-->flyer). (airplane-->?x)?',
    variables: '(cat-->animal). (dog-->animal). ($x-->animal)?',
    semantic: /* Uses EmbeddingLayer for similarity */
};
```

**UI (Ink/Terminal)**:
```
┌─ SeNARS Demo Runner ─────────────────────────────────────────┐
│ Problem: [▼ logic ]  Filter: [.!?] [pri>0.3] [depth<5]       │
├──────────────────────────────────────────────────────────────┤
│ DERIVATIONS                                                  │
│ 🟢 01  Syllogism: (robin-->animal) %0.81;0.73% d=1          │
│ 🔵 02  Answer: ?x=animal %0.81;0.73% d=2                    │
│ 🔴 03  [DUP] (robin-->animal)                                │
├──────────────────────────────────────────────────────────────┤
│ [Step] [Run 10] [Run Until] [Pause] [Reset] [Export]         │
├──────────────────────────────────────────────────────────────┤
│ 12 derivations | 0.3ms/step | 5 concepts | Depth: 2          │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.4 LM Configuration System

**Extend**: `repl/src/Repl.js` + new `core/src/lm/LMConfig.js`  
**Effort**: 3 hours  
**Unlocks**: Easy provider switching, Persistent preferences, Multi-model support

**LMConfig Interface**:
```javascript
class LMConfig {
    // Providers
    static PROVIDERS = ['transformers', 'ollama', 'openai', 'huggingface', 'dummy'];
    
    // Configuration
    setProvider(name, config);
    getProvider(name) → ProviderConfig;
    getActive() → ProviderConfig;
    setActive(name);
    
    // Persistence
    save(path?);
    load(path?);
    
    // Validation
    test(name?) → Promise<boolean>;
}
```

**Provider Configs**:
```javascript
{
    transformers: { model: 'Xenova/all-MiniLM-L6-v2' },
    ollama: { url: 'http://localhost:11434', model: 'llama2' },
    openai: { apiKey: 'sk-...', model: 'gpt-4' },
    huggingface: { model: 'HuggingFaceTB/SmolLM-135M', device: 'cpu' }
}
```

**REPL Menu**:
```
┌─ LM Configuration ─────────────────────────────────────────┐
│ [●] Transformers.js (Default - No API Key)                 │
│     Model: Xenova/all-MiniLM-L6-v2                         │
│ [○] Ollama                                                 │
│     URL: http://localhost:11434                            │
│     Model: llama2                                          │
│ [○] OpenAI                                                 │
│     API Key: sk-••••••••                                   │
│ [○] HuggingFace                                            │
│                                                            │
│ [Test Connection] [Save] [Cancel]                          │
└────────────────────────────────────────────────────────────┘
```

---

### 4.5 Advanced Indexing — Scalable Memory

**File**: `core/src/memory/TermIndex.js`  
**Effort**: 1-2 weeks (optional, Phase 4.5+)  
**Unlocks**: 100K+ concepts, GNN, Large knowledge bases

**Interface**:
```javascript
class TermIndex {
    // Query
    findByPattern(pattern) → Term[];
    findByOperator(op) → Term[];
    findContaining(subterm) → Term[];
    topK(k, filter?) → Term[];
    
    // Semantic
    findSimilar(term, k, threshold?) → Term[];
    
    // Maintenance
    add(term);
    remove(term);
    reindex();
    
    // Stats
    size() → number;
    stats() → IndexStats;
}
```

**Scaling Strategy**:
| Scale | Implementation |
|-------|---------------|
| <10K | In-memory Map |
| 10K-100K | Trie + B-Tree + LRU eviction |
| 100K-1M | Web Workers + SharedArrayBuffer |
| 1M+ | External store (SQLite, LevelDB) |

---

### 4.6 Web Playground Foundation

**Location**: `ui/src/pages/Playground.jsx`  
**Effort**: 2-3 days  
**Unlocks**: Browser-based interaction, Visualization, Demos

**Architecture**:
```
┌────────────┐      WebSocket      ┌──────────────────┐
│  Playground │ ◄─────────────────►│ WebSocketMonitor │
│  (React)    │                    │ + NAR            │
└────────────┘                     └──────────────────┘
```

**Components**:
- **InputPanel**: Narsese editor with syntax highlighting
- **BeliefsPanel**: Real-time belief list with filtering
- **TraceViewer**: Mermaid diagram from DerivationTracer
- **MemoryGraph**: D3/vis.js concept visualization
- **ControlPanel**: Step/Run/Pause/Reset
- **MetricsPanel**: Performance stats

**Leverages**: Existing `ui/src/components/`, `DemoRunnerApp.js`, `WebSocketManager.js`

---

### Phase 4 Summary

| Task | Effort | Unlocks |
|------|--------|---------|
| 4.1 DerivationTracer | 3 hrs | Debugging, RLFP, Explainer |
| 4.2 Serializer | 2 hrs | API, Import/Export |
| 4.3 Demo Runner | 4-6 hrs | Visual testing, Tuning |
| 4.4 LM Config | 3 hrs | Provider switching |
| 4.5 Advanced Indexing | 1-2 wks | Scale (optional) |
| 4.6 Web Playground | 2-3 days | Browser UI |
| **Core (4.1-4.4)** | **~1.5 days** | |
| **Full Phase 4** | **~1 week** | |

---

## Phase 5: RLFP Integration

**Skeleton exists** — complete per [RLFP README](file:///home/me/senars10/agent/src/rlfp/README.md):

1. **ReasoningTrajectoryLogger** — Subscribe to agent events, capture full traces
2. **PreferenceCollector** — File-based A/B comparison UI
3. **RLFPLearner** — Apply preference updates (proof-of-concept)
4. **Integration script** — Orchestrate the feedback loop

**Effort**: 1 day

---

## Phase 6: ML as Terms

> Models = Terms = Knowledge = Prolog-queryable

### TensorFunctor
**File**: `core/src/functor/TensorFunctor.js`

```javascript
class TensorFunctor extends Functor {
    evaluate(term, bindings) {
        switch (term.operator) {
            case 'matmul': return matmul(this.resolve(term.comp(0)), this.resolve(term.comp(1)));
            case 'add': return add(...);
            case 'relu': return relu(...);
            case 'sigmoid': return sigmoid(...);
            case 'softmax': return softmax(...);
            case 'layer': return this.chain(term.components);
            case 'grad': return this.gradient(term.comp(0));
        }
    }
}
```

### MLP as Terms
```prolog
mlp(Input, Output) :-
    layer(Input, H1, w1, b1, relu),
    layer(H1, H2, w2, b2, relu),
    layer(H2, Output, w3, b3, sigmoid).

layer(In, Out, W, B, Act) :-
    Out is Act(add(matmul(W, In), B)).

% Forward pass
?- mlp([0.5, 0.3, 0.2], Prediction).

% Introspection
?- mlp(_, _), layer(_, H1, W, _, _).  % Query hidden weights
```

### Implementation Plan

| Task | Effort |
|------|--------|
| TensorFunctor base | 3 days |
| Core ops (matmul, add, transpose) | 2 days |
| Activations (relu, sigmoid, softmax) | 1 day |
| Gradient tracking | 1 week |
| Backprop via term differentiation | 2 weeks |
| Integration tests | 3 days |
| **Total** | **~4 weeks** |

### ML Technique Priority

| Technique | Prereqs | Benefit | Effort |
|-----------|---------|---------|--------|
| **Hopfield** | Embeddings ✅ | Associative retrieval | 1 week |
| **Bayesian** | None | Principled uncertainty | 2 weeks |
| **RL** | RLFP, Tracing | Adaptive behavior | 2 weeks |
| **GNN** | Indexing | Graph structure learning | 3 weeks |
| **Differentiable Logic** | Unifier ✅ | End-to-end training | 4 weeks |

---

## Phase 7: Temporal (Deferred)

**Prerequisite**: Temporal representation spec

| Task | Effort |
|------|--------|
| Temporal representation spec | 1 week |
| Operators: `=/>` (predictive), `=\>` (retrospective), `=\|>` (concurrent) | 1 week |
| TemporalBuffer | 1 week |
| NAL-7 rules | 1 week |
| CausalStrategy | 4 hours |

```javascript
class TemporalBuffer {
    add(event, timestamp?);
    getWindow(start, end);
    findSequences(pattern, minGap, maxGap);
    detectCausality(a, b, threshold);
}
```

---

## Ecosystem Status

| Component | Status | Notes |
|-----------|--------|-------|
| MCP Server | ✅ | 5 tools: reason, memory-query, execute-tool, evaluate_js, get-focus |
| Demo System | ✅ | start/stop/pause/resume/step, metrics, WebSocket |
| Knowledge System | ✅ | Knowing, KnowledgeBaseConnector, NarseseTemplate |
| RLFP | Skeleton | Needs event integration |
| WebSocket API | ✅ | Batching, rate limiting, subscriptions |
| REPL | ✅ | Ink TUI with help, status, memory commands |
| Tools | ✅ | NARTool, EmbeddingTool, ExplanationService, ToolRegistry |
| Persistence | ✅ | PersistenceManager |
| Web Playground | ❌ | Phase 4.6 |
| GraphQL over WS | ❌ | Future |
| Obsidian Plugin | ❌ | Future (leverage MCP) |
| VSCode Extension | ❌ | Future (leverage MCP) |

---

## Domain Applications

| Domain | Requirements | Application |
|--------|-------------|-------------|
| **Legal** | Unification ✅, Tracing | Precedent search, case analogy, argument chains |
| **Education** | Tracing, Serialization | Interactive tutor, step-by-step explanations |
| **Medical** | Embeddings ✅, Temporal | Diagnosis reasoning, symptom chains |
| **Game AI** | Goals ✅, Temporal | NPC behavior, planning, emergent narratives |
| **Research** | RLFP, Tracing | Hypothesis generation, experiment planning |
| **Personal KB** | Knowledge, Persistence | Lifelong memory, note reasoning |

---

## Speculative / Long-Term

| Item | Description | Prereqs |
|------|-------------|---------|
| **Neuromorphic NARS** | Hardware-native spiking implementation | Temporal |
| **Embodied Reasoning** | Robotics, sensorimotor integration | Temporal, Goals |
| **Distributed Multi-Agent** | Agent society, collective reasoning | WebSocket |
| **Self-Modifying Architecture** | Meta-learning, architecture evolution | RLFP |
| **Proof-Carrying Code** | Verified neuro-symbolic programs | TensorFunctor |
| **Attention-Guided Inference** | Transformer-style premise selection | Embeddings |
| **Belief Compression** | Term clustering for large KBs | Indexing |
| **Active Learning** | Knowledge gap detection | Tracing, RLFP |
| **Rule Induction** | Learn new rules from traces | Tracing, ML |

---

## Leverage Shortcuts

| Task | Naive | Actual | Why |
|------|-------|--------|-----|
| Demo Runner | 3-4 days | **4-6 hrs** | Extend DemoWrapper |
| RLFP | 1 week | **1 day** | Skeleton exists |
| MCP Server | 1 week | **0** | Already done! |
| Serialization | 3 days | **2 hrs** | Facade over existing |
| Tracing | 1 week | **3 hrs** | Wire existing events |
| LM Config | 4 hrs | **3 hrs** | Extend existing patterns |

---

## Verification

```bash
# All tests
npm test

# Specific components
npm test -- --testPathPattern=DerivationTracer
npm test -- --testPathPattern=Serializer

# Systems
node agent/src/mcp/start-server.js
node agent/src/demo/demoRunner.js
node repl/src/Repl.js

# Demos
node examples/phase10-final-demo.js
node examples/repl/run-all-demos.js
```

---

## Key Files

| Purpose | Location |
|---------|----------|
| NAR API | [NAR.js](file:///home/me/senars10/core/src/nar/NAR.js) |
| Truth Functions | [Truth.js](file:///home/me/senars10/core/src/Truth.js) |
| Unifier | [Unifier.js](file:///home/me/senars10/core/src/term/Unifier.js) |
| Strategies | [strategy/](file:///home/me/senars10/core/src/reason/strategy/) |
| Events | [IntrospectionEvents.js](file:///home/me/senars10/core/src/util/IntrospectionEvents.js) |
| TraceId | [TraceId.js](file:///home/me/senars10/core/src/util/TraceId.js) |
| MCP Server | [mcp/Server.js](file:///home/me/senars10/agent/src/mcp/Server.js) |
| Demo System | [demo/DemoWrapper.js](file:///home/me/senars10/agent/src/demo/DemoWrapper.js) |
| RLFP | [rlfp/](file:///home/me/senars10/agent/src/rlfp/) |
| Knowledge | [know/](file:///home/me/senars10/agent/src/know/) |
| Subsystem Index | [agent/src/README.md](file:///home/me/senars10/agent/src/README.md) |

---

*Synthesized from TODO.md, CAPABILITIES.md, and comprehensive codebase analysis.*  
*Phase 4 establishes the architectural foundation for all future phases.*  
*Build on what exists. The subsystems are documented and ready.*
