# SeNARS Development Plan & Evaluation

## 1. System Evaluation

### 1.1 Current State
SeNARS is a sophisticated Neuro-Symbolic reasoning system that successfully hybridizes Non-Axiomatic Logic (NAL) with Language Models (LMs). The architecture is cleaner and more modular than traditional NARS implementations (like OpenNARS), utilizing modern JavaScript (ES6+), immutable data structures, and a stream-based processing pipeline.

**Strengths:**
*   **Architecture**: The `PremiseSource` -> `Strategy` -> `RuleProcessor` pipeline is flexible and supports non-blocking async execution (crucial for LM integration).
*   **Data Structures**: Immutable `Term` and `Task` objects with canonicalization via `TermFactory` ensure consistency and performance.
*   **Hybridization**: The design explicitly treats LMs as a "subconscious" or "service" layer, grounded by the "conscious" NAL reasoner, which is a robust approach to AI safety and reliability.
*   **Testing**: A comprehensive suite of unit, integration, and property-based tests exists.
*   **Documentation**: High-quality README and slides provide a clear vision.

**Weaknesses & Gaps:**
*   **Incomplete NAL Rules**: While `Truth.js` implements the math for Induction, Abduction, and Analogy, the actual Rule classes (e.g., in `src/reason/rules/nal`) seem to primarily cover Deduction (Syllogistic) and Modus Ponens. This limits the system's "creative" logical reasoning capabilities.
*   **Dependency Issues**: The `self-analyze.js` script fails due to a missing/broken `danfojs` dependency, indicating potential bit-rot in auxiliary tools.
*   **Configuration Complexity**: `SystemConfig` and the various component configurations are complex and could be daunting for new users.
*   **UI/Visualization**: While mentioned, the UI (in `ui/`) needs to effectively visualize the "Stream of Consciousness" to truly deliver on the "Observable" promise.

### 1.2 Potential
SeNARS has the potential to be a leading framework for:
*   **Safe AI**: By constraining LM outputs with NAL logic.
*   **Cognitive Agents**: Agents that can reason, plan, and learn over time (using the Belief/Goal distinction).
*   **Education**: Visualizing how reasoning works.

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
    *   Verify these rules against standard NARS examples.
    *   Implement "Mental Operations" (basic internal operators).

### Phase 3: Integration & Experience (Mid-term)
*   **Goal**: Enhance the User/Developer experience and LM synergy.
*   **Actions**:
    *   **RLFP (Reinforcement Learning from Preferences)**: Fully implement the feedback loop where the system learns *how* to reason better based on user preferences.
    *   **Advanced LM Strategies**: Implement more sophisticated prompting strategies (Chain of Thought, Tree of Thought) within the `LM` component.
    *   **UI Overhaul**: Ensure the Web UI provides real-time, interactive visualization of the inference graph.

### Phase 4: Scalability & Autonomy (Long-term)
*   **Goal**: Large-scale deployment and self-evolution.
*   **Actions**:
    *   **Distributed Reasoning**: Allow multiple NAR instances to share knowledge.
    *   **Autonomous Coding**: Allow the system to modify its own parameters/code (safely) to optimize performance.

---

## 3. Detailed Development Tasks

### 3.1 Maintenance & Tech Debt
- [ ] **Fix Dependencies**: Investigate `danfojs` in `package.json` vs `package-lock.json`. Ensure `npm install` works cleanly.
- [ ] **Parser Regeneration**: Run `npm run build:parser` to ensure `src/parser/peggy-parser.js` is up to date with `src/parser/narsese.peggy`.
- [ ] **Linter/Formatter**: Ensure a consistent style guide (ESLint/Prettier) is enforced.

### 3.2 Reasoning Engine (NAL)
- [ ] **Induction Rule**: Implement `(M --> P) + (M --> S) => (S --> P)` using `Truth.induction`.
- [ ] **Abduction Rule**: Implement `(P --> M) + (S --> M) => (S --> P)` using `Truth.abduction`.
- [ ] **Revision Rule**: Implement merging of duplicate tasks with different evidential bases using `Truth.revision`.
- [ ] **Analogy Rule**: Implement reasoning based on similarity `(M --> P) + (S <-> M) => (S --> P)`.
- [ ] **Structural Rules**: Implement rules for compound term composition/decomposition.

### 3.3 Language Model (LM) Integration
- [ ] **Prompt Engineering**: Refine the prompts in `NarseseTranslator` to better handle nuances of Narsese logic.
- [ ] **Vector Database**: Ensure `EmbeddingLayer` effectively uses vector search for semantic grounding.
- [ ] **Cost Tracking**: Add strict token usage tracking and budget limits for LM calls.

### 3.4 Memory & Attention
- [ ] **Forgetting Policy**: Tune the `ForgettingPolicy` parameters. Verify that low-priority concepts are actually removed under memory pressure.
- [ ] **Bag Dynamics**: Visualize the probability distribution of the `Bag` to ensure it's not becoming a FIFO queue or getting stuck.

### 3.5 User Interface & Tools
- [ ] **REPL Improvements**: Add more introspection commands to the TUI REPL (e.g., `show rules`, `trace task`).
- [ ] **Web Dashboard**: Connect the React UI to the backend via WebSocket to show real-time "Thought Bubbles".

### 3.6 Documentation
- [ ] **API Reference**: Generate JSDoc output.
- [ ] **Tutorials**: Create a "Zero to Hero" guide for creating a simple agent with SeNARS.
