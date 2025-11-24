# SeNARS Development Plan & Evaluation

## 1. System Evaluation

### 1.1 Current State
SeNARS is a sophisticated Neuro-Symbolic reasoning system that successfully hybridizes Non-Axiomatic Logic (NAL) with Language Models (LMs). The architecture is cleaner and more modular than traditional NARS implementations (like OpenNARS), utilizing modern JavaScript (ES6+), immutable data structures, and a stream-based processing pipeline.

**Strengths:**
*   **Architecture**: The `PremiseSource` -> `Strategy` -> `RuleProcessor` pipeline is flexible and supports non-blocking async execution (crucial for LM integration).
*   **Data Structures**: Immutable `Term` and `Task` objects with canonicalization via `TermFactory` ensure consistency and performance.
*   **Sophisticated Memory**: `MemoryConsolidation.js` implements advanced features like activation propagation, structural similarity-based spreading activation, and complex decay algorithms (considering recency, usage, complexity, quality).
*   **Hybridization**: The design explicitly treats LMs as a "subconscious" or "service" layer, grounded by the "conscious" NAL reasoner. `LM.js` includes robust Circuit Breaking and provider fallback.
*   **Testing**: A comprehensive suite of unit, integration, and property-based tests exists.

**Weaknesses & Gaps:**
*   **Incomplete NAL Rules**: While `Truth.js` implements the math for Induction, Abduction, and Analogy, the specific `Rule` classes in `src/reason/rules/nal` are largely missing. The system currently relies heavily on Deduction (Syllogistic).
*   **Parameter Sensitivity**: The memory and focus systems (`MemoryConsolidation.js`, `Focus.js`) rely on many "magic numbers" (decay rates, thresholds, weights). Tuning these for stable behavior without visualization tools is difficult.
*   **LM "One-Shot" Limitation**: The current `LMRule.js` is template-based and primarily "one-shot". It lacks built-in support for multi-step reasoning patterns (like Chain-of-Thought) managed by the rule itself.
*   **Dependency Issues**: The `self-analyze.js` script fails due to a missing/broken `danfojs` dependency.
*   **UI/Visualization**: The current UI needs to catch up to the backend's complexity to effectively visualize activation propagation and belief dynamics.

### 1.2 Potential
SeNARS has the potential to be a leading framework for:
*   **Safe AI**: By constraining LM outputs with NAL logic.
*   **Cognitive Agents**: Agents that can reason, plan, and learn over time (using the Belief/Goal distinction).
*   **Research**: A platform for studying neuro-symbolic memory dynamics.

---

## 2. Strategic Roadmap

### Phase 1: Foundation & Stability (Immediate)
*   **Goal**: Ensure the codebase is stable, buildable, and fully testable for new contributors.
*   **Actions**:
    *   Fix dependency issues (specifically `danfojs`).
    *   Audit and fix any flaky tests in the integration suite.
    *   Ensure `self-analyze.js` runs to provide baseline metrics.
    *   Verify the build pipeline (Parser generation).

### Phase 2: Core Reasoning Expansion (Short-term)
*   **Goal**: Parity with standard NARS logic capabilities.
*   **Actions**:
    *   Implement missing NAL rules: **Induction**, **Abduction**, **Analogy**, **Comparison**, **Revision**.
    *   Create specific `Rule` subclasses (e.g., `InductionRule.js`, `AbductionRule.js`) that utilize the existing math in `Truth.js`.
    *   Implement "Mental Operations" (basic internal operators).

### Phase 3: Cognitive Strategies & Integration (Mid-term)
*   **Goal**: Enhance the depth of reasoning and LM synergy.
*   **Actions**:
    *   **Chain-of-Thought (CoT)**: Implement `LMRules` that perform multi-step reasoning before yielding a result.
    *   **Parameter Tuning Tools**: Create visualization scripts to tune memory decay and activation parameters.
    *   **RLFP (Reinforcement Learning from Preferences)**: Fully implement the feedback loop where the system learns *how* to reason better.

### Phase 4: Scalability & Autonomy (Long-term)
*   **Goal**: Large-scale deployment and self-evolution.
*   **Actions**:
    *   **Distributed Reasoning**: Allow multiple NAR instances to share knowledge.
    *   **Autonomous Coding**: Allow the system to modify its own parameters/code (safely) to optimize performance.

---

## 3. Detailed Development Tasks

### 3.1 Maintenance & Tech Debt
- [ ] **Fix Dependencies**: Investigate `danfojs` in `package.json`. Ensure `npm install` works.
- [ ] **Parser Regeneration**: Run `npm run build:parser` to ensure `src/parser/peggy-parser.js` is up to date.
- [ ] **Linter/Formatter**: Ensure a consistent style guide is enforced.

### 3.2 Reasoning Engine (NAL)
- [ ] **Induction Rule**: Create `src/reason/rules/nal/InductionRule.js`. Logic: `(M --> P) + (M --> S) => (S --> P)`.
- [ ] **Abduction Rule**: Create `src/reason/rules/nal/AbductionRule.js`. Logic: `(P --> M) + (S --> M) => (S --> P)`.
- [ ] **Revision Rule**: Create `src/reason/rules/nal/RevisionRule.js` to merge duplicate tasks with different evidence.
- [ ] **Analogy Rule**: Create `src/reason/rules/nal/AnalogyRule.js`. Logic: `(M --> P) + (S <-> M) => (S --> P)`.
- [ ] **Compound Term Rules**: Implement composition/decomposition rules.

### 3.3 Language Model (LM) Integration
- [ ] **CoT Rule**: Create a `CoTRule` that prompts the LM for a step-by-step explanation before parsing the final conclusion.
- [ ] **Vector Database**: Ensure `EmbeddingLayer` effectively uses vector search for semantic grounding.
- [ ] **Cost Tracking**: Add strict token usage tracking and budget limits for LM calls.

### 3.4 Memory & Attention
- [ ] **Parameter Visualization**: Create a script (or UI view) to graph concept activation over time to verify propagation logic.
- [ ] **Tuning**: Tune `MemoryConsolidation` parameters (`activationThreshold`, `decayRate`) based on visualization data.
- [ ] **Bag Dynamics**: Analyze `Bag.js` distribution to ensure `PriorityForgetPolicy` isn't starving low-priority but important novel concepts.

### 3.5 User Interface & Tools
- [ ] **REPL Improvements**: Add introspection commands: `show concept <term>`, `trace <term>`.
- [ ] **Web Dashboard**: Connect the React UI to the backend via WebSocket to show real-time "Thought Bubbles".

### 3.6 Documentation
- [ ] **API Reference**: Generate JSDoc output.
- [ ] **Tutorials**: Create a "Zero to Hero" guide for creating a simple agent with SeNARS.
