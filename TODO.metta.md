# MeTTa & Reason Integration Master Plan

This document serves as the authoritative implementation roadmap for unifying the MeTTa interpreter and SeNARS Reasoner. It is organized into four parallelizable tracks, prioritized by architectural dependency.

## 📦 Track 1: Unified Storage Foundation
**Objective:** Eliminate data duplication by allowing the Reasoner to treat `MeTTaSpace` as a native `PremiseSource`.

### 1.1 Interface Standardization
- [ ] **Enhance `MeTTaSpace`**: Implement the `PremiseSource` interface contract.
    - `stream(signal)`: Async generator yielding `Task` objects.
    - `count()`: Return atom count.
    - `add(task)` / `remove(task)`: Logic to handle `Task` wrappers -> `Term` storage.
    - **Advanced Indexing**:
        - Implement hash-based or positional indexing for faster pattern matching (addressing "medium/High" alignment note).

### 1.2 SpaceToTask Bridge
- [ ] **Create `SpaceToTaskAdapter.js`**:
    - **Responsibility**: On-the-fly conversion of MeTTa `Term` $\leftrightarrow$ NARS `Task`.
    - **Truth Extraction**:
        - If atom is `(Truth <f> <c>)`, extract values.
        - If atom is `(Confidence <c>)`, use default frequency.
        - Else, apply default truth `<0.9, 0.9>`.
    - **Budget Management**: Map MeTTa "salience" (if implemented) to NARS `Budget` (priority/durability).

### 1.3 Direct Integration
- [ ] **Update `Reasoner.js`**:
    - Allow configuration to accept a `MeTTaSpace` instance directly instead of a `TaskBag`.
- [ ] **Verification**:
    - Test: Add atoms to Space $\rightarrow$ Reasoner performs inference.
    - Test: Reasoner derives conclusion $\rightarrow$ Conclusion appears in Space.

---

## 🎮 Track 2: Scriptable Control (Meta-Reasoning)
**Objective:** Decouple control logic from JavaSript, enabling dynamic, scriptable attention allocation strategies via MeTTa.

### 2.1 `MeTTaStrategy` Component
- [ ] **Create `core/src/metta/strategies/MeTTaStrategy.js`**:
    - Extends `Strategy`.
    - **Input**: MeTTa function name (e.g., `select-context`).
    - **Logic**:
        ```javascript
        async selectSecondaryPremises(task, context) {
            const result = await interpreter.run(`(${this.funcName} ${task.toTerm()})`);
            return this.adapter.toTasks(result);
        }
        ```

### 2.2 Control Axioms
- [ ] **Define Standard Library (`stdlib_control.metta`)**:
    - `(get-concept-tasks $concept)`: Bind to JS helper to fetch efficient lookups.
    - `(filter-by-budget $tasks $threshold)`: Utility filter.

### 2.3 Example Strategy
- [ ] **Implement "Novelty Search" in MeTTa**:
    - Script that prioritizes tasks with low confidence (high uncertainty).
    - `(= (select-context $t) (filter-by-confidence (get-related $t) < 0.5))`

---

## 🧠 Track 3: Native NAL & Logic Customization
**Objective:** Implement the Non-Axiomatic Logic (NAL) inference rules directly in MeTTa, creating a self-describing logic system.

### 3.1 Truth Function Binding
- [ ] **Expose `Truth.js`**:
    - Register grounded atoms for all static methods in `Truth.js`:
    - `truth-deduction`, `truth-induction`, `truth-comparison`, etc.
    - Example: `(truth-deduction (Truth $f1 $c1) (Truth $f2 $c2))` returns `(Truth $f $c)`.
    - **Deep Integration**:
        - Ensure `MeTTaSpace` atoms natively support Truth value metadata, moving beyond simple wrapping where possible.
        - Investigate middleware for `ReductionEngine` to auto-propagate truth values during inference steps.

### 3.2 NAL Rule Implementation (`rules_nal.metta`)
- [ ] **Deduction**:
    ```scheme
    (=> (And (Inheritance $S $M) (Inheritance $M $P))
        (Inheritance $S $P))
    ```
- [ ] **Abduction**:
    - `(=> (And (Inheritance $P $M) (Inheritance $S $M)) (Inheritance $S $P))`
    - Must handle lower confidence generation properly.
- [ ] **Revision**:
    - Logic to merge identical terms with different evidence timestamps.

### 3.3 Rule Compiler Integration
- [ ] **Optimize `MeTTaRuleAdapter`**:
    - Ensure MeTTa-defined rules are compiled into the `RuleProcessor`'s efficient pattern matching tree (Decision Tree) rather than simple linear scan.

---

## 👁️ Track 4: Advanced Meta-Cognition (Phase 2)
**Objective:** Enable the system to introspect its state (budget, resources) and bind to external sensors ("Neuro-Symbolic" & "Embodied").

### 4.1 Introspection API
- [ ] **Budget Awareness**:
    - Expose `BudgetManager.stats()` as `(get-system-state)`.
- [ ] **Self-Modification**:
    - Allow MeTTa to request `(set-strategy "conservative")` if `(get-cpu-load)` > 80%.

### 4.2 Active Perception (Sensors)
- [ ] **Sensor Atoms**:
    - `(Sensor <id>)` evaluates to fresh data upon access.
    - Example: `(Sensor time)` $\rightarrow$ `(Time 12:00)`.
- [ ] **Neural Predicates**:
    - `(is-cat $img)` calls a neural network model.
    - Returns `(Truth <prob> 0.9)`.

### 4.3 Action Binding
- [ ] **Effectors**:
    - Bind atoms to `run_command` or specific actuators.
    - `(exec (print "Hello"))` causes side-effect.

---

## 🌐 Track 5: Distributed & Scalable Architecture (Future)
**Objective:** Prepare the system for AGI-scale knowledge bases by decoupling storage from the single-process runtime.

### 5.1 Remote Space Adapter
- [ ] **Create `RemoteMeTTaSpace.js`**:
    - Implements `MeTTaSpace` interface but proxies calls to a remote (Redis/gRPC) backend.
    - Supports `stream()` for large result sets.

### 5.2 Distributed Pattern Matching
- [ ] **Sharding Strategy**:
    - Design a partitioning scheme for Atoms (e.g., by Concept hash).
    - Implement "Map-Reduce" style variable unification across shards.

---

## 🎨 Track 6: Capability Demonstrations ("Killer Demos")
**Objective:** Achilles' heel of many systems is lack of proving ground. Replicate specific blueprints to prove parity.

### 6.1 Planning: Maze Solver
- [ ] **Create `demos/planning/maze_solver.metta`**:
    - Implement a grid world state in AtomSpace.
    - Use `rules_nal.metta` or custom heuristic rules to find a path.
    - Demonstrates: Search, Backtracking, State Updates.

### 6.2 Multi-Agent: Simple Negotiation
- [ ] **Create `demos/social/negotiation.metta`**:
    - Simulate two agents (separate Spaces) trading resources.
    - Rules for "Offer", "Counter-Offer", "Accept".
    - Demonstrates: Multi-Space interaction, Utility calculation.

### 6.3 Decision Making: Supply Chain
- [ ] **Create `demos/decision/supply_chain.metta`**:
    - Probabilistic scenario: "Storm approaching port" (Confidence < 1.0).
    - Logic to decide: "Reroute" vs "Risk it" based on expected utility.
    - Demonstrates: Deep PLN integration (Risk analysis).

---

## ✅ Definition of Done
1.  **Zero Duplication**: `TaskBag` is deprecated in favor of `MeTTaSpace` (or wrapped).
2.  **Pure Logic**: All NAL rules exist as editable MeTTa scripts.
3.  **Hot-Swappable Control**: Changing reasoning strategy requires no JS code changes/restarts, only MeTTa script updates.
4.  **Verification**: A full `metta_system_test.js` suite validating end-to-end inference using the new stack.
