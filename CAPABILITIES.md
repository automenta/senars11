# SeNARS Capabilities

> **Semantic Non-Axiomatic Reasoning System**
> 
> Tested capabilities + development roadmap + theoretical foundations.
> 
> 105 tests verify this system. This document is the successor to TODO.md.

---

## System Identity

SeNARS unifies three AI paradigms into substrate for cognitive architectures:

| Paradigm | What It Does | Current Status |
|----------|--------------|----------------|
| **NAL** | Uncertain reasoning with `%frequency;confidence%` | ✅ NAL-1 to NAL-6 |
| **LM** | Neural text ↔ formal logic translation | ✅ Bidirectional |
| **Prolog** | Deterministic backward chaining + unification | ✅ Full |

**Design Philosophy**: This is substrate. Fork it, break it, grow it into the species you need.

---

# Part I: Proven Capabilities

## 1. Core Primitives

### 1.1 Terms (Immutable Knowledge Atoms)

```javascript
const tf = new TermFactory();

tf.atomic('bird');                     // Atom
tf.variable('?x');                     // Query variable  
tf.inheritance(a, b);                  // <a --> b>
tf.similarity(a, b);                   // <a <-> b>
tf.implication(a, b);                  // (a ==> b)
tf.conjunction([a, b]);                // (&, a, b)
tf.disjunction([a, b]);                // (|, a, b)
tf.product(a, b);                      // (a * b)
```

**Verified Properties:**
- Immutability: Terms frozen after creation
- Normalization: `(&, B, A)` → `(&, A, B)`, duplicates removed
- Traversal: Pre/post-order visitors, reduce operations
- Property-based testing: Idempotent normalization, equality equivalence

### 1.2 Truth Values (NAL Uncertainty)

