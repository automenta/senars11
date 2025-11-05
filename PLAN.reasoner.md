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

## 6\. Detailed Development Plan & Actionable Flow

### Phase 1: Core Infrastructure Setup
- [x] Create `src/reason/` directory structure
- [x] Implement basic `PremiseSource` interface with abstract definition
- [x] Implement `TaskBagPremiseSource` concrete implementation
- [x] Implement `PremiseSources` bag class for multiple sources
- [x] Implement base `Rule` class with essential functionality
- [x] Implement `LMRule` class extending base `Rule` for language model rules
- [x] Update `Stamp.js` to include derivation depth tracking with proper depth calculation

### Phase 2: Core Processing Components
- [x] Implement `RuleExecutor` with basic rule indexing and lookup
- [x] Implement `RuleProcessor` with sync rule execution capabilities
- [x] Implement `RuleProcessor` with async rule execution capabilities
- [x] Implement `RuleProcessor` with async result aggregation mechanism
- [x] Implement `Strategy` class for premise pairing logic
- [x] Implement main `Reasoner` class with stream-based architecture
- [x] Connect all components into a functional pipeline

### Phase 3: Basic Integration & Testing
- [x] Create basic test suite for new reasoner components
- [x] Verify new reasoner can process simple deduction rules
- [x] Test derivation depth limit enforcement
- [x] Test CPU throttling functionality
- [x] Ensure backward compatibility with existing components during transition

### Phase 4: Robustness & Essential Features
- [x] Implement basic priority-only sampling in `TaskBagPremiseSource`:
  - [x] Implement priority-based task selection as default strategy
  - [x] Design flexible configuration structure for future sampling objectives
  - [x] Add placeholder for additional sampling objectives (recency, punctuation, novelty)
- [x] Enhance async rule result aggregation in `RuleProcessor`:
  - [x] Implement proper async result collection mechanism
  - [x] Ensure async results are properly merged with sync results
  - [x] Handle async rule completion timing properly
- [x] Add comprehensive error handling throughout pipeline:
  - [x] Add error handling for premise source failures
  - [x] Add error handling for strategy failures
  - [x] Add error handling for rule execution failures
  - [x] Add error handling for result processing failures
- [x] Add essential metrics collection:
  - [x] Count rule executions (sync and async separately)
  - [x] Track pipeline throughput
  - [x] Monitor resource usage (CPU, memory)
- [x] Implement proper resource lifecycle management:
  - [x] Add resource cleanup for all components
  - [x] Implement proper shutdown procedures
  - [x] Ensure no memory leaks in async operations

### Phase 5: Integration & Migration
- [x] Identify all system components using old reasoner:
  - [x] Scan codebase for reasoner usage patterns
  - [x] Document all integration points
  - [x] Assess migration complexity for each component
- [x] Create migration paths for each integration point:
  - [x] Create adapter patterns where needed
  - [x] Design configuration switches for gradual migration
  - [x] Plan for testing each migrated component
- [x] Update main system entry points to use new reasoner:
  - [x] Update system initialization code
  - [x] Update configuration loading
  - [x] Update dependency injection points
- [x] Add configuration options to switch between reasoner versions:
  - [x] Add runtime configuration flag
  - [x] Implement dynamic reasoner selection
  - [x] Add logging for which reasoner is active
- [x] Create comprehensive integration tests:
  - [x] Test end-to-end workflows
  - [x] Verify functional parity with old reasoner
  - [x] Test migration scenarios

### Phase 6: Design Enhancement & Refinement
- [x] Add self-optimization hooks for metacognitive control:
  - [x] Add control interfaces for metacognitive systems
  - [x] Implement feedback mechanisms
  - [x] Add tunable parameters for optimization
- [x] Enhance resource management with more granular controls:
  - [x] Add memory usage monitoring
  - [x] Implement dynamic CPU throttling
  - [x] Add adaptive depth limits
- [x] Improve pipeline metrics and observability:
  - [x] Add basic performance metrics
  - [x] Implement pipeline monitoring
  - [x] Add debugging utilities
- [x] Implement event-driven notification system:
  - [x] Add event emission for premise processing
  - [x] Add event emission for rule applications
  - [x] Add event emission for result generation
- [x] Add configurable buffering mechanisms:
  - [x] Add configurable input buffer sizes
  - [x] Add configurable processing queue sizes
  - [x] Add configurable output buffer sizes
- [x] Implement basic pipeline introspection capabilities:
  - [x] Add pipeline state inspection methods
  - [x] Add component status monitoring
  - [x] Add debugging information accessors
- [x] Add basic backpressure handling:
  - [x] Basic detection when output consumers slow down
  - [x] Implement simple processing rate adjustments
- [x] Add static rule compilation and validation:
  - [x] Add rule validation at registration time
  - [x] Add basic rule dependency checking
  - [x] Add basic rule conflict detection
- [x] Integrate unit and integration testing throughout this phase:
  - [x] Write unit tests for each enhancement
  - [x] Write integration tests for component interactions
  - [x] Run tests continuously during development

### Phase 7: Sophisticated Features & Advanced Testing
- [ ] Implement sophisticated premise selection algorithms:
  - [ ] Add weighted sampling strategies
  - [ ] Implement dynamic strategy selection
  - [ ] Add performance-based strategy adaptation
  - [ ] Implement recency-based sampling for recently activated tasks
  - [ ] Implement punctuation-based sampling for goals/questions
  - [ ] Implement novelty-based sampling for less-processed tasks
- [ ] Enhance pipeline introspection capabilities:
  - [ ] Add advanced pipeline state inspection methods
  - [ ] Add detailed component performance monitoring
  - [ ] Add advanced debugging information accessors
- [ ] Add advanced backpressure handling:
  - [ ] Advanced detection when output consumers slow down
  - [ ] Implement adaptive processing rates
  - [ ] Add consumer feedback mechanisms
- [ ] Create comprehensive test suite for all new functionality:
  - [ ] Unit tests for each component
  - [ ] Integration tests for component interactions
  - [ ] End-to-end workflow tests
- [ ] Create advanced test suite for new functionality:
  - [ ] Advanced unit tests for sophisticated features
  - [ ] Advanced integration tests for complex interactions
  - [ ] End-to-end workflow tests for new features
- [ ] Implement property-based testing for edge cases:
  - [ ] Generate random premise pairs for testing
  - [ ] Test with malformed inputs
  - [ ] Test with extreme parameter values
- [ ] Integrate testing throughout this phase:
  - [ ] Run comprehensive tests during development
  - [ ] Verify functional correctness of new features

### Phase 8: Documentation & Transition
- [ ] Document new architecture and usage patterns:
  - [ ] Create architectural overview
  - [ ] Document component interfaces
  - [ ] Create usage examples
- [ ] Create migration guide for developers:
  - [ ] Document API changes
  - [ ] Provide migration examples
  - [ ] Create FAQ for common issues
- [ ] Mark old reasoner as deprecated:
  - [ ] Add deprecation warnings
  - [ ] Update documentation to recommend new reasoner
  - [ ] Create transition timeline
- [ ] Plan timeline for removing old reasoner:
  - [ ] Set deprecation period
  - [ ] Plan for final removal
  - [ ] Communicate timeline to team
- [ ] Update examples and demos to use new reasoner:
  - [ ] Update existing examples
  - [ ] Create new examples showcasing new features
  - [ ] Update tutorials and documentation
- [ ] Verify all functionality previously covered by old reasoner tests:
  - [ ] Ensure functional equivalence
  - [ ] Test with existing test cases
  - [ ] Validate output consistency
- [ ] Add regression tests to ensure stable behavior:
  - [ ] Create baseline test cases
  - [ ] Add behavioral regression tests

### Phase 9: Performance & Optimization (Post-Prototype)
- [ ] Profile performance bottlenecks and optimize critical paths:
  - [ ] Identify slowest components
  - [ ] Optimize frequently executed code
  - [ ] Profile memory allocation patterns
- [ ] Implement advanced caching mechanisms:
  - [ ] Add result caching
  - [ ] Add rule matching caching
  - [ ] Add premise selection caching
- [ ] Optimize memory usage and garbage collection patterns:
  - [ ] Reduce object allocation in hot paths
  - [ ] Optimize data structures for memory efficiency
  - [ ] Profile and optimize garbage collection pressure
- [ ] Add sophisticated symbolic guard analysis and optimization to `RuleExecutor`:
  - [ ] Implement decision tree optimization
  - [ ] Add guard deduplication
  - [ ] Add guard ordering optimization
- [ ] Run long-running stability tests:
  - [ ] Test memory usage over time
  - [ ] Test for memory leaks
  - [ ] Test for performance degradation over time
- [ ] Add performance regression tests for production deployment:
  - [ ] Create performance benchmarks
  - [ ] Set performance thresholds
  - [ ] Monitor performance changes

### Implementation Prerequisites:
1. **Rule system compatibility**: Ensure new reasoner can execute both NAL and LM rules from existing libraries
2. **Memory integration**: Verify new reasoner can interface with existing memory systems (PriorityBag, TermLayer, etc.)
3. **Task compatibility**: Ensure new reasoner can process same task format as old reasoner
4. **Functional correctness**: New reasoner should provide correct reasoning output

### Success Criteria:
1. **Functional parity**: New reasoner can perform all reasoning tasks the old reasoner could
2. **Architecture compliance**: Stream-based, continuous processing working as designed
3. **Resource compliance**: CPU throttling, derivation depth limits enforced properly
4. **Correctness**: All reasoning outputs are functionally equivalent to old reasoner
5. **Test coverage**: All essential functionality covered by automated tests
6. **Integration compatibility**: Can be integrated without breaking existing systems

### Risk Mitigation:
1. **Backward compatibility**: Keep both reasoners during transition period
2. **Feature flagging**: Allow switching between old/new reasoner at runtime
3. **Gradual migration**: Migrate system components one at a time
4. **Comprehensive testing**: Maintain all existing tests during transition
5. **Rollback plan**: Easy way to revert to old reasoner if needed

### Design Enhancement Priorities (Non-Performance):
1. **Robustness**: Handle edge cases, error recovery, and graceful degradation as primary concern
2. **Modularity**: Keep components loosely coupled and easily testable
3. **Observability**: Provide clear metrics, debugging information, and pipeline inspection capabilities
4. **Configuration**: Make all key parameters tunable without code changes
5. **Event-driven architecture**: Support for pipeline event notifications and monitoring
6. **Configurable buffering**: Tune memory usage through adjustable buffer sizes
7. **Pipeline introspection**: Ability to inspect pipeline state during operation for debugging
8. **Graceful backpressure**: Handle situations where output consumers can't keep up
9. **Static rule compilation**: Ensure rules are properly validated and compiled at initialization
10. **Extensibility**: Allow for future additions of premise sources, strategies, and rule types  