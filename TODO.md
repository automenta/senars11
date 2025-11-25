# SeNARS: The Cognitive Agent Platform
*Design Document, System Evaluation & Strategic Roadmap*

## 1. Executive Summary
SeNARS is a **Neuro-Symbolic Cognitive Agent Platform** that hybridizes the precision of Non-Axiomatic Logic (NAL) with the semantic flexibility of Language Models (LMs). Unlike simple "LLM wrappers", SeNARS provides a grounded "conscious" reasoning engine (NAL) that supervises a "subconscious" neural engine (LM).

**Pioneering Research**: SeNARS introduces **Cognitive Diversity** metrics (entropy-based knowledge structural analysis) and **Biomimetic Memory** (activation propagation), aiming to solve the "Tunnel Vision" problem in AI agents.

**Current Status**: The system is in a **Fragile** state. Advanced organs (Web Tools, Cognitive Diversity) exist but the connective tissue (Rule Engine Optimization, Integration Tests) is weak.

---

## 2. System Architecture & Capabilities

### 2.1 The Neuro-Symbolic Core
*   **Stream Reasoner**: `RuleProcessor.js` manages an async pipeline with backpressure.
*   **Hybrid Logic**: LMs are invoked via `LMRule`s, constrained by NAL truth values (`Truth.js`).
*   **Meta-Cognition**: `CognitiveDiversity.js` calculates the entropy of the knowledge base, providing a metric for "boredom" or "curiosity".

### 2.2 The Agent Platform (MCP)
*   **Model Context Protocol (MCP)**: Dual-mode (Client/Server) support in `src/mcp/`.
*   **Sandboxed Tools**: `WebAutomationTool` and `FileOperationsTool` implemented with safety sandboxes.
*   **Knowledge Integration**: Pluggable connectors (`Wikipedia`) via `ExternalKnowledgeManager`.

### 2.3 The Interface
*   **Web UI**: React + Cytoscape.js (`GraphManager.js`) for real-time "Mind Mapping".
*   **Configuration**: Zod-based `SystemConfig` for robust runtime validation.

---

## 3. Critical Analysis & Technical Debt

### 3.1 Strengths (The "Gems")
*   **Architecture**: The `PremiseSource` -> `Strategy` -> `RuleProcessor` pipeline is world-class.
*   **Security**: Sandboxed tools and Zod config show a production-ready mindset.
*   **Novelty**: `CognitiveDiversity.js` is a unique, high-value research contribution waiting to be utilized.

### 3.2 Critical Weaknesses (The "Fragility")
*   **Broken Engine**: The `RuleExecutor.js` optimization is disabled due to logic errors (O(N) performance).
*   **Blind Spots**: Benchmarks were fake (now removed), so we have no true performance baseline.
*   **Disconnected Brain**: "Cognitive Diversity" metrics are calculated but not *used* by the `Strategy` to guide reasoning.
*   **Logic Gaps**: Missing `InductionRule` means the agent cannot actually "learn" general rules from examples, despite demos claiming so.
*   **Environment**: Broken dependencies (`danfojs`) and missing test configs prevent reliable CI.

---

## 4. Strategic Roadmap: The Dual Track

To navigate this fragile stage, we must operate on two parallel tracks: **Engineering (Stability)** and **Research (Novelty)**.

### Phase 1: Foundation & Integrity (Immediate - Engineering)
*   **Goal**: Make it run reliably.
*   **Actions**:
    *   **Fix Dependencies**: Resolve `danfojs` and Babel issues.
    *   **Real Benchmarks**: Create a *real* runner that executes the engine.
    *   **Optimize RuleExecutor**: Re-implement the Decision Tree correctly.

### Phase 2: Integration & Activation (Short-term - Research)
*   **Goal**: Connect the "Brain" to the "Body".
*   **Actions**:
    *   **Wire Diversity**: Use `CognitiveDiversity` metrics in `Strategy.js` to prioritize novel tasks (Curiosity).
    *   **Visual Activation**: Update UI to visualize "Activation Propagation" (showing *thinking*, not just storage).
    *   **LLM Translator**: Replace Regex translator with LM-based few-shot translation.

### Phase 3: Reasoning & Agency (Mid-term - Hybrid)
*   **Goal**: Smart, Autonomous Action.
*   **Actions**:
    *   **Implement NAL**: Induction, Abduction, Revision rules.
    *   **CoT Rules**: Chain-of-Thought reasoning for LMs.
    *   **Advanced MCP**: Expose internal "Add Goal" tools to external agents.

---

## 5. Detailed Implementation Tasks

### 5.1 Engineering Track (Stability)
- [ ] **Fix Dependencies**: `npm install` must work clean.
- [ ] **Real Benchmarks**: Rewrite `BenchmarkRunner.js` to `await nar.input()`.
- [ ] **Fix RuleExecutor**: Correct `_getHeuristicKey` logic to match `Rule.type` or vice versa.
- [ ] **Variable Support**: Update `Term.js` to handle `$`, `#`, `*` variables.

### 5.2 Research Track (Novelty)
- [ ] **Curiosity Strategy**: Update `src/reason/Strategy.js` to boost priority of tasks that increase `CognitiveDiversity`.
- [ ] **Visual Thinking**: Add "flash" animations to `GraphManager.js` when nodes are activated/processed.
- [ ] **LLM Translator**: Implement `src/lm/LLMTranslator.js` using `agent.lm` for robust Narsese conversion.

### 5.3 Logic Track (Core)
- [ ] **Induction Rule**: `src/reason/rules/nal/InductionRule.js`.
- [ ] **Abduction Rule**: `src/reason/rules/nal/AbductionRule.js`.
- [ ] **Verify Demos**: Ensure `BuiltinDemoSource.js` scenarios pass integration tests.
