# SeNARS Roadmap: The Ultimate Hybrid NARS/LM Reasoning System

> **Status**: Vision document for review and refinement
> **Created**: 2025-12-14
> **Context**: After completing Java→JS migration, modular premise formation, and 7 NAL inference rules

---

## 🚀 Functionality Multipliers

### Knowledge Ingestion Pipelines
- [ ] **Wikipedia/Wikidata Loader** - Bulk import structured knowledge
- [ ] **PDF/Doc Parser** - Extract statements from documents
- [ ] **Code AST Ingestion** - Represent code structure as NAL statements
- [ ] **RSS/API Polling** - Continuous knowledge stream from web
- [ ] **Image Captioning → NAL** - Visual knowledge via CLIP/BLIP

### Query & Retrieval
- [ ] **Natural Language Questions** - "What do you know about X?"
- [ ] **Explanation Generator** - Show full derivation chain for any belief
- [ ] **Hypothetical Reasoning** - "What if A were true?"
- [ ] **Counterfactual Analysis** - "What would change if A were false?"
- [ ] **Nearest Neighbors** - "What's similar to X?"

### Goal & Planning
- [ ] **Goal Stack Manager** - Hierarchical goal decomposition
- [ ] **Plan Synthesis** - Generate action sequences for goals
- [ ] **Plan Monitoring** - Track progress, replan on failure
- [ ] **Preference Learning** - Learn user goals from feedback

### External Integrations
- [ ] **MCP Server** - Expose NARS as Model Context Protocol tool
- [ ] **REST/GraphQL API** - Standard query interface
- [ ] **WebSocket Streaming** - Real-time derivation feed
- [ ] **LangChain Tool** - Plug NARS into LangChain agents
- [ ] **Obsidian Plugin** - Personal knowledge management
- [ ] **Discord/Slack Bot** - Conversational interface

### Domain Applications
- [ ] **Legal Reasoning** - Case law, statute analysis
- [ ] **Medical Diagnosis** - Symptom→condition inference
- [ ] **Game AI** - NPC decision-making, world modeling
- [ ] **Educational Tutor** - Adaptive problem generation
- [ ] **Code Review** - Analyze logic, suggest improvements

---

## ⚡ Performance Optimizations

### Compute
- [ ] **Web Workers** - Parallel rule execution in browser
- [ ] **WASM Rules** - Compile hot paths to WebAssembly
- [ ] **SharedArrayBuffer** - Zero-copy between workers
- [ ] **GPU via WebGPU** - Matrix ops for embeddings
- [ ] **SIMD** - Vectorized truth calculations

### Memory
- [ ] **Term Interning** - Deduplicate identical term structures
- [ ] **Flyweight Patterns** - Share common substructures
- [ ] **Lazy Term Parsing** - Don't expand until needed
- [ ] **LRU Caches** - Bound memory for caches
- [ ] **WeakRef for Links** - GC-friendly link storage

### Indexing
- [ ] **Trie for Terms** - O(k) term lookup by structure
- [ ] **Inverted Index** - Fast "find statements containing X"
- [ ] **Bloom Filters** - Fast negative lookups
- [ ] **LSH for Embeddings** - Approximate nearest neighbors
- [ ] **B-Trees for Priority** - Efficient top-k selection

### Algorithm
- [ ] **Incremental Unification** - Cache partial unification results
- [ ] **Rule Compilation** - JIT compile rule guards
- [ ] **Batch Inference** - Process multiple premises together
- [ ] **Derivation Memoization** - Cache recent derivations
- [ ] **Smart Backpressure** - Adaptive throttling based on queue depth

### Profiling
- [ ] **Flame Graphs** - Identify hot paths
- [ ] **Derivation Metrics** - Track time per rule
- [ ] **Memory Snapshots** - Understand growth patterns

---

## 🧹 Simplification Opportunities

### Code Consolidation
- [ ] **Merge Strategy Classes** - One `CompositeStrategy` with plugins
- [ ] **Unified Rule Interface** - Single `Rule.execute(premises)` pattern
- [ ] **Configuration Simplification** - Sensible defaults, less boilerplate
- [ ] **Remove Dead Code** - Audit unused exports

### Architecture Simplification
- [ ] **Single Event Loop** - Remove complex async coordination
- [ ] **Immutable Everything** - Eliminate mutation tracking
- [ ] **Functional Core** - Pure functions for all logic
- [ ] **Effect Boundary** - All I/O at edges only

