# SeNARS Development Plan & Evaluation

## 1. System Evaluation

### 1.1 Current State
SeNARS is a sophisticated Neuro-Symbolic reasoning system that successfully hybridizes Non-Axiomatic Logic (NAL) with Language Models (LMs). The architecture is cleaner and more modular than traditional NARS implementations (like OpenNARS), utilizing modern JavaScript (ES6+), immutable data structures, and a stream-based processing pipeline.

**Strengths:**
*   **Robust Stream Architecture**: The `RuleProcessor.js` implements a robust async pipeline with backpressure, timeout handling, and separation of sync (NAL) vs async (LM) tasks.
*   **Sophisticated Memory**: `MemoryConsolidation.js` includes advanced features like activation propagation, structural similarity-based spreading activation, and multi-factor decay algorithms.
*   **Immutable Data**: `TermFactory.js` provides rigorous canonicalization (handling commutativity and associativity), ensuring `Term` and `Task` immutability which is critical for system stability.
*   **Hybridization**: The design explicitly treats LMs as a "subconscious" service layer, grounded by the "conscious" NAL reasoner.

**Critical Weaknesses & Gaps:**
*   **Broken Rule Optimization**: The `RuleExecutor.js` attempts to build a decision tree for optimization but uses mismatched keys (`rule.type` vs `heuristicKey`), causing it to fall back to a linear scan for every inference step. This is a significant performance bottleneck.
*   **Incomplete NAL Rules**: The system currently only implements Deduction (`SyllogisticRule.js`) and Modus Ponens. Core NAL inference patterns like Induction, Abduction, Analogy, and Revision are mathematically defined in `Truth.js` but missing from the `Rule` set.
*   **Parameter Sensitivity**: The memory and focus systems (`MemoryConsolidation.js`, `Focus.js`) rely on many "magic numbers" (decay rates, thresholds).
*   **LM "One-Shot" Limitation**: The current `LMRule.js` is template-based and lacks built-in support for multi-step reasoning patterns (like Chain-of-Thought).
*   **Dependency Issues**: The `self-analyze.js` script fails due to a missing/broken `danfojs` dependency.

### 1.2 Potential
SeNARS has the potential to be a leading framework for:
*   **Safe AI**: By constraining LM outputs with NAL logic.
*   **Cognitive Agents**: Agents that can reason, plan, and learn over time.
*   **Research**: A platform for studying neuro-symbolic memory dynamics.

---

## 2. Strategic Roadmap

### Phase 1: Foundation, Stability & Performance (Immediate)
*   **Goal**: Fix critical bugs and ensure the codebase is stable and efficient.
*   **Actions**:
    *   Fix **`RuleExecutor` optimization logic**.
    *   Fix dependency issues (`danfojs`).
    *   Audit and fix any flaky tests in the integration suite.

### Phase 2: Core Reasoning Expansion (Short-term)
*   **Goal**: Parity with standard NARS logic capabilities.
*   **Actions**:
    *   Implement missing NAL rules: **Induction**, **Abduction**, **Analogy**, **Comparison**, **Revision**.
    *   Create specific `Rule` subclasses (e.g., `InductionRule.js`, `AbductionRule.js`) that utilize the existing math in `Truth.js`.
    *   Add comprehensive unit tests for each new rule type.

### Phase 3: Cognitive Strategies & Integration (Mid-term)
*   **Goal**: Enhance the depth of reasoning and LM synergy.
*   **Actions**:
    *   **Chain-of-Thought (CoT)**: Implement `LMRules` that perform multi-step reasoning before yielding a result.
    *   **Parameter Tuning Tools**: Create visualization scripts to tune memory decay and activation parameters.
    *   **RLFP**: Fully implement the Reinforcement Learning from Preferences feedback loop.

### Phase 4: Scalability & Autonomy (Long-term)
*   **Goal**: Large-scale deployment and self-evolution.
*   **Actions**:
    *   **Distributed Reasoning**: Allow multiple NAR instances to share knowledge.
    *   **Autonomous Coding**: Allow the system to modify its own parameters/code (safely).

---

## 3. Detailed Development Tasks

### 3.1 Maintenance & Tech Debt
- [ ] **Fix RuleExecutor Optimization**: In `src/reason/RuleExecutor.js`, fix the `_getRuleKey` vs `_getHeuristicKey` mismatch so the decision tree actually works.
- [ ] **Fix Dependencies**: Investigate `danfojs` in `package.json`. Ensure `npm install` works.
- [ ] **Parser Regeneration**: Run `npm run build:parser` to ensure `src/parser/peggy-parser.js` is up to date.

### 3.2 Reasoning Engine (NAL Expansion)
*Note: Logical formulas below use standard NARS notation.*
- [ ] **Induction Rule**: Create `src/reason/rules/nal/InductionRule.js`.
    - Logic: `(M --> P) + (M --> S) => (S --> P)` using `Truth.induction`.
- [ ] **Abduction Rule**: Create `src/reason/rules/nal/AbductionRule.js`.
    - Logic: `(P --> M) + (S --> M) => (S --> P)` using `Truth.abduction`.
- [ ] **Revision Rule**: Create `src/reason/rules/nal/RevisionRule.js`.
    - Logic: Merge identical tasks (Same Term) with different evidence bases using `Truth.revision`.
- [ ] **Analogy Rule**: Create `src/reason/rules/nal/AnalogyRule.js`.
    - Logic: `(M --> P) + (S <-> M) => (S --> P)` using `Truth.analogy`.
- [ ] **Comparison Rule**: Create `src/reason/rules/nal/ComparisonRule.js`.
    - Logic: `(M --> P) + (M --> S) => (S <-> P)` using `Truth.comparison`.

### 3.3 Language Model (LM) Integration
- [ ] **CoT Rule**: Create a `CoTRule` (extending `LMRule`) that prompts the LM for a step-by-step explanation before parsing the final conclusion.
- [ ] **Vector Database**: Ensure `EmbeddingLayer` effectively uses vector search for semantic grounding.

### 3.4 Memory & Attention
- [ ] **Parameter Visualization**: Create a script (or UI view) to graph concept activation over time to verify propagation logic.
- [ ] **Tuning**: Tune `MemoryConsolidation` parameters (`activationThreshold`, `decayRate`) based on visualization data.

### 3.5 Testing & Verification
- [ ] **NAL Unit Tests**: Create `tests/unit/reason/rules/nal` and add specific tests for Induction, Abduction, etc., verifying Truth value calculations.
- [ ] **Property Based Tests**: Expand `tests/nal/propertyBasedTests.test.js` to cover the new rules.

### 3.6 User Interface & Documentation
- [ ] **REPL Improvements**: Add introspection commands: `show concept <term>`, `trace <term>`.
- [ ] **API Reference**: Generate JSDoc output.
