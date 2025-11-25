# SeNARS: The Cognitive Agent Platform
*Design Document, System Evaluation & Strategic Roadmap*

## 1. Executive Summary
SeNARS is a **Neuro-Symbolic Cognitive Agent Platform** that hybridizes the precision of Non-Axiomatic Logic (NAL) with the semantic flexibility of Language Models (LMs). Unlike simple "LLM wrappers", SeNARS provides a grounded "conscious" reasoning engine (NAL) that supervises a "subconscious" neural engine (LM).

**Pioneering Research**: SeNARS introduces **Cognitive Diversity** metrics, **Biomimetic Memory**, and **Metacognitive Self-Modification** (rules that adjust system parameters).

**Current Status**: The system is in a **Fragile** state. Advanced organs (Web Tools, Cognitive Diversity, Self-Analysis) exist but the connective tissue (Rule Engine Optimization, Sensors) is weak.

---

## 2. System Architecture & Capabilities

### 2.1 The Neuro-Symbolic Core
*   **Stream Reasoner**: `RuleProcessor.js` manages an async pipeline with backpressure.
*   **Hybrid Logic**: LMs are invoked via `LMRule`s, constrained by NAL truth values (`Truth.js`).
*   **Meta-Cognition**: `CognitiveDiversity.js` calculates entropy. `MetacognitionRules.js` allows the system to tune itself (e.g., `AdjustCacheSizeRule`).

### 2.2 The Agent Platform (MCP)
*   **Model Context Protocol (MCP)**: Dual-mode (Client/Server) support in `src/mcp/`.
*   **Sandboxed Tools**: `WebAutomationTool` and `FileOperationsTool` implemented with safety sandboxes.
*   **Self-Analysis Tools**: `TechnicalDebtAnalysisTool` and `ArchitectureAnalysisTool` allow the agent to audit its own code.
*   **Knowledge Integration**: Pluggable connectors (`Wikipedia`) via `ExternalKnowledgeManager`.

### 2.3 The Interface
*   **Web UI**: React + Cytoscape.js (`GraphManager.js`) for real-time "Mind Mapping".
*   **Configuration**: Zod-based `SystemConfig` for robust runtime validation.

---

## 3. Critical Analysis & Technical Debt

### 3.1 Strengths (The "Gems")
*   **Architecture**: The `PremiseSource` -> `Strategy` -> `RuleProcessor` pipeline is world-class.
*   **Self-Reflection**: The system has the *potential* to code itself using `src/tool/software`, a rare feature in cognitive architectures.
*   **Security**: Sandboxed tools and Zod config show a production-ready mindset.

### 3.2 Critical Weaknesses (The "Fragility")
*   **Broken Engine**: The `RuleExecutor.js` optimization is disabled due to logic errors. *Fixed temporarily.*
*   **Missing Sensors**: We have Metacognitive Rules (Effectors) but no **System Sensors** to inject observations like `(SELF, has_property, low_cache_hit_rate)`. The brain is blind to its own body.
*   **Disconnected Brain**: "Cognitive Diversity" metrics are calculated but not *used* by the `Strategy`.
*   **Logic Gaps**: Missing `InductionRule` creates a gap between claims and reality.
*   **Fragmented Verification**: UI tests are split between Playwright JS (`ui/tests`) and standalone Python scripts (`verification/`).

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
    *   **Build Sensors**: Create a `SystemMonitor` that injects performance stats as Narsese Beliefs (enabling Metacognition).
    *   **Wire Diversity**: Use `CognitiveDiversity` metrics in `Strategy.js`.
    *   **LLM Translator**: Replace Regex translator with LM-based few-shot translation.

### Phase 3: Reasoning & Agency (Mid-term - Hybrid)
*   **Goal**: Smart, Autonomous Action.
*   **Actions**:
    *   **Implement NAL**: Induction, Abduction, Revision rules.
    *   **CoT Rules**: Chain-of-Thought reasoning for LMs.
    *   **Expose Self-Tools**: Wrap `TechnicalDebtAnalysisTool` in MCP so the agent can optimize its own codebase.

---

## 5. Detailed Implementation Tasks

### 5.1 Engineering Track (Stability)
- [ ] **Fix Dependencies**: `npm install` must work clean.
- [ ] **Real Benchmarks**: Rewrite `BenchmarkRunner.js`.
- [ ] **Fix RuleExecutor**: Correct `_getHeuristicKey` logic.
- [ ] **Unify Verification**: Port `verify_demo.py` logic to `ui/tests/e2e`.

### 5.2 Research Track (Novelty)
- [ ] **System Sensors**: Create `src/io/SystemMonitor.js` to emit beliefs like `<SELF --> [low_memory]>`.
- [ ] **Curiosity Strategy**: Update `src/reason/Strategy.js` to boost priority of diverse tasks.
- [ ] **Visual Thinking**: Add "flash" animations to `GraphManager.js`.
- [ ] **Self-Coding**: Expose `src/tool/software` via MCP.

### 5.3 Logic Track (Core)
- [ ] **Induction Rule**: `src/reason/rules/nal/InductionRule.js`.
- [ ] **Abduction Rule**: `src/reason/rules/nal/AbductionRule.js`.
- [ ] **Verify Demos**: Ensure `BuiltinDemoSource.js` scenarios pass integration tests.