### API Simplification
- [ ] **Fluent Builder** - `nars.believe("A→B").ask("A→?").run()`
- [ ] **Single Entry Point** - One `NARS.create(config)` factory
- [ ] **Auto-Discovery** - Rules/strategies self-register
- [ ] **Smart Defaults** - Works out-of-box with zero config

### Dependency Reduction
- [ ] **Zero-Dep Core** - Core reasoning with no npm deps
- [ ] **Optional Everything** - LM, embeddings, UI all optional
- [ ] **Tree-Shakeable** - Only ship what's used

### Conceptual Simplification
- [ ] **Single Truth Model** - Unify probability/frequency/confidence
- [ ] **Universal Links** - One link type with metadata
- [ ] **Flat Memory** - Remove focus/long-term distinction if unhelpful
- [ ] **Sync-First** - Make async the exception, not rule

---

## 🔧 Developer Productivity

### Testing
- [ ] **Property-Based Tests** - Generate random NAL statements
- [ ] **Snapshot Testing** - Capture derivation outputs
- [ ] **Fuzz Testing** - Random input to find edge cases
- [ ] **Benchmark Suite** - Regression testing for performance

### Debugging
- [ ] **Time-Travel Debugger** - Replay reasoning steps
- [ ] **Why-Not Explainer** - "Why didn't rule X fire?"
- [ ] **Belief Diff** - Show memory changes between cycles
- [ ] **Visual Graph** - Interactive concept/term graph

### Iteration Speed
- [ ] **Hot Reload Rules** - Change rules without restart
- [ ] **REPL Enhancements** - Tab completion, history
- [ ] **Watch Mode** - Auto-run tests on file change
- [ ] **Playground** - Web-based experimentation

---

## 🌐 Ecosystem Plays

### Interoperability
- [ ] **OpenNARS Compatibility** - Import/export `.nal` files
- [ ] **OWL/RDF Bridge** - Semantic web integration
- [ ] **Prolog Transpile** - Convert Prolog to NAL
- [ ] **SMT-LIB Export** - Verify with Z3/CVC5
- [ ] **PDDL Export** - Classical planning compatibility

### Community
- [ ] **Rule Marketplace** - Share rule packages
- [ ] **Strategy Library** - Pre-built premise strategies
- [ ] **Benchmark Leaderboard** - Compare implementations
- [ ] **Tutorial Series** - "NARS in 10 Minutes"

### Standards
- [ ] **Narsese 2.0** - Formalize syntax with PEG grammar
- [ ] **NAL-JSON** - Canonical JSON representation
- [ ] **Derivation Logs** - Standard trace format

---

## 💡 Unconventional Ideas

### Compression as Reasoning
- [ ] **Belief Compression** - Kolmogorov complexity for term simplification
- [ ] **Minimum Description Length** - Prefer simpler explanations
- [ ] **Grammar Induction** - Learn Narsese patterns from use

### Biological Inspiration
- [ ] **Sleep/Consolidation** - Offline memory reorganization
- [ ] **Dreaming** - Random belief recombination for creativity
- [ ] **Emotional Valence** - Priority modulation by "affect"

### Self-Modification
- [ ] **Rule Learning** - Induce new rules from derivations
- [ ] **Strategy Evolution** - Genetic programming for strategies
- [ ] **Architecture Search** - NAS for pipeline components

### Distributed Intelligence
- [ ] **Peer-to-Peer NARS** - Gossip protocol for beliefs
- [ ] **Federated Learning** - Train ML components across instances
- [ ] **Blockchain Anchoring** - Immutable belief provenance

### Human-in-the-Loop
- [ ] **Active Learning** - Ask user for missing beliefs
- [ ] **Debate Mode** - Present competing derivations for judgment
- [ ] **Crowdsourced Truth** - Aggregate human confidence ratings

---



## What We Built Today

### Foundation Completed ✅
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

## Phase 1: Complete NAL Coverage

### Remaining NAL Rules
- [ ] `ExemplificationRule` - Reverse syllogism: (S→P), (M→S) ⊢ (M→P)
- [ ] `AnalogyRule` - Similarity-based: (S↔M), (M→P) ⊢ (S→P)
- [ ] `ComparisonRule` - Derive similarity from shared terms
- [ ] `NegationRule` - Handle `(--S)` patterns
- [ ] `SetOperationRules` - Union, intersection, difference

### NAL Levels
- [ ] **NAL-5**: Higher-order statements `((A→B) → C)`
- [ ] **NAL-6**: Variable unification `(?x → animal)`
- [ ] **NAL-7**: Temporal (see Phase 3)
- [ ] **NAL-8**: Procedural/goals
- [ ] **NAL-9**: Self-reference/introspection

### Reference
- OpenNARS `impl.syl.nal`, `impl.strong.nal`, `conversion.nal`
- [NAL Book](https://www.worldscientific.com/worldscibooks/10.1142/8665)

---

## Phase 2: Premise Formation Innovation

### New Strategies
- [ ] **SemanticSimilarityStrategy** - Use EmbeddingLayer for semantic premise matching
- [ ] **NegationPairingStrategy** - Match `A` with `(--A)` for contradiction detection
- [ ] **AnalogicalStrategy** - Find structurally similar patterns from different domains
- [ ] **GoalDrivenStrategy** - Backward-chain from goals to find supporting premises
- [ ] **CausalChainStrategy** - Follow implication chains for multi-hop reasoning
- [ ] **AttentionStrategy** - LM-guided focus on "interesting" premise pairs

### Concerns
- Premise explosion: Need smart pruning/ranking
- Semantic vs structural: Balance embedding similarity with logical structure
- Cycle detection: Avoid redundant derivations

---

## Phase 3: Temporal Reasoning

### Core Features
- [ ] `TemporalInductionRule` - Derive temporal patterns from sequences
- [ ] `STMLinker` - Short-term memory linking for temporal context
- [ ] `IntervalAlgebra` - Allen's interval relations (before, during, overlaps)
- [ ] Temporal operators: `=/>`, `=|>`, `=\>`

### Challenges
- Event buffering: How long to hold events for temporal pairing?
- Time granularity: Discrete vs continuous time
- Causality: Distinguishing correlation from causation

### Reference
- OpenNARS `TemporalInductionRules.java`
- Java NARS `core()` and `stm()` integration

---

## Phase 4: LM-NAL Deep Integration

### Current State
- LM rules exist but are keyword-triggered
- No systematic NAL↔LM bridge

### Vision
- [ ] **LM-Guided Premise Selection** - "Which of these premises are most relevant?"
- [ ] **LM-Assisted Unification** - Handle fuzzy variable bindings
- [ ] **LM Truth Calibration** - Adjust confidence based on LM certainty
- [ ] **NAL-to-NL Explanations** - Explain inference chains in natural language
- [ ] **NL-to-NAL Ingestion** - Parse natural language into structured beliefs
- [ ] **Abductive Hypothesis Generation** - LM proposes, NAL validates

### Key Questions
- When should NAL defer to LM? (Threshold-based? Context-based?)
- How to maintain NAL's uncertainty semantics with LM's soft probabilities?
- Can LM learn NAL truth function patterns?

---

## Phase 5: Meta-Reasoning & Self-Improvement

### Metacognition
- [ ] **Rule Priority Learning** - Adjust rule priorities based on derivation success
- [ ] **Strategy Efficiency Tracking** - Which strategies yield useful premises?
- [ ] **Attention Budget Optimization** - Learn optimal focus allocation
- [ ] **Derivation Quality Scoring** - Rate derivations for later replay

### Self-Reflection
- [ ] Detect unproductive reasoning loops
- [ ] Recognize knowledge gaps and form targeted questions
- [ ] Monitor contradiction density as health metric

### Reference
- OpenNARS `MetaCognition.java`
- RLFP framework already in SeNARS README

---

## Phase 6: Memory & Knowledge Architecture

### Term Layer Enhancements
- [ ] **Weighted Links** - Decay old links, strengthen frequently-used ones
- [ ] **Bidirectional Links** - If A→B then also B←A for reverse lookup
- [ ] **Type-Specific Indexes** - Fast lookup by operator type

### Concept/Belief Management
- [ ] **Belief Revision** - NAL-style revision when contradictions found
- [ ] **Concept Activation Spreading** - Priming related concepts
- [ ] **Forgetting Curves** - Time-based priority decay

### Scaling Concerns
- In-memory limits: What if concept count exceeds 100K?
- Distributed memory: Shard concepts across workers?
- Persistence: Event sourcing vs snapshot-based?
---

## Phase 6b: ML Technique Integration (Beyond LM)

The Layer abstraction (`Layer.js`) enables pluggable ML backends. Each technique becomes a specialized Layer or Strategy.

### Dense Associative Memory / Modern Hopfield Networks

**Concept**: Continuous Hopfield networks with exponential storage capacity. Perfect for content-addressable memory.

- [ ] **HopfieldLayer** - Extends `Layer` for associative term retrieval
  - Store term embeddings as patterns
  - Query: Given partial pattern, retrieve complete pattern (term completion)
  - Use for: "What term is most associated with this context?"
- [ ] **HopfieldPremiseStrategy** - Use attention mechanism to find relevant premises
  - Input: query term → softmax over stored premise embeddings
  - Returns: top-k most "associated" premises
- [ ] **Implementation**: Use `transformers.js` Hopfield attention or custom JS port
- [ ] **Paper**: [Hopfield Networks is All You Need (2020)](https://arxiv.org/abs/2008.02217)

**Why it fits NARS**: Pattern completion = finding missing premises, Hebbian-style association = belief/term linking

---

### Graph Neural Networks (GNNs)

**Concept**: Learn over the structure of the term/concept graph.

- [ ] **GNNConceptLayer** - Message passing over concept graph
  - Nodes = Terms/Concepts
  - Edges = Inheritance/Similarity/Implication links
  - Output: Learned concept representations
- [ ] **GNNPremiseScorer** - Score premise pairs based on graph context
- [ ] **Link Prediction** - Predict missing `A → B` relationships
- [ ] **Node Classification** - Classify term types/relevance

**Architectures to consider**:
- GCN (Graph Convolutional Networks)
- GAT (Graph Attention Networks) - attention over neighbors
- GraphSAGE - inductive, works on unseen nodes

**Why it fits NARS**: NARS is fundamentally a labeled graph; GNNs learn graph structure natively

---

### Probabilistic / Bayesian Methods

- [ ] **BayesianBeliefLayer** - Maintain probability distributions over uncertain terms
- [ ] **VariationalTruth** - Learn latent truth distributions instead of point estimates
- [ ] **UncertaintyQuantification** - Epistemic vs aleatoric uncertainty separation
- [ ] **Bayesian Belief Revision** - Principled update when new evidence arrives

**Why it fits NARS**: NAL already has uncertainty; Bayesian methods formalize it

---

### Reinforcement Learning Integration

- [ ] **RLRulePrioritizer** - Learn rule selection policy via RL
  - State: current focus, derivation history
  - Action: which rule to apply
  - Reward: derivation usefulness, goal satisfaction
- [ ] **RLStrategySelector** - Learn which premise formation strategy to use
- [ ] **Inverse RL** - Learn user preferences from observed derivations
- [ ] **Multi-Armed Bandit** - Simpler: UCB/Thompson sampling for rule selection

**Why it fits NARS**: NARS already has goal-driven behavior; RL optimizes the meta-level

---

### Differentiable Logic / Neural Theorem Provers

- [ ] **NeuralUnificationLayer** - Soft unification via embeddings
- [ ] **DifferentiableSyllogism** - Gradient-friendly inference rules
- [ ] **Neural Logic Programming** (e.g., TensorLog, DeepProbLog)
- [ ] **Proof Attention** - Learn which inference path to follow

**Papers**:
- [Neural Theorem Provers](https://arxiv.org/abs/1705.11040)
- [DeepProbLog](https://arxiv.org/abs/1805.10872)

**Why it fits NARS**: Bridging symbolic NAL rules with gradient-based learning

---

### Memory-Augmented Networks

- [ ] **NTMLayer** - Neural Turing Machine for explicit read/write memory
- [ ] **DNCLayer** - Differentiable Neural Computer for complex memory ops
- [ ] **MemoryAttention** - Attention over belief memory bank

**Why it fits NARS**: NARS has explicit memory; MANNs learn to use memory

---

### Self-Supervised / Contrastive Learning

- [ ] **ContrastiveTermEncoder** - Learn term representations via contrast
  - Positive pairs: related terms (same concept)
  - Negative pairs: unrelated terms
- [ ] **MaskedBeliefPrediction** - Mask part of statement, predict rest
- [ ] **TemporalContrastive** - Learn sequence patterns via contrastive loss

**Why it fits NARS**: Self-supervision = learning from structure without labels

---

### Sparse Distributed Memory (SDM)

**Concept**: Kanerva's SDM - high-dimensional sparse binary memory

- [ ] **SDMLayer** - Store/retrieve beliefs in high-D binary space
- [ ] Auto-associative retrieval for similar beliefs
- [ ] Graceful degradation with noise

**Why it fits NARS**: SDM shares DNA with Hopfield; good for robustness

---

### Clustering / Concept Formation

- [ ] **OnlineClusteringLayer** - Dynamic concept grouping
- [ ] **HierarchicalConcepts** - Learn concept taxonomies automatically
- [ ] **PrototypeNetworks** - Few-shot concept learning

**Why it fits NARS**: Concept formation is core to NARS; clustering automates it

---

### Fast Feedforward Networks

- [ ] **FFNRuleClassifier** - Fast rule applicability check via FFN
- [ ] **FFNTruthPredictor** - Predict derived truth values directly
- [ ] Use for: Speed up guard checks, pre-filter non-applicable rules

**Why it fits NARS**: Performance optimization for hot paths

---

### Implementation Pattern

All ML integrations follow the Layer interface:

```javascript
class HopfieldLayer extends Layer {
  async addLink(source, target, priority) { /* store pattern */ }
  async getLinks(term, limit, minPriority) { /* pattern retrieval */ }
  async findSimilar(queryEmbed, k) { /* attention-based search */ }
}
```

### Concerns & Trade-offs

| Technique | Pros | Cons |
|-----------|------|------|
| Hopfield | Fast retrieval, no training | Fixed capacity, preprocessing |
| GNN | Structure-aware | Requires graph batching, training |
| RL | Adaptive | Sparse rewards, stability |
| Bayesian | Principled uncertainty | Computational cost |
| Neural Provers | End-to-end differentiable | Black-box reasoning |

### Priority Order for ML Integration

1. **Hopfield/Associative** - Most natural fit, fast prototype
2. **GNN Link Prediction** - Leverage graph structure
3. **RL Rule Selection** - Meta-level optimization
4. **Contrastive Term Encoding** - Better embeddings

---



### Agent Communication
- [ ] Belief sharing between NARS instances
- [ ] Collective reasoning (swarm intelligence)
- [ ] Distributed inference (task partitioning)

### Protocols
- [ ] Standardize inter-agent message format (Narsese over JSON?)
- [ ] Trust metrics for external beliefs
- [ ] Conflict resolution across agents

---

## Phase 8: Evaluation & Benchmarks

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

## Phase 9: Developer Experience

### Tooling
- [ ] Visual derivation graph explorer
- [ ] Rule debugging mode (show why rule fired/didn't fire)
- [ ] Premise formation trace
- [ ] TUI enhancements for live reasoning

### Documentation
- [ ] Rule catalog with examples
- [ ] Strategy extension guide
- [ ] Truth function reference
- [ ] Migration guide from other NARS implementations

---

## Wild Ideas 🚀

### Speculative/Experimental
- [ ] **NAL Compiler** - Compile rule chains to WASM for speed
- [ ] **Neuromorphic NARS** - Implement on spiking neural networks
- [ ] **NAL-in-Context** - Feed NAL rules to LLM as system prompt
- [ ] **Prolog Interop** - Direct SWI-Prolog integration via WASM
- [ ] **Theorem Proving Bridge** - Export to Lean/Coq for formal verification
- [ ] **Game AI** - NARS for game agent reasoning (Minecraft, etc.)
- [ ] **Embodied NARS** - Robotics integration via ROS2
- [ ] **Personal Assistant Core** - Long-term memory + preference learning

---

## Immediate Next Steps (Priority Order)

1. **Finish NAL-4**: Exemplification, Analogy, Comparison rules
2. **Temporal Foundation**: Event buffering and STMLinker
3. **LM Premise Guidance**: Let LM rank premise candidates
4. **Contradiction Detection**: NegationPairingStrategy
5. **Visual Debugging**: Derivation graph in TUI or web UI

---

## Files to Watch

| File | Reason |
|------|--------|
| `core/src/reason/Strategy.js` | Premise formation orchestration |
| `core/src/reason/rules/nal/` | All NAL rule implementations |
| `core/src/Truth.js` | Truth function library |
| `core/src/reason/ReasonerBuilder.js` | Rule registration |
| `docs/java/java_to_js.md` | Migration reference |

---

## Principles

1. **NAL First, LM Assist** - Keep formal semantics; LM enhances, doesn't replace
2. **Composable Everything** - Rules, strategies, and layers should be plug-and-play
3. **Observable Reasoning** - Every derivation should be explainable
4. **Resource-Aware** - AIKR principle: work within limits, not beyond
5. **Test-Driven** - Every new rule needs test coverage

---

*This document is a living brainstorm. Revise aggressively.*
