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
*   **Model Context Protocol (MCP)**: SeNARS implements a dual-mode MCP system (`src/mcp/`), allowing it to act as both a Client and Server.
*   **Sandboxed Tools**: Includes built-in, safe tools (`WebAutomationTool`, `FileOperationsTool`) with domain allow-lists and path restrictions.
*   **Knowledge Integration**: Pluggable connectors (`Wikipedia`, `Wikidata`) via `ExternalKnowledgeManager`.
*   **CLI & REPL**: A rich command-line interface (`src/repl/commands`) supporting debugging, introspection, and scripting.

### 2.3 The Interface
*   **Web UI**: A React-based interface (`ui/`) using Cytoscape.js (`GraphManager.js`) to visualize the concept graph, truth values, and priorities in real-time.
*   **Configuration**: A robust `SystemConfig` using Zod schemas for runtime validation.

---

## 3. Critical Analysis & Technical Debt

### 3.1 Strengths
*   **Architecture**: The separation of `PremiseSource`, `Strategy`, and `RuleProcessor` is world-class design for a streaming reasoner.
*   **Production Readiness**: Use of Zod for config and Sandboxing for tools shows a "Security First" mindset.
*   **Observability**: The UI already implements event-driven graph updates, making the "Observable Mind" a near-reality.
*   **Agility**: The system is designed to be adaptive, allowing us to prioritize hybrid integration over pure logic implementation.

### 3.2 Critical Weaknesses (The "Blocking" Issues)
*   **Broken Rule Optimization**: The `RuleExecutor.js` logic was flawed (key mismatch). *Status: Temporarily disabled to ensure correctness.*
*   **Inconsistent Variable Support**: The Parser supports `$`, `#`, `*` variables, but `Term.js` logic only explicitly handles `?`. This breaks Unification.
*   **Brittle Translation**: `AdvancedNarseseTranslator.js` relies on Regex patterns. It does not leverage the LM for translation, making it brittle.
*   **Naive Knowledge Integration**: External knowledge is converted to flat facts (`<Subject --> fact>`) without preserving semantic structure.
*   **Missing Logic**: The `inductive` demo (`BuiltinDemoSource.js`) claims to demonstrate induction, but the engine currently lacks the `InductionRule`.
*   **Dependency Rot**: The `danfojs` dependency is broken.

---

## 4. Strategic Roadmap

### Phase 1: Foundation & Integrity (Immediate)
*   **Theme**: Cleanup & Fixes.
*   **Key Deliverable**: A stable base code with no dead weight.
    *   **Dependency Fix**: Resolve `danfojs` issues.
    *   **Unify Variables**: Ensure `Term.js` handles all variable types correctly.
    *   **Parser Build**: Ensure `npm run build:parser` works.

### Phase 2: The Agentic Layer (Hybrid Intelligence)
*   **Theme**: Useful Integration First.
*   **Key Deliverable**: An agent that uses tools and LMs effectively, even with limited NAL rules.
    *   **LLM Translator**: Replace Regex translator with an LM-based few-shot translator.
    *   **Chain-of-Thought (CoT)**: Implement multi-step reasoning rules for LMs.
    *   **Advanced MCP**: Expose more internal tools (e.g., "Add Goal") via MCP.
    *   **RAG**: Connect `EmbeddingLayer` to `Memory` for semantic retrieval.

### Phase 3: The Reasoning Engine (Deep Logic)
*   **Theme**: Mathematical Rigor.
*   **Key Deliverable**: Parity with standard NARS logic (Induction, Abduction).
    *   Implement **Induction**, **Abduction**, **Revision**, **Analogy**, **Comparison**.
    *   **Verify Demos**: Ensure the builtin demos (Syllogism, Induction) actually pass.

### Phase 4: Scalability & Observable Mind (Long-term)
*   **Theme**: Scale & Visualize.
*   **Key Deliverable**: Distributed reasoning and real-time visualization.
    *   **Distributed Reasoning**: Implement server-to-server communication.
    *   **UI Overhaul**: Real-time "Thought Bubble" visualization.

---

## 5. Detailed Implementation Tasks

### 5.1 Maintenance & Integrity
- [ ] **Fix Dependencies**: Resolve `danfojs` issues.
- [ ] **Variable Support**: Update `Term.js` `_determineSemanticType` to handle `$`, `#`, `*` prefixes for full First Order Logic support.

### 5.2 Cognitive Strategies (LM & Memory) - *High Priority*
- [ ] **LLM Translator**: Update `NarseseTranslator` to use `agent.lm.generateText` with a few-shot prompt for robust translation.
- [ ] **CoT Rule**: Create `CoTRule.js` that prompts the LM: "Think step-by-step..." before concluding.
- [ ] **Vector RAG**: Update `Memory.js` to use `EmbeddingLayer` for `findSimilarConcepts(term)`.

### 5.3 Reasoning Expansion (NAL)
- [ ] **Induction Rule**: `src/reason/rules/nal/InductionRule.js` (Logic: `(M --> P) + (M --> S) => (S --> P)`).
- [ ] **Abduction Rule**: `src/reason/rules/nal/AbductionRule.js` (Logic: `(P --> M) + (S --> M) => (S --> P)`).
- [ ] **Revision Rule**: `src/reason/rules/nal/RevisionRule.js`.
- [ ] **Verify Demos**: Create an integration test that runs the content of `src/demo/BuiltinDemoSource.js` and asserts the expected conclusions are derived.

### 5.4 Developer Experience
- [ ] **Introspection**: Add `trace <term>` to REPL.
- [ ] **Docs**: Generate JSDoc API reference.
- [ ] **Tutorial**: "Building a To-Do List Agent with SeNARS".

### 5.5 Testing
- [ ] **New Logic Suite**: Create `tests/integration/reason/NewNALRules.test.js`.
- [ ] **E2E**: Add a Playwright test for the "Graph" visualization.
