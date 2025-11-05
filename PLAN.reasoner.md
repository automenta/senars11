# SeNARS Reasoner Redesign Specification

## 1. Vision & Core Principles

This document outlines a redesign of the SeNARS Reasoner, the central component of the system's intelligence. The goal is to create a more powerful, flexible, efficient, and elegant architecture that fully realizes the project's vision of a hybrid neuro-symbolic reasoning system.

This redesign is guided by the following core principles:

*   **Modular Abstraction:** Every component (Reasoner, Strategy, Rule, Processor) should have a clearly defined responsibility and interface, allowing for independent implementation and extension.
*   **Hybrid by Design:** The architecture must treat symbolic (NAL) and sub-symbolic (LM, embeddings) reasoning as first-class citizens, enabling seamless and synergistic integration.
*   **Performance-Aware:** The design must incorporate modern performance optimization techniques from the ground up, acknowledging the demanding nature of logical inference.
*   **Metacognition-Ready:** The system must be instrumented to observe its own performance, providing the necessary hooks for future self-optimization and reinforcement learning capabilities.
*   **Declarative & Extensible:** The system should favor declarative representations (e.g., for rules) and provide clear extension points for new reasoning types (e.g., probabilistic, fuzzy logic) and algorithms.

---

## 2. High-Level Architecture

The new Reasoner architecture is composed of several key components that collaborate to perform inference.

```
+-------------------+
|      NAR API      |
+-------------------+
         |
         v
+-------------------+
|     Reasoner      |
|-------------------|
| - SelectStrategy  |
| - ManageContext   |
+-------------------+
         |
         v
+-------------------+      +--------------------+
|     Strategy      |----->| PremiseSelector    |
|-------------------|      |--------------------|
| - Execute Loop    |      | - TermLayer        |
| - Manage Budget   |      | - EmbeddingLayer   |
+-------------------+      +--------------------+
         |
         v
+-------------------+      +--------------------+
|   RuleProcessor   |----->|    RuleIndexer     |
|-------------------|      |--------------------|
| - Dispatch Rules  |      | - Trie / Rete      |
| - Handle Async    |      | - Guards           |
+-------------------+      +--------------------+
         |
         v
+-------------------+
|       Rules       |
|-------------------|
| - NALRule (sync)  |
| - LMRule (async)  |
| - ...other types  |
+-------------------+
```

**Workflow Overview:**

1.  **Input:** The `NAR` API provides an input `Task` to the `Reasoner`.
2.  **Context & Strategy:** The `Reasoner` creates a `ReasoningContext` (containing memory access, factories, etc.) and selects a `Strategy` (e.g., `Exhaustive`, `Bag`) based on the system's current goals or configuration.
3.  **Reasoning Loop (Strategy):** The `Strategy` executes the main reasoning loop. In each step, it:
    a.  Selects a primary premise (`Task`).
    b.  Uses the `PremiseSelector` to find a secondary premise (`Belief`) from memory, leveraging `TermLayer` for structural similarity and `EmbeddingLayer` for semantic similarity.
    c.  Passes the premise pair to the `RuleProcessor`.
4.  **Rule Application (Processor & Indexer):** The `RuleProcessor`:
    a.  Queries the `RuleIndexer` to get a list of candidate rules that match the premises, avoiding a linear scan.
    b.  Dispatches rules for execution. It manages the different natures of rules: NAL rules are executed synchronously, while LM rules are executed asynchronously.
    c.  Gathers the results (newly derived `Task`s).
5.  **Output:** The `Strategy` collects the results from the `RuleProcessor`, updates budgets and metrics, and returns the derived tasks to the `Reasoner`, which then integrates them back into the system.

---

## 3. Detailed Component Design

### 3.1. The `Reasoner`

The `Reasoner` is the high-level orchestrator. Its primary role is to manage the overall inference process without being involved in the step-by-step logic.

**Responsibilities:**

*   Act as the main entry point for inference requests (`processSingle`, `processBatch`).
*   Instantiate and manage the `ReasoningContext` for each inference cycle.
*   Select the appropriate `Strategy` based on configuration or dynamic system state.
*   Manage system-level resources and constraints (e.g., global timeouts).

**API Sketch:**

```javascript
class Reasoner {
  constructor(memory, ruleEngine, config);

  /**
   * Processes a single task, potentially deriving new tasks.
   * @param {Task} task - The primary premise.
   * @param {object} options - Execution options (strategy, budget, etc.).
   * @returns {Promise<Task[]>} - A promise that resolves to an array of derived tasks.
   */
  async processSingle(task, options = {});

  /**
   * Processes a batch of tasks.
   * @param {Task[]} tasks - The batch of tasks to process.
   * @param {object} options - Execution options.
   * @returns {Promise<Task[]>}
   */
  async processBatch(tasks, options = {});
}
```

