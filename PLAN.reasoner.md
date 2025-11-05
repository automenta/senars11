# SeNARS Reasoner Redesign

## 1\. Vision & Core Principles

This document refines the Reasoner redesign, evolving it into a **continuous, stream-based dataflow architecture**. This approach more elegantly handles the hybrid, asynchronous nature of the system and provides a stronger foundation for autonomous, long-running operation. The core principles remain the same, with an added emphasis on:

* **Continuous Processing:** The system should be able to operate as a continuous, non-blocking pipeline, processing information as it becomes available, rather than being purely iterative or request-driven.
* **Resource-Awareness:** The system must explicitly manage computational resources (CPU, memory, derivation depth) to ensure stable, long-term operation, directly adhering to the Assumption of Insufficient Knowledge and Resources (AIKR).

The Reasoner is reconceptualized as a pipeline that transforms streams of premises into a stream of conclusions.

\+------------------+      \+------------------+

|  PremiseSource   |\<-----|      Memory      |

| (e.g., TaskBag)  |      | (Term/Embedding) |

| \- Sampling       |      \+------------------+

\+------------------+

         | (Stream of primary premises)

         v

\+------------------+      \+------------------+

|    Reasoner      |-----\>|     Strategy     |

|------------------|      |------------------|

| \- Start/Stop/Step|      | \- Premise Pairing|

| \- CPU Throttle   |      | \- Budget Mgmt    |

| \- Output Stream  |      \+------------------+

\+------------------+

         | (Stream of premise pairs)

         v

\+------------------+      \+------------------+

|  RuleProcessor   |-----\>|  RuleExecutor   |

| (Async Pipeline) |      |------------------|

\+------------------+      | \- Guard Analysis |

         |                | \- Indexing (Trie)|

         | (Dispatches to Rules)

         |

\+--------v--------+

|      Rules      |

| \- NAL (sync)    |

| \- LM (async)    |

\+-----------------+

         | (Results from sync & async rules)

         |

         \+------------------\> Merged into Reasoner's Output Stream

---

**Workflow Overview:**

1. **Source:** A `PremiseSource` generates a continuous stream of `Task`s, drawing from `Memory` based on tunable sampling objectives.
2. **Orchestration:** The `Reasoner` subscribes to this stream. It controls the flow rate via a **CPU Throttle** and manages the overall process.
3. **Strategy:** The `Strategy` receives the stream of primary premises. For each one, it uses the `PremiseSelector` to find a suitable secondary premise, emitting a stream of premise pairs.
4. **Processing:** The `RuleProcessor` consumes the premise pairs. It uses the `RuleExecutor` to find matching rules efficiently. It processes these rules in a non-blocking fashion:
    * Synchronous NAL rules are executed, and their results are emitted immediately.
    * Asynchronous LM rules are dispatched, and their results are emitted later when they complete.
5. **Output:** The results from all rules are merged into a single, unified output stream exposed by the `Reasoner`. Other system components can subscribe to this stream to consume the newly derived tasks.

---

## 3\. Detailed Component Design (Revision 2\)

### **3.1. `PremiseSource` (New Component)**

This component decouples the Reasoner from the `Memory` and provides a configurable stream of input.

**Responsibilities:**

* Generate an `AsyncIterator` of `Task`s to serve as primary premises.
* Implement various sampling strategies based on constructor-defined objectives.
* Abstract the underlying data source (e.g., `Memory`, a network socket, a user input queue).

**Sampling Objectives Examples:**

* `priority`: Sample tasks based on their priority value.
* `recency`: Favor tasks that have been recently activated.
* `punctuation`: Focus on `Goal`s or `Question`s.
* `novelty`: Favor tasks that have participated in fewer reasoning steps.

  ### **3.2. The `Reasoner` (Revised)**

The `Reasoner` is now a stateful service that manages the continuous reasoning pipeline.

**Responsibilities:**

* Manage the overall pipeline lifecycle: `start()`, `stop()`, `step()`.
* Expose a single `outputStream` (`AsyncGenerator<Task>`) for consumers.
* Implement resource constraints:
    * **CPU Throttle:** Ensure the reasoning loop yields to the event loop periodically to avoid blocking and control CPU usage.
    * **Derivation Depth Limit:** Enforce a maximum derivation depth on `Stamp`s to keep the derivation graph finite (AIKR).

  ### **3.3. `RuleExecutor` (Previously `RuleIndexer`)**

This component is given a more explicit name and responsibility. It's not just an indexer; it's a pre-compiler and optimizer for the entire rule set.

**Responsibilities:**

