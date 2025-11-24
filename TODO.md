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
*   **Immutability**: Strict immutability in `Term` and `Task` (`TermFactory.js`) ensures thread-safety and cacheability.

### 3.2 Critical Weaknesses (The "Blocking" Issues)
*   **Broken Rule Optimization**: The `RuleExecutor.js` attempts optimization but uses mismatched keys (`rule.type` vs `heuristicKey`), causing a silent performance regression to O(N) linear scans.
*   **Incomplete Logic**: The system implements the *math* for Induction/Abduction/Analogy (`Truth.js`) but lacks the *rules* to trigger them (`src/reason/rules/nal`). This cripples the "learning" aspect.
*   **Dependency Rot**: The `danfojs` dependency is broken, breaking analysis scripts.
*   **Parameter Complexity**: The memory system relies on dozens of untuned magic numbers (`decayRate`, `propagationFactor`).

---

## 4. Strategic Roadmap

### Phase 1: Foundation & Performance (Immediate)
*   **Theme**: Fix what is broken. Make it rock solid.
*   **Key Deliverable**: A stable, optimized engine with passing CI.
    *   Fix `RuleExecutor` optimization.
    *   Fix dependency hell (`danfojs`).
    *   Ensure all tests (Unit, Integration, E2E) pass reliably.

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

### 5.1 Maintenance & Optimization
- [ ] **Fix RuleExecutor**: Rewrite `src/reason/RuleExecutor.js` to correctly map premises to rules using a working Decision Tree or Trie.
- [ ] **Dependency Fix**: Resolve `danfojs` issues in `package.json`.
- [ ] **Parser Build**: Ensure `npm run build:parser` works in CI.

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
- [ ] **Comparison Rule**: `src/reason/rules/nal/ComparisonRule.js`
    - *Logic*: `(M --> P) + (M --> S) => (S <-> P)`.

### 5.3 Cognitive Strategies (LM & Memory)
- [ ] **CoT Rule**: Create `CoTRule.js` that prompts the LM: "Think step-by-step..." before concluding.
- [ ] **Memory Tuning**: Create a script `scripts/tune-memory.js` to visualize how `decayRate` affects concept retention over 1000 cycles.
- [ ] **Vector RAG**: Update `Memory.js` to use `EmbeddingLayer` for `findSimilarConcepts(term)`.

### 5.4 Developer Experience
- [ ] **Introspection**: Add `trace <term>` to REPL to show every rule applied to a specific term.
- [ ] **Docs**: Generate JSDoc API reference.
- [ ] **Tutorial**: "Building a To-Do List Agent with SeNARS".

### 5.5 Testing
- [ ] **New Logic Suite**: Create `tests/integration/reason/NewNALRules.test.js` specifically for Induction/Abduction verification.
- [ ] **E2E**: Add a Playwright test for the "Graph" visualization to ensure nodes appear when reasoning happens.
