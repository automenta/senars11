# SeNARS Development Roadmap

> **Status**: Living vision document  
> **Last Updated**: 2025-12-14  
> **Foundation**: Java→JS migration complete, modular premise formation, 7 NAL inference rules, 99.8% test pass rate

---

## Table of Contents

1. [Guiding Principles](#guiding-principles)
2. [Immediate Priorities](#immediate-priorities)
3. [NAL Completion](#nal-completion)
4. [Premise Formation & Strategy](#premise-formation--strategy)
5. [Memory & Knowledge Architecture](#memory--knowledge-architecture)
6. [LM-NAL Integration](#lm-nal-integration)
7. [ML Technique Integration](#ml-technique-integration)
8. [Performance & Scalability](#performance--scalability)
9. [Developer Experience](#developer-experience)
10. [Ecosystem & Interoperability](#ecosystem--interoperability)
11. [Domain Applications](#domain-applications)
12. [Speculative & Experimental](#speculative--experimental)

---

## Guiding Principles

| Principle | Description |
|-----------|-------------|
| **NAL First, LM Assist** | Keep formal NAL semantics; LM enhances, doesn't replace |
| **Composable Everything** | Rules, strategies, and layers should be plug-and-play |
| **Observable Reasoning** | Every derivation should be traceable and explainable |
| **Resource-Aware (AIKR)** | Work within limits, not beyond them |
| **Test-Driven** | Every new rule needs test coverage |

---

## Immediate Priorities

> **Next session focus areas** — highest-impact, most urgent items

### 1. NAL Rule Completion
- [ ] `ExemplificationRule` — Reverse syllogism: (S→P), (M→S) ⊢ (M→P)
- [ ] `AnalogyRule` — Similarity-based: (S↔M), (M→P) ⊢ (S→P)
- [ ] `ComparisonRule` — Derive similarity from shared terms
- [ ] `NegationRule` — Handle `(--S)` patterns

### 2. Temporal Foundation
- [ ] Event buffering mechanism for temporal pairing
- [ ] `STMLinker` for short-term memory temporal context
- [ ] Basic temporal operators: `=/>`, `=|>`, `=\>`

### 3. Contradiction Detection
- [ ] `NegationPairingStrategy` — Match `A` with `(--A)`
- [ ] Contradiction density metric for system health

### 4. Debugging & Observability
- [ ] Derivation graph visualizer (TUI or web)
- [ ] "Why-not" explainer — show why a rule didn't fire

---

## NAL Completion

### NAL-4: Remaining Rules
- [ ] `ExemplificationRule` — Reverse syllogism
- [ ] `AnalogyRule` — Similarity-based inference
- [ ] `ComparisonRule` — Derive similarity from shared terms
- [ ] `NegationRule` — Negation patterns
- [ ] `SetOperationRules` — Union, intersection, difference

### NAL-5: Higher-Order Statements
- [ ] Handle `((A→B) → C)` nested inheritance
- [ ] Meta-level inference patterns

### NAL-6: Variable Unification
- [ ] Variable binding: `(?x → animal)`
- [ ] Substitution engine
- [ ] Constraint propagation

### NAL-7: Temporal Reasoning
- [ ] `TemporalInductionRule` — Derive patterns from sequences
- [ ] Allen's interval algebra (before, during, overlaps)
- [ ] Temporal operators: `=/>`, `=|>`, `=\>`
- [ ] Causality vs correlation distinction

### NAL-8: Procedural & Goals
- [ ] Goal decomposition
- [ ] Action planning
- [ ] Goal satisfaction tracking

### NAL-9: Self-Reference & Introspection
- [ ] Self-referential statements
- [ ] Reasoning about own beliefs

### Reference Materials
- OpenNARS: `impl.syl.nal`, `impl.strong.nal`, `conversion.nal`
- [NAL Book](https://www.worldscientific.com/worldscibooks/10.1142/8665)
- OpenNARS `TemporalInductionRules.java`

---

## Premise Formation & Strategy

### New Premise Strategies

| Strategy | Description | Notes |
|----------|-------------|-------|
| `SemanticSimilarityStrategy` | EmbeddingLayer-based semantic matching | Leverage existing Layer infra |
| `NegationPairingStrategy` | Match `A` with `(--A)` | Contradiction detection |
| `AnalogicalStrategy` | Structural patterns across domains | Cross-domain transfer |
| `GoalDrivenStrategy` | Backward-chain from goals | Planning support |
| `CausalChainStrategy` | Follow implication chains | Multi-hop reasoning |
| `AttentionStrategy` | LM-guided focus on "interesting" pairs | Hybrid enhancement |

### Architecture Concerns
- **Premise explosion** — Need smart pruning/ranking
- **Semantic vs structural balance** — Embedding similarity + logical structure
- **Cycle detection** — Avoid redundant derivations
- **Strategy composition** — Combine strategies with weighted voting

### Strategy Evolution
- [ ] Meta-learning: Which strategies yield useful premises?
- [ ] Reinforcement learning for strategy selection
- [ ] Genetic programming for strategy optimization

---

## Memory & Knowledge Architecture

### Term Layer Enhancements
- [ ] **Weighted links** — Decay old links, strengthen used ones
- [ ] **Bidirectional links** — If A→B, also B←A for reverse lookup
- [ ] **Type-specific indexes** — Fast lookup by operator type

### Concept & Belief Management
- [ ] **Belief revision** — NAL-style revision on contradictions
- [ ] **Activation spreading** — Priming related concepts
- [ ] **Forgetting curves** — Time-based priority decay

### Memory Optimization
- [ ] **Term interning** — Deduplicate identical term structures
- [ ] **Flyweight patterns** — Share common substructures
- [ ] **Lazy term parsing** — Don't expand until needed
- [ ] **LRU caches** — Bound memory for caches
- [ ] **WeakRef for links** — GC-friendly link storage

### Scaling Challenges
- In-memory limits: What if concept count exceeds 100K?
- Distributed memory: Shard concepts across workers?
- Persistence: Event sourcing vs snapshot-based?

---

## LM-NAL Integration

> **Current State**: LM rules exist but are keyword-triggered; no systematic NAL↔LM bridge

### Vision: Deep Bidirectional Integration

| Feature | Direction | Purpose |
|---------|-----------|---------|
| LM-Guided Premise Selection | LM→NAL | "Which premises are most relevant?" |
| LM-Assisted Unification | LM→NAL | Fuzzy variable bindings |
| LM Truth Calibration | LM→NAL | Adjust confidence from LM certainty |
| NAL-to-NL Explanations | NAL→LM | Explain chains in natural language |
| NL-to-NAL Ingestion | NL→NAL | Parse natural language to beliefs |
| Abductive Hypothesis | LM→NAL | LM proposes, NAL validates |

### Key Integration Questions
- **When defer to LM?** Threshold-based? Context-based?
- **Uncertainty semantics** — How to reconcile NAL confidence with LM soft probabilities?
- **Pattern learning** — Can LM learn NAL truth function patterns?

---

## ML Technique Integration

> **Design Pattern**: All ML integrations extend the `Layer` interface

### Associative & Memory Networks

| Technique | Use Case | Key Benefit |
|-----------|----------|-------------|
| **Hopfield/Modern Hopfield** | Content-addressable memory | Pattern completion for missing premises |
| **Sparse Distributed Memory (SDM)** | Robust belief storage | Graceful degradation with noise |
| **Neural Turing Machines** | Explicit read/write memory | Learn complex memory patterns |

### Graph-Based Learning

| Technique | Use Case | Key Benefit |
|-----------|----------|-------------|
| **GCN (Graph Convolutional)** | Learn over term/concept graph | Structure-aware representations |
| **GAT (Graph Attention)** | Attention over neighbors | Focus on relevant connections |
| **GraphSAGE** | Inductive learning | Works on unseen nodes |
| **Link Prediction** | Predict missing A→B relationships | Knowledge completion |

### Probabilistic Methods
- [ ] BayesianBeliefLayer — Probability distributions over uncertain terms
- [ ] VariationalTruth — Learn latent truth distributions
- [ ] Uncertainty quantification — Epistemic vs aleatoric separation
- [ ] Bayesian belief revision — Principled evidence updates

### Reinforcement Learning
- [ ] RLRulePrioritizer — Learn rule selection policy via RL
- [ ] RLStrategySelector — Learn which premise strategy to use
- [ ] Multi-Armed Bandit — UCB/Thompson sampling for rule selection
- [ ] Inverse RL — Learn user preferences from observed derivations

### Self-Supervised Learning
- [ ] ContrastiveTermEncoder — Learn term representations via contrast
- [ ] MaskedBeliefPrediction — Mask statement parts, predict rest
- [ ] TemporalContrastive — Learn sequence patterns

### Differentiable Logic
- [ ] NeuralUnificationLayer — Soft unification via embeddings
- [ ] DifferentiableSyllogism — Gradient-friendly rules
- [ ] Neural Logic Programming (TensorLog, DeepProbLog)
- [ ] Proof Attention — Learn which inference path to follow

### Priority Order
1. **Hopfield/Associative** — Most natural fit, fast prototype
2. **GNN Link Prediction** — Leverage graph structure
3. **RL Rule Selection** — Meta-level optimization
4. **Contrastive Term Encoding** — Better embeddings

### Trade-offs Summary

| Technique | Pros | Cons |
|-----------|------|------|
| Hopfield | Fast retrieval, no training | Fixed capacity |
| GNN | Structure-aware | Requires training |
| RL | Adaptive | Sparse rewards |
| Bayesian | Principled uncertainty | Computational cost |
| Neural Provers | End-to-end differentiable | Black-box reasoning |

---

## Performance & Scalability

### Compute Optimizations
- [ ] **Web Workers** — Parallel rule execution in browser
- [ ] **WASM Rules** — Compile hot paths to WebAssembly
- [ ] **SharedArrayBuffer** — Zero-copy between workers
- [ ] **GPU via WebGPU** — Matrix ops for embeddings
- [ ] **SIMD** — Vectorized truth calculations

### Indexing Strategies
- [ ] **Trie for Terms** — O(k) term lookup by structure
- [ ] **Inverted Index** — Fast "find statements containing X"
- [ ] **Bloom Filters** — Fast negative lookups
- [ ] **LSH for Embeddings** — Approximate nearest neighbors
- [ ] **B-Trees for Priority** — Efficient top-k selection

### Algorithm Optimizations
- [ ] **Incremental Unification** — Cache partial results
- [ ] **Rule Compilation** — JIT compile rule guards
- [ ] **Batch Inference** — Process multiple premises together
- [ ] **Derivation Memoization** — Cache recent derivations
- [ ] **Smart Backpressure** — Adaptive throttling by queue depth

### Profiling & Observability
- [ ] Flame graphs for hot paths
- [ ] Derivation metrics — time per rule
- [ ] Memory snapshots — growth patterns

---

## Developer Experience

### Testing Infrastructure
- [ ] **Property-Based Tests** — Generate random NAL statements
- [ ] **Snapshot Testing** — Capture derivation outputs
- [ ] **Fuzz Testing** — Random input to find edge cases
- [ ] **Benchmark Suite** — Regression testing for performance

### Debugging Tools
- [ ] **Time-Travel Debugger** — Replay reasoning steps
- [ ] **Why-Not Explainer** — "Why didn't rule X fire?"
- [ ] **Belief Diff** — Show memory changes between cycles
- [ ] **Visual Graph** — Interactive concept/term graph

### Iteration Speed
- [ ] **Hot Reload Rules** — Change rules without restart
- [ ] **REPL Enhancements** — Tab completion, history
- [ ] **Watch Mode** — Auto-run tests on file change
- [ ] **Web Playground** — Browser-based experimentation

### Documentation
- [ ] Rule catalog with examples
- [ ] Strategy extension guide
- [ ] Truth function reference
- [ ] Migration guide from other NARS implementations

---

## Ecosystem & Interoperability

### External Integrations
- [ ] **MCP Server** — Expose NARS as Model Context Protocol tool
- [ ] **REST/GraphQL API** — Standard query interface
- [ ] **WebSocket Streaming** — Real-time derivation feed
- [ ] **LangChain Tool** — Plug NARS into LangChain agents
- [ ] **Obsidian Plugin** — Personal knowledge management
- [ ] **Discord/Slack Bot** — Conversational interface

### Knowledge Ingestion Pipelines
- [ ] **Wikipedia/Wikidata Loader** — Bulk import structured knowledge
- [ ] **PDF/Doc Parser** — Extract statements from documents
- [ ] **Code AST Ingestion** — Represent code structure as NAL
- [ ] **RSS/API Polling** — Continuous knowledge stream
- [ ] **Image Captioning → NAL** — Visual knowledge via CLIP/BLIP

### Query & Retrieval
- [ ] **Natural Language Questions** — "What do you know about X?"
- [ ] **Explanation Generator** — Show full derivation chain
- [ ] **Hypothetical Reasoning** — "What if A were true?"
- [ ] **Counterfactual Analysis** — "What would change if A were false?"
- [ ] **Nearest Neighbors** — "What's similar to X?"

### Interoperability Standards
- [ ] **OpenNARS Compatibility** — Import/export `.nal` files
- [ ] **OWL/RDF Bridge** — Semantic web integration
- [ ] **Prolog Transpile** — Convert Prolog to NAL
- [ ] **SMT-LIB Export** — Verify with Z3/CVC5
- [ ] **PDDL Export** — Classical planning compatibility

### Community & Standards
- [ ] Rule marketplace — Share rule packages
- [ ] Strategy library — Pre-built premise strategies
- [ ] Benchmark leaderboard — Compare implementations
- [ ] **Narsese 2.0** — Formalize syntax with PEG grammar
- [ ] **NAL-JSON** — Canonical JSON representation
- [ ] **Derivation Logs** — Standard trace format

### Multi-Agent & Distributed
- [ ] Belief sharing between NARS instances
- [ ] Collective reasoning (swarm intelligence)
- [ ] Distributed inference (task partitioning)
- [ ] Standardized inter-agent message format
- [ ] Trust metrics for external beliefs
- [ ] Conflict resolution across agents

---

## Domain Applications

| Domain | Application | Key Features |
|--------|-------------|--------------|
| **Legal** | Case law, statute analysis | Precedent reasoning, rule chains |
| **Medical** | Symptom→condition inference | Uncertainty handling, evidence fusion |
| **Game AI** | NPC decision-making, world modeling | Real-time, resource-constrained |
| **Education** | Adaptive tutoring, problem generation | Explainable reasoning |
| **Code Review** | Logic analysis, improvement suggestions | AST integration |
| **Personal Assistant** | Long-term memory, preference learning | Continuous operation |

---

## Speculative & Experimental

> **Wild Ideas** — High risk, high reward

### Compression & Information Theory
- [ ] **Belief Compression** — Kolmogorov complexity for term simplification
- [ ] **Minimum Description Length** — Prefer simpler explanations
- [ ] **Grammar Induction** — Learn Narsese patterns from use

### Biological Inspiration
- [ ] **Sleep/Consolidation** — Offline memory reorganization
- [ ] **Dreaming** — Random belief recombination for creativity
- [ ] **Emotional Valence** — Priority modulation by "affect"

### Self-Modification
- [ ] **Rule Learning** — Induce new rules from derivations
- [ ] **Strategy Evolution** — Genetic programming for strategies
- [ ] **Architecture Search** — NAS for pipeline components

### Human-in-the-Loop
- [ ] **Active Learning** — Ask user for missing beliefs
- [ ] **Debate Mode** — Present competing derivations for judgment
- [ ] **Crowdsourced Truth** — Aggregate human confidence ratings

### Advanced Architectures
- [ ] **NAL Compiler** — Compile rule chains to WASM
- [ ] **Neuromorphic NARS** — Spiking neural network implementation
- [ ] **NAL-in-Context** — Feed NAL rules to LLM as system prompt
- [ ] **Prolog Interop** — SWI-Prolog integration via WASM
- [ ] **Theorem Proving Bridge** — Export to Lean/Coq for verification
- [ ] **Embodied NARS** — Robotics integration via ROS2

---

## Simplification Opportunities

> **Less is more** — Reduce complexity where possible

### Code Consolidation
- [ ] Merge strategy classes into one `CompositeStrategy` with plugins
- [ ] Unified rule interface: single `Rule.execute(premises)` pattern
- [ ] Configuration simplification: sensible defaults, less boilerplate
- [ ] Audit and remove unused exports

### Architecture Simplification
- [ ] Single event loop — Remove complex async coordination
- [ ] Immutable everything — Eliminate mutation tracking overhead
- [ ] Functional core — Pure functions for all reasoning logic
- [ ] Effect boundary — All I/O at edges only

### API Simplification
- [ ] Fluent builder: `nars.believe("A→B").ask("A→?").run()`
- [ ] Single entry point: `NARS.create(config)` factory
- [ ] Auto-discovery: Rules/strategies self-register
- [ ] Smart defaults: Works out-of-box with zero config

### Dependency Reduction
- [ ] Zero-dep core: Core reasoning with no npm deps
- [ ] Optional everything: LM, embeddings, UI all optional
- [ ] Tree-shakeable: Only ship what's used

### Conceptual Simplification
- [ ] Single truth model: Unify probability/frequency/confidence
- [ ] Universal links: One link type with metadata
- [ ] Flat memory: Remove focus/long-term distinction if unhelpful
- [ ] Sync-first: Make async the exception, not rule

---

## Benchmarks & Evaluation

### NAL Benchmarks
- [ ] Standard syllogistic problems
- [ ] Temporal pattern recognition
- [ ] Multi-hop inference chains
- [ ] Contradiction detection

### Hybrid Benchmarks
- [ ] Commonsense reasoning (COPA, Winograd)
- [ ] Knowledge integration (CSQA)
- [ ] Goal decomposition tasks

### Metrics
- Derivation quality (precision/recall)
- Inference speed (derivations/sec)
- Memory efficiency (concepts/MB)
- LM call frequency (should decrease over time)

---

## Files to Watch

> **Key entry points** for development

| File | Purpose |
|------|---------|
| `core/src/reason/Strategy.js` | Premise formation orchestration |
| `core/src/reason/rules/nal/` | NAL rule implementations |
| `core/src/Truth.js` | Truth function library |
| `core/src/reason/ReasonerBuilder.js` | Rule registration |
| `core/src/memory/Layer.js` | Layer abstraction for ML integration |
| `docs/java/java_to_js.md` | OpenNARS migration reference |

---

## What's Already Built ✅

### Foundation (Complete)
- **Modular Premise Formation**: `TaskMatchStrategy`, `DecompositionStrategy`, `TermLinkStrategy`
- **NAL Inference Rules**: Deduction, Induction, Abduction, Conversion, Contraposition, ModusPonens
- **Stream Architecture**: Async generators with backpressure
- **Java Parity**: Non-temporal rules migrated from OpenNARS
- **Tests**: 491/492 passing (99.8%)

### Key Design Decisions
- Rules are composable via `NALRule.apply()`
- Strategies yield candidates via `async* generateCandidates()`
- Truth functions are pure static methods
- All registered in `ReasonerBuilder.registerDefaultRules()`

---

*This document is a living brainstorm. Revise aggressively.*