### 3.2. `Strategy`

A `Strategy` implements the core reasoning algorithm or loop. It defines *how* premises are selected and *how* rules are applied over time. Strategies are pluggable, allowing the system to switch between different reasoning modes.

**Responsibilities:**

*   Implement the main reasoning loop.
*   Select premises for each reasoning step using the `PremiseSelector`.
*   Invoke the `RuleProcessor` with the selected premises.
*   Manage the reasoning budget (e.g., number of steps, time limit, computational resources).
*   Decide when to terminate the reasoning process.

**Strategy Examples:**

*   **`ExhaustiveStrategy`:** For a given task, finds all related beliefs and applies all matching rules. Useful for deep, focused reasoning.
*   **`BagStrategy` (NARS-style):** Maintains a priority-sampled bag of tasks and beliefs. In each step, it randomly draws a task and a belief from the bag and attempts to combine them. This supports "anytime" reasoning under resource constraints.
*   **`ResolutionStrategy` (Prolog-style):** Focuses on goal-driven backward chaining, attempting to prove a `Question` by finding rules and beliefs that satisfy it.

**API Sketch:**

```javascript
interface Strategy {
  /**
   * Executes the reasoning strategy.
   * @param {ReasoningContext} context - The context for this reasoning cycle.
   * @param {Task | Task[]} initialPremises - The starting point for reasoning.
   * @param {object} budget - Constraints (e.g., maxSteps, maxTime).
   * @returns {Promise<Task[]>} - Derived tasks.
   */
  execute(context, initialPremises, budget);
}
```

### 3.3. `PremiseSelector`

This component is responsible for finding a second premise to combine with a given first premise. It abstracts the process of querying associative memory.

**Responsibilities:**

*   Given a `Task`, find candidate `Belief`s from memory.
*   Leverage `TermLayer` to find structurally related beliefs (e.g., beliefs sharing a sub-term).
*   Leverage `EmbeddingLayer` to find semantically related beliefs, even if they have no structural overlap.
*   Use a configurable weighting system to balance between structural and semantic matches.

**API Sketch:**

```javascript
class PremiseSelector {
  constructor(memory);

  /**
   * Finds a suitable secondary premise for a given primary premise.
   * @param {Task} primaryPremise - The task to find a partner for.
   * @param {object} options - Options like how many candidates to return.
   * @returns {Promise<Belief | null>}
   */
  async findSecondPremise(primaryPremise, options = {});
}
```

### 3.4. `RuleProcessor`

The `RuleProcessor` is the workhorse that manages the execution of rules. It is designed to handle the mixed synchronous/asynchronous nature of NAL and LM rules efficiently.

**Responsibilities:**

*   Receive one or two premises from the `Strategy`.
*   Query the `RuleIndexer` for candidate rules.
*   Dispatch rule execution:
    *   Execute synchronous NAL rules immediately in a tight loop.
    *   Dispatch asynchronous LM rules in parallel.
*   Aggregate results from all executed rules.
*   Manage concurrency and prevent I/O-bound LM rules from blocking CPU-bound NAL rules.

**Implementation Note:** This can be implemented using a small, internal event loop or promise management system. It could dispatch all async rules and, while they are pending, continue processing a queue of sync rules.

**API Sketch:**

```javascript
class RuleProcessor {
  constructor(ruleIndexer);

  /**
   * Applies all relevant rules to a given set of premises.
   * @param {ReasoningContext} context
   * @param {Task} premise1
   * @param {Belief} [premise2] - Optional second premise.
   * @returns {Promise<Task[]>} - A promise that resolves when all rules have completed.
   */
  async applyRules(context, premise1, premise2);
}
```

### 3.5. `RuleIndexer`

To avoid a linear scan over all rules for every reasoning step, the `RuleIndexer` pre-processes and indexes rules for efficient retrieval.

**Responsibilities:**

*   Provide a fast way to find rules that could potentially match a given `Term` or pair of `Term`s.
*   Implement advanced indexing structures.
*   Handle rule registration and unregistration, updating the index accordingly.

**Potential Indexing Strategies:**