* Index all registered rules for fast retrieval (e.g., using a Trie).
* **Analyze and Optimize Symbolic Guards:**
    * **Deduplication & Ordering:** Analyze the `guards` of all rules to build a shared decision tree. Common checks (e.g., `term.isCompound`) are performed only once.
    * **Subsumption:** Detect if one rule is a more specific version of another, allowing the engine to prioritize or prune rules intelligently.
    * **Folding:** Pre-evaluate parts of guards that are constant.
* Provide the `RuleProcessor` with an optimized plan for evaluating rules against a given premise pair.

**Implementation Note:** The guard optimization can be a build-time or startup-time step. The `RuleExecutor` would analyze the static `Rule` definitions and compile them into an efficient, executable function or data structure that represents the decision tree.

### **3.4. `RuleProcessor` (Revised)**

The `RuleProcessor` is redesigned to be a fully non-blocking pipeline stage.

**Responsibilities:**

* Consume a stream of premise pairs from the `Strategy`.
* For each pair, use the `RuleExecutor` to get a set of candidate rules.
* Immediately execute all synchronous rules.
* Dispatch all asynchronous rules *without awaiting them*.
* Return an `AsyncGenerator<Task>` that yields results as they become available from both sync and async operations. This ensures the pipeline is never blocked by I/O.

  ### **3.5. `Stamp` and Derivation Graph Constraints**

To comply with AIKR, the derivation process must be finite.

* **Derivation Depth:** The `Stamp` object will now include a `depth` property.
    * A base task from input has `depth: 0`.
    * A task derived from parents with depths `d1, d2, ...` will have `depth: max(d1, d2, ...) + 1`.
* **System Limit:** The `Reasoner` config will have a `maxDerivationDepth`.
* **Enforcement:** The `RuleProcessor`, after deriving a new task, will check its `stamp.depth`. If it exceeds the limit, the task is discarded.

**Concern:** A hard cutoff might discard potentially useful information. Future versions could explore alternative strategies, such as heavily penalizing the priority of deep-derived tasks rather than discarding them outright.

---

## 4\. Self-Optimization (Refined)

This architecture provides richer hooks for self-optimization:

* **Action Space:** The `PremiseSource`'s `samplingObjectives` are a direct control knob. The metacognitive layer can tune these parameters to guide the Reasoner's focus.
* **Credit Assignment:** The finite, explicit derivation graph recorded in `Stamp`s is perfect for credit assignment. When a `Goal` is achieved, credit can flow back through the graph to the specific `Rule`s and `PremiseSource` configurations that were effective.
* **Performance Metrics:** The `RuleProcessor` and `Reasoner` will track not just rule applications but also pipeline metrics: throughput, latency of async rules, buffer sizes, etc. This provides a holistic view of system health and efficiency.

---

## 5\. Summary of Enhancements in Revision 2

* **Architecture:** Shifted from a request-response model to a more powerful and flexible **stream-based pipeline**.
* **Execution Mode:** Natively supports **continuous, non-blocking execution**, which is essential for autonomous agents, while still allowing for iterative/batch processing.
* **Control & Tuning:** Introduced the `PremiseSource` with tunable **sampling objectives**, providing a clear mechanism for a self-optimization layer to guide reasoning.
* **Efficiency:** Upgraded the `RuleIndexer` to a `RuleExecutor` with a mandate to perform advanced **symbolic guard analysis** (deduplication, ordering), moving beyond simple indexing.
* **Resource Management:** Explicitly added a **CPU Throttle** and a **maxDerivationDepth** limit to ensure stability and adherence to AIKR.
* **Clarity & Justification:** The added complexity is justified by the significant increase in capability, moving the system closer to a truly autonomous, resource-aware reasoning engine.

## PremiseSources

Create a \`class PremiseSources extends PremiseSource\`: a \`Bag\` of \`PremiseSource\`s, that uses the Bag's sampling capabilities to sample from the sources in proportion.  (This is an extra for future usage; the design doesn't depend on it.)

This revised design represents a significant step towards a more robust, performant, and intelligent Reasoner, fully embracing the hybrid, resource-constrained nature of its mission.

class PremiseSource {

/\*\*

\* @param {Memory} memory \- The memory to draw from.

\* @param {object} samplingObjectives \- Configuration for the sampling strategy.

\*/

constructor(memory, samplingObjectives);

/\*\*

\* Returns an async stream of premises.

\* @returns {AsyncGenerator\<Task\>}

\*/

stream();

}  
class Reasoner {

constructor(premiseSource, strategy, ruleProcessor, config);

/\*\* The stream of newly derived tasks. \*/

get outputStream(): AsyncGenerator\<Task\>;

/\*\* Starts the continuous reasoning process. \*/

start();

/\*\* Stops the continuous reasoning process. \*/

stop();

/\*\* Executes a single reasoning step. Useful for debugging and iterative mode. \*/

async step();

}  