# SeNARS: The Cognitive Agent Platform
*Design Document, System Evaluation & Strategic Roadmap*

## 1. Executive Summary
SeNARS is a **Neuro-Symbolic Cognitive Agent Platform** that hybridizes the precision of Non-Axiomatic Logic (NAL) with the semantic flexibility of Language Models (LMs). Unlike simple "LLM wrappers", SeNARS provides a grounded "conscious" reasoning engine (NAL) that supervises a "subconscious" neural engine (LM), creating an agent that is explainable, reliable, and capable of long-term learning.

This document serves as the master plan to evolve SeNARS from a sophisticated prototype into a production-grade Cognitive Architecture.

---

## 2. System Architecture & Capabilities
*The "Sum Total" of current and implied functionality.*

### 2.1 The Neuro-Symbolic Core
*   **Stream Reasoner**: A robust, async pipeline (`RuleProcessor.js`) that handles infinite data streams with backpressure.
*   **Dual Memory**: A complex memory system (`MemoryConsolidation.js`) implementing "activation propagation", mimicking biological spreading activation.
*   **Hybrid Logic**: A design where LMs are invoked via `LMRule`s, constrained by NAL truth values (`Truth.js`).
*   **Immutability**: `Term` and `Task` are immutable DAGs (Direct Acyclic Graphs), managed by `TermFactory` with canonicalization.

### 2.2 The Agent Platform (MCP)
*   **Model Context Protocol (MCP)**: SeNARS implements a dual-mode MCP system (`src/mcp/`), allowing it to:
    *   **Act as a Server**: Expose its reasoning capabilities to other apps (e.g., "Hey Claude, ask SeNARS to reason about this").
    *   **Act as a Client**: Use external tools (filesystem, web search, APIs) via the standard MCP interface.
*   **CLI & REPL**: A rich command-line interface (`src/repl/commands`) supporting debugging (`trace`, `plan`), introspection (`beliefs`, `concepts`), and scripting (`.nars` files).

### 2.3 The Interface
*   **Web UI**: A React-based interface (`ui/`) capable of visualizing the concept graph and interaction logs.
*   **E2E Testing**: A Playwright suite (`ui/tests/e2e`) verifying the "Golden Path" of user interaction.

---

## 3. Critical Analysis & Technical Debt

### 3.1 Strengths
*   **Architecture**: The separation of `PremiseSource`, `Strategy`, and `RuleProcessor` is world-class design for a streaming reasoner.
*   **Standards**: Adoption of MCP positions SeNARS perfectly in the modern AI agent ecosystem.
*   **Immutability**: Strict immutability ensures thread-safety and effective caching.

### 3.2 Critical Weaknesses (The "Blocking" Issues)
*   **Fake Benchmarks**: The `BenchmarkRunner.js` currently uses **execution stubs** with random sleep timers. It does not actually run the reasoning engine against the benchmark files. This gives a false sense of performance.
*   **Broken Rule Optimization**: The `RuleExecutor.js` attempts optimization but uses mismatched keys (`rule.type` vs `heuristicKey`), causing a silent performance regression to O(N) linear scans.
*   **Inconsistent Variable Support**: The Parser (`narsese.peggy`) supports Independent (`$`), Dependent (`#`), and Query (`?`) variables, but `Term.js` logic only explicitly handles `?`. This will break advanced NAL rules (Unification).
*   **Incomplete Logic**: The system implements the *math* for Induction/Abduction/Analogy (`Truth.js`) but lacks the *rules* to trigger them (`src/reason/rules/nal`).
*   **Dependency Rot**: The `danfojs` dependency is broken, breaking analysis scripts.

---

## 4. Strategic Roadmap

### Phase 1: Foundation & Integrity (Immediate)
*   **Theme**: Truth & Stability.
*   **Key Deliverable**: A system that actually runs what it claims to run.
    *   **Real Benchmarks**: Connect `BenchmarkRunner` to the actual `NAR` engine.
    *   **Fix Optimization**: Make `RuleExecutor` decision tree work.
    *   **Fix Dependencies**: Resolve `danfojs`.
    *   **Unify Variables**: Ensure `Term.js` handles all variable types correctly.

### Phase 2: The Reasoning Engine (Short-term)
*   **Theme**: Make it smart.
*   **Key Deliverable**: Parity with standard NARS logic.
    *   Implement **Induction**, **Abduction**, **Revision**, **Analogy**, **Comparison**.
    *   Add unit tests for these specific logical operations.

### Phase 3: The Agentic Layer (Mid-term)
*   **Theme**: Make it useful.
*   **Key Deliverable**: A truly agentic system that uses tools effectively.
    *   **Chain-of-Thought (CoT)**: Implement multi-step reasoning rules for LMs.
    *   **Advanced MCP**: Expose more internal tools (e.g., "Add Goal") via MCP.
    *   **RAG**: Connect `EmbeddingLayer` to `Memory` for semantic retrieval.

### Phase 4: The Observable Mind (Long-term)
*   **Theme**: Make it beautiful.
*   **Key Deliverable**: Real-time "Thought Bubble" visualization in the UI.
    *   Visualize Activation Propagation live.
    *   Interactive Concept Graph.

---

## 5. Detailed Implementation Tasks

### 5.1 Maintenance & Integrity
- [ ] **Real Benchmarks**: Rewrite `src/testing/BenchmarkRunner.js` to instantiate `NAR`, input the data, and await actual derivations.
- [ ] **Fix RuleExecutor**: Rewrite `src/reason/RuleExecutor.js` to correctly map premises to rules.
- [ ] **Fix Dependencies**: Resolve `danfojs` issues.
- [ ] **Variable Support**: Update `Term.js` `_determineSemanticType` to handle `$`, `#`, `*` prefixes for full First Order Logic support.

### 5.2 Reasoning Expansion (NAL)
*Implement the missing logical pillars:*
- [ ] **Induction Rule**: `src/reason/rules/nal/InductionRule.js`
    - *Logic*: `(M --> P) + (M --> S) => (S --> P)` (Generalization).
- [ ] **Abduction Rule**: `src/reason/rules/nal/AbductionRule.js`
    - *Logic*: `(P --> M) + (S --> M) => (S --> P)` (Hypothesis).
- [ ] **Revision Rule**: `src/reason/rules/nal/RevisionRule.js`
    - *Logic*: Merge identical tasks with different evidence stamps.
- [ ] **Analogy Rule**: `src/reason/rules/nal/AnalogyRule.js`
    - *Logic*: `(M --> P) + (S <-> M) => (S --> P)`.

### 5.3 Cognitive Strategies (LM & Memory)
- [ ] **CoT Rule**: Create `CoTRule.js` that prompts the LM: "Think step-by-step..." before concluding.
- [ ] **Memory Tuning**: Create a script `scripts/tune-memory.js` to visualize how `decayRate` affects concept retention.
- [ ] **Vector RAG**: Update `Memory.js` to use `EmbeddingLayer` for `findSimilarConcepts(term)`.

### 5.4 Developer Experience
- [ ] **Introspection**: Add `trace <term>` to REPL.
- [ ] **Docs**: Generate JSDoc API reference.
- [ ] **Tutorial**: "Building a To-Do List Agent with SeNARS".

### 5.5 Testing
- [ ] **New Logic Suite**: Create `tests/integration/reason/NewNALRules.test.js`.
- [ ] **E2E**: Add a Playwright test for the "Graph" visualization.