*   **Term-based Hashing:** Index rules by the specific terms or term structures they match (e.g., `-->`, `&`).
*   **Trie Structure:** For rules that match specific term patterns, a trie can allow for near-instantaneous lookup of matching rules based on the structure of the premise(s).
*   **Rete Network:** For highly complex, multi-premise rules, a Rete network can be used to create a dataflow network that efficiently matches rules as new facts (tasks/beliefs) are asserted. This is a more advanced option.

> **Concern:** Implementing a full Rete network is a significant undertaking. A simpler trie or hash-based index is a more practical starting point, offering a substantial performance gain over linear scanning.

### 3.6. `Rule` (The Base Abstraction)

The `Rule` class is redesigned to be more declarative and to explicitly state its properties for the engine to use.

**Key Properties:**

*   `id`: Unique identifier.
*   `type`: `'NAL'`, `'LM'`, `'Custom'`.
*   `arity`: The number of premises it accepts (1 or 2).
*   `isAsync`: `true` or `false`. This is crucial for the `RuleProcessor`.
*   `guards`: An array of cheap, synchronous functions that can quickly disqualify the rule before the more expensive `apply` method is called.
*   `apply`: The core logic of the rule.

**API Sketch:**

```javascript
abstract class Rule {
  id: string;
  type: 'NAL' | 'LM' | 'Custom';
  arity: 1 | 2;
  isAsync: boolean;
  guards: ((premise1, premise2?) => boolean)[];

  /**
   * The core execution logic of the rule.
   * @returns {Promise<Task[]> | Task[]}
   */
  abstract apply(context, premise1, premise2?);
}
```

---

## 4. Self-Optimization Hooks

The new architecture is designed to be introspectable, providing the necessary data for a future metacognitive layer to perform self-optimization.

1.  **Enhanced `Stamp`:** The `Stamp` on each `Task` will be crucial. It must record not only the parent tasks but also the specific `Rule` that was used to derive it. This creates a complete derivation graph.
2.  **Credit Assignment:** When a `Goal` is achieved, a separate `CreditAssignment` module can traverse the derivation graph backwards from the successful goal. It will assign "credit" to the rules and beliefs that contributed to the success, increasing their internal priority or "utility" score.
3.  **Dynamic Rule Prioritization:** The `BagStrategy` can use these utility scores to bias its selection of rules and premises, favoring those that have proven useful in the past.
4.  **Performance Profiling:** The `RuleProcessor` and `Strategy` will log detailed metrics (execution time, success rate, etc.) for each rule. A `PerformanceMonitor` can analyze this data to detect inefficient rules or bottlenecks.

> **Question:** How should the system balance exploration (trying new or low-utility rules) with exploitation (using high-utility rules)? A simple epsilon-greedy approach could be a starting point, but more sophisticated multi-armed bandit algorithms could be considered in the long term.

---

## 5. Inspiration from Other Reasoning Systems

*   **OpenNARS:** The `BagStrategy` and the concept of evidence-based truth values are directly inspired by OpenNARS's approach to reasoning under insufficient knowledge and resources.
*   **Prolog / Resolution:** The idea of unification is central to NAL rules. The `RuleIndexer` can be seen as an optimization analogous to how Prolog engines index clauses to speed up resolution.
*   **OpenCog MeTTa:** The MeTTa paradigm of treating knowledge as a graph (atomspace) and reasoning as graph rewriting is a powerful generalization. This redesign aligns with that view: `Memory` is the atomspace, and `Rules` are the rewrite operations. This makes the system highly extensible; a new type of reasoning is simply a new set of rewrite rules.

---

## 6. Concerns and Open Questions

*   **Complexity:** This design is more complex than the current implementation. The added components (`PremiseSelector`, `RuleIndexer`, `RuleProcessor`) increase the architectural surface area. The trade-off is a significant increase in power, efficiency, and extensibility.
*   **Async Management:** Correctly and efficiently managing the mix of sync and async operations in the `RuleProcessor` is non-trivial and will require careful implementation to avoid race conditions or performance bottlenecks.
*   **Parameter Tuning:** The `PremiseSelector` (balancing structural vs. semantic search) and the self-optimization systems will introduce new hyperparameters that will need to be tuned. A key challenge will be to make the system robust enough to work well with a wide range of settings.
*   **Knowledge Representation:** This design focuses on the reasoning mechanism. It assumes the existing `Term`, `Task`, and `Truth` representations are sufficient. A future investigation should consider if insights from MeTTa (e.g., typed terms) could further enhance the system's capabilities.

This redesign provides a robust foundation for the next generation of the SeNARS system, enabling more sophisticated, efficient, and adaptive reasoning.