All 11 NAL truth functions tested ([Truth.test.js](file:///home/me/senars10/tests/unit/core/Truth.test.js)):

| Function | Formula | Purpose |
|----------|---------|---------|
| **Deduction** | `f = f₁ × f₂, c = c₁ × c₂` | Chain inference |
| **Induction** | `f = f₂, c = c₁ × c₂` | Shared subject |
| **Abduction** | `f = f₁, c = min(c₁c₂, c₂)` | Shared predicate |
| **Revision** | Weighted average by confidence | Merge beliefs |
| **Negation** | `f = 1 - f, c = c` | Invert belief |
| **Conversion** | `f = f, c = f × c` | Direction swap |
| **Contraposition** | `f = (1-f₂)(1-f₁)/...` | Negated consequent |
| **Detachment** | `f = f₂, c = f₁ × c₁ × c₂` | Modus Ponens |
| **Analogy** | `f = f₁ × f₂, c = c₁ × c₂ × f₂` | Similarity transfer |
| **Comparison** | Frequency product ratio | Compare beliefs |
| **Expectation** | `e = f × c` | Decision weight |

### 1.3 Unification Engine

```javascript
const unifier = new Unifier(tf);

// Two-way unification
unifier.unify(pattern, term);  
// → { success: true, substitution: { '?X': bird } }

// One-way pattern matching (pattern vars only bind)
unifier.match(pattern, term);

// Syllogistic chain matching
const r1 = unifier.match(tf.inheritance(tf.variable('S'), tf.variable('M')), premise1);
const r2 = unifier.match(tf.inheritance(tf.variable('M'), tf.variable('P')), premise2, r1.substitution);
// r2.substitution = { '?S': bird, '?M': animal, '?P': living }
```

**Verified**: Occurs check, transitive chains, variable renaming

### 1.4 Stamps (Provenance)

```javascript
const derived = Stamp.derive([parent1, parent2]);
// derived.depth = max(parent.depth) + 1
// derived.derivations = merged from all parents
```

---

## 2. Reasoning Engine

### 2.1 NAL Inference Rules

| Rule | Pattern | Evidence |
|------|---------|----------|
| **Modus Ponens** | (a ==> b), a ⊢ b | [ModusPonens.test.js](file:///home/me/senars10/tests/integration/reason/rules/ModusPonens.test.js) |
| **Syllogism** | (a ==> b), (b ==> c) ⊢ (a ==> c) | [SyllogisticReasoning.test.js](file:///home/me/senars10/tests/integration/reason/rules/SyllogisticReasoning.test.js) |
| **Induction** | (M→P), (M→S) ⊢ (S→P) | ✅ |
| **Abduction** | (P→M), (S→M) ⊢ (S→P) | ✅ |
| **Conversion** | (P→S) ⊢ (S→P) with c_new = f × c | ✅ |
| **Contraposition** | (S⇒P) ⊢ (¬P⇒¬S) | ✅ |

### 2.2 Negation Handling

```javascript
// Negation via truth inversion (not separate operator)
// Input:  (--, A). %0.1;0.9%  
// Stored: A. %0.9;0.9%  (f' = 1 - f)

// Smart reductions:
// (--, (--, x)) → x           (double negation)
// (a ==> (--, b)) → (--, (a ==> b))  (implication negation)
```

### 2.3 Premise Formation Strategies

| Strategy | Pattern | Priority |
|----------|---------|----------|
| `TaskMatchStrategy` | Syllogistic shared terms | 1.0 |
| `DecompositionStrategy` | Extract subterms | 0.8 |
| `TermLinkStrategy` | Associative links | 0.6 |

### 2.4 Execution Modes

- **SimpleRunner**: Synchronous, basic control flow
- **PipelineRunner**: Adaptive backpressure, consumer feedback, dynamic throttling

---

## 3. Memory Architecture

### 3.1 Dual Memory System

```javascript
// Long-term memory
memory.addTask(task);
memory.getConcept(term);
memory.consolidate();

// Working memory (Focus)
focus.createFocusSet('goal-processing', 10);
focus.addTaskToFocus(task);  // Priority-based eviction
focus.applyDecay();          // Attention fades over time
```

### 3.2 Resource Management

```javascript
const manager = new MemoryResourceManager({
    maxConcepts: 100,
    memoryPressureThreshold: 0.8
});

manager.isUnderMemoryPressure(stats);
manager.applyAdaptiveForgetting(memory);  // ~10% of concepts
manager.getConceptsByResourceUsage(conceptMap);  // Sorted by usage
```

**Scaling Tiers:**

| Scale | Strategy |
|-------|----------|
| <10K | In-memory Maps |
| 10K-100K | Trie, B-Tree, LRU |
| 100K-1M | Web Workers (sharded) |
| 1M+ | External store |

---

## 4. LM Integration

### 4.1 Provider Ecosystem

```javascript
lm.registerProvider('hf', new HuggingFaceProvider({...}));
lm.registerProvider('tfjs', new TransformersJSModel({...}));

await lm.generateText(prompt, options, 'provider');
await lm.generateEmbedding(text, 'provider');
await lm.streamText(prompt, options, 'provider');
```

### 4.2 Bidirectional Translation

```javascript
lm.translateToNarsese('cat is a mammal');    // → (cat --> mammal)
lm.translateFromNarsese('(dog --> animal).');  // → "A dog is an animal"
```

### 4.3 LM Rules

| Rule | Trigger | Output |
|------|---------|--------|
| NarseseTranslation | Quoted NL | Formal logic |
| ConceptElaboration | Atomic concept | Properties |
| GoalDecomposition | High-priority goal | Sub-goals |
| HypothesisGeneration | Belief | Testable questions |
| VariableGrounding | Term with `$X` | Concrete values |
| AnalogicalReasoning | Problem goal | Analogy solution |

### 4.4 Bidirectional Cycles

```
LM → NAL → LM:
1. "Birds can fly" → <bird --> fly>
2. <canary --> bird> → NAL syllogism → <canary --> fly>
3. LM elaborates derived knowledge

NAL → LM → NAL:
1. (exercise → activity), (activity → healthy) → (exercise → healthy)
2. LM generates hypothesis
3. NAL applies Modus Ponens
```

---

## 5. Prolog Integration

```javascript
await narTool.execute({ action: 'assert_prolog', content: 'parent(alice, bob).' });
await narTool.execute({ action: 'assert_prolog', 
    content: 'ancestor(X,Y) :- parent(X,Z), ancestor(Z,Y).' });
await narTool.execute({ action: 'query_prolog', content: 'ancestor(alice, charlie)?' });
```

**Neurosymbolic Synergy**: Prolog handles recursive ancestry, NAL handles probabilistic trait inheritance.

---

## 6. Infrastructure

### 6.1 EventBus

```javascript
bus.on('taskDerived', handler);
bus.once('startup', onceHandler);
bus.use(async (data) => ({ ...data, enriched: true }));  // Middleware
bus.onError((err, phase, ctx) => log(err));
```

### 6.2 Circuit Breaker

```javascript
const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 5000 });
// CLOSED → (failures) → OPEN → (timeout) → HALF_OPEN → (success) → CLOSED
```

### 6.3 CapabilityManager

```javascript
await mgr.registerCapability('file-read', capability);
await mgr.grantCapabilities('tool', ['file-read'], { approved: true });
await mgr.addPolicyRule('deny-dangerous', { type: 'deny', tools: [...] });
```

---

# Part II: Theoretical Foundations

## Tensor Logic Integration

> Based on "Tensor Logic: The Language of AI" (Domingos, 2024)

### Core Insight

**Logical rules and Einstein summation are the same operation.**

A Datalog rule like `Aunt(x,z) :- Sister(x,y), Parent(y,z)` is equivalent to:

```
A[x,z] = H(S[x,y] × P[y,z])
```

Where `H` is the Heaviside step function and repeated indices are summed (Einstein convention).

### Why This Matters for SeNARS

| Tensor Logic Concept | SeNARS Implementation Path |
|---------------------|---------------------------|
| **Rules = Einsums** | Compile NAL rules to tensor operations |
| **Relations = Sparse Boolean Tensors** | Store beliefs as sparse tensors |
| **Tensor Join = DB Join** | Unify inference with database operations |
| **Embeddings + Rules** | Reasoning in embedding space |

### Sound Reasoning in Embedding Space

**Current approach** (SeNARS today):
- Embeddings for similarity search only
- Reasoning happens in symbolic space

**Tensor Logic approach** (roadmap):
```javascript
// Embed relations as tensor products
EmbR[i,j] = Σ_tuples Emb[x,i] × Emb[y,j]

// Inference via tensor operations
Result = EmbR[i,j] × Emb[query_x, i] × Emb[query_y, j]

// Temperature controls deduction vs analogy:
// T = 0: Pure deduction (no hallucination)
// T > 0: Analogical (similar examples borrow inferences)
```

**Error bound**: Decreases with embedding dimension D. At high D, reasoning is provably sound.

### Implementation Plan

**Phase 1: Tensor Representation**
```javascript
class TensorRelation {
    constructor(embedding_dim) { this.dim = embedding_dim; }
    embed(term) → Float32Array  // d-dimensional
    embedTuple(terms) → outerProduct(terms.map(embed))
    embedRelation(tuples) → sum(tuples.map(embedTuple))
}
```

**Phase 2: Tensor Inference**
```javascript
class TensorInference {
    // Forward chaining: execute equations sequentially
    forward(program, data);
    
    // Backward chaining: goal-directed query
    backward(query, rules, depth);
    
    // Temperature-controlled sigmoid
    apply(equation, T) {
        const result = einsum(equation);
        return T === 0 ? step(result) : sigmoid(result / T);
    }
}
```

**Phase 3: Hybrid Mode**
- T=0 for mathematical truths (no hallucination guarantee)
- Higher T for weak evidence accumulation
- Per-rule temperature settings

---

# Part III: Development Roadmap

## Design Principles

| Principle | Implication |
|-----------|-------------|
| **NAL First** | LM augments, not replaces formal semantics |
| **Declarative** | Logic defined by patterns, not imperative code |
| **Tensor Compiled** | Rules compiled to optimized tensor operations |
| **Observable** | Emit events, bounded retention |
| **Resource-Aware** | Budgets, timeouts, graceful degradation |

---

## Phase 3: Temporal & Goals

> **Status**: Deferred until temporal representations defined

| Task | Effort | Unlocks |
|------|--------|---------|
| Temporal representation spec | 1 week | Foundation |
| Operators: `=/>`, `=|>`, `=\>` | 1 week | NAL-7 |
| TemporalBuffer | 1 week | Event sequences |
| CausalStrategy | 4 hrs | Multi-hop temporal |

---

## Phase 4: Polish & Scale

| Task | Effort | Unlocks |
|------|--------|---------|
| Advanced Indexing | 1-2 weeks | 100K+ concepts |
| Web Playground | 1 week | Developer adoption |
| REST/GraphQL API | 3 days | Integration |
| Benchmark Suite | 3 days | Performance validation |

---

## Phase 5: Tensor Logic (NEW)

| Task | Effort | Unlocks |
|------|--------|---------|
| TensorRelation class | 3 days | Embeddings as sparse tensors |
| Tensor join/projection | 1 week | DB-like operations on embeddings |
| TensorInference engine | 2 weeks | Einsum-based rule execution |
| Temperature parameter | 2 days | Deduction ↔ Analogy control |
| Tucker decomposition | 1 week | GPU scaling |
| Hybrid symbolic-tensor mode | 2 weeks | Best of both |

**Benefits:**
- No hallucination at T=0 (provable soundness)
- Analogical transfer at T>0
- GPU parallelization via einsums
- Error bounds controlled by embedding dimension

---

## Planned Strategies

| Strategy | Depends | Phase |
|----------|---------|-------|
| SemanticStrategy | EmbeddingLayer ✅ | 3 |
| AnalogicalStrategy | Unifier ✅ | 3 |
| GoalDrivenStrategy | NAL-8 | 3 |
| TensorInferenceStrategy | Phase 5 | 5 |
| CausalStrategy | NAL-7 | 4 |

---

## ML Integration Roadmap

| Technique | Priority | Prerequisites |
|-----------|----------|---------------|
| **Tensor Logic** | ⭐⭐⭐ | EmbeddingLayer ✅ |
| **Hopfield** | ⭐⭐⭐ | Embeddings ✅ |
| **RLFP** | ⭐⭐ | Derivation tracing |
| **GNN** | ⭐⭐ | Advanced indexing |
| **Differentiable** | ⭐ | Tensor Logic |

### RLFP (Reinforcement Learning from Preferences)

Learn *how* to think from qualitative feedback:

```
1. ReasoningTrajectoryLogger records episodes
2. PreferenceCollector: "Path A was better than B"
3. RLFPLearner trains preference model
4. ReasoningPolicyAdapter guides Focus, RuleEngine
```

---

## Ecosystem

| Component | Status |
|-----------|--------|
| NARTool | ✅ |
| EmbeddingTool | ✅ |
| ExplanationService | ✅ |
| ToolRegistry | ✅ |
| REST API | ❌ |
| Web Playground | ❌ |
| Obsidian Plugin | ❌ |

---

## Domain Applications

| Domain | Requirements | Phase |
|--------|--------------|-------|
| **Research Assistant** | LM + Focus + Tracing | Now |
| **Legal Reasoning** | Unification + Tracing | 3 |
| **Education** | Serialization + Tracing | 3 |
| **Medical Diagnosis** | Temporal + Embeddings | 4 |
| **Reliable AI** | Tensor Logic (T=0) | 5 |

---

# Part IV: Summary

## NAL Level Completion

| Level | Core | Rules | Strategy | Status |
|-------|------|-------|----------|--------|
| NAL-1 | Inheritance | ✅ | ✅ | Done |
| NAL-2 | Similarity | ✅ | ✅ | Done |
| NAL-3 | Compounds | ✅ | ✅ | Done |
| NAL-4 | Relations | ✅ | ✅ | Done |
| NAL-5 | Implication | ✅ | ✅ | Done |
| NAL-6 | Variables | ✅ | ✅ | Done |
| NAL-7 | Temporal | ❌ | ❌ | Phase 4 |
| NAL-8 | Goals | 🟡 | ✅ | Phase 3 |

## Test Coverage

| Category | Files | Pass Rate |
|----------|-------|-----------|
| Core | 7 | ✅ |
| Memory | 12 | ✅ |
| Reasoning | 22 | ✅ |
| LM | 15 | ✅ |
| Agent | 2 | ✅ |
| Utilities | 8 | ✅ |
| Integration | 30+ | ✅ |
| **Total** | **105** | **99.8%** |

---

## Key Files

| File | Purpose |
|------|---------|
| [Truth.js](file:///home/me/senars10/core/src/Truth.js) | All truth functions |
| [Term.js](file:///home/me/senars10/core/src/term/Term.js) | Term predicates |
| [Unifier.js](file:///home/me/senars10/core/src/term/Unifier.js) | Pattern matching |
| [PrologStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js) | Backward chaining |
| [EmbeddingLayer.js](file:///home/me/senars10/core/src/lm/EmbeddingLayer.js) | Vector embeddings |
| [RuleCompiler.js](file:///home/me/senars10/core/src/reason/rules/compiler/RuleCompiler.js) | Decision trees |

---

*Living document. Rules = Einsums. Fork it, tensor it, grow it.*
