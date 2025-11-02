# SeNARS Development Plan: A Self-Improving Architecture

> **Document Purpose**
>
> This document is the definitive development roadmap for SeNARS. It details the architectural principles, phased implementation plan, and technical specifications that guide the project's engineering efforts. Its focus is on the **how and when** of development.
>
> For a high-level overview of the project's goals, current status, and usage instructions, please see the **[README.md](../README.md)**.

## Executive Summary: A Practical Roadmap for Hybrid Intelligence

This document outlines the development plan for SeNARS, a hybrid neuro-symbolic reasoning system. It prioritizes a phased, practical approach to realizing the system's long-term architectural vision. The core goal is to build a robust, observable, and extensible platform for AI research by focusing on correctness, clear architecture, and comprehensive testing.

The plan is guided by a central architectural principle: creating **self-improving** data structures. The system's components (`Term`, `Task`, `Memory`) are designed to contain structural information that allows for emergent optimization, making the system more effective as it processes more information.

**Key Engineering Objectives:**

-   **Simplicity:** Reduce complexity and avoid over-engineering in core components.
-   **Robustness:** Create stable, predictable, and error-resistant modules.
-   **Consistency:** Establish clear conventions for APIs, data structures, and code style.
-   **Testability:** Ensure all components are covered by unit and integration tests.
-   **Extensibility:** Design for the straightforward addition of new features and reasoning capabilities.
-   **Functionality First:** Prioritize the correct implementation of all features before focusing on performance optimization.

---

## Core Architecture: The Self-Improving Data Structure Foundation

The foundation of SeNARS rests on a set of core data structures designed to enable emergent improvements in the reasoning process.

### Term: The Foundational Knowledge Structure
The `Term` is the immutable, canonical representation of all knowledge in the system.

-   **Core Principles:**
    -   **Strict Immutability**: Once created, a `Term` object is never modified. This enables safe caching, prevents side effects, and simplifies state management.
    -   **Canonical Normalization**: Logically equivalent terms (e.g., `(&, A, B)` vs. `(&, B, A)`) are normalized to a single, identical object representation by the `TermFactory`. This is critical for efficient pattern matching and knowledge consolidation.
    -   **Structural Intelligence**: `Term` objects provide methods for traversal (`.visit()`) and analysis (`.reduce()`), allowing algorithms to leverage their structure directly.
-   **Concerns & Requirements:**
    -   The normalization logic must correctly handle all Narsese operators, including edge cases for commutativity and associativity. An incomplete implementation would undermine the system's logical consistency.
    -   The `TermFactory` could become a performance bottleneck if caching and normalization are not implemented efficiently. This will be a key area for profiling in later optimization phases.
-   **Implementation Details:**
    -   All `Term` creation must be routed through a `TermFactory` to enforce normalization and caching.
    -   The `hashCode` will be pre-calculated and cached upon creation.
    -   Normalization will handle commutativity (sorting components) and associativity (flattening nested structures).

### Task: The Unit of Processing
A `Task` is an immutable wrapper around a `Term` that represents a unit of work for the system, such as a belief to process or a question to answer.

-   **Core Principles:**
    -   **Descriptive State**: Each `Task` contains a `Term` (the content), a `Truth` value, a `Stamp` (for evidence tracking), and a `budget` (for resource allocation).
    -   **Evidence Tracking**: The `Stamp` system provides a complete derivation history, allowing for traceability and learning from reasoning paths.
    -   **Resource Allocation**: The `budget` system (priority, durability, etc.) allows the system to manage attention and processing resources.
-   **Concerns & Requirements:**
    -   Calibrating the budget and attention allocation algorithms is a significant challenge. Poor heuristics could lead to important tasks being starved of processing time.
    -   The evidence-tracking mechanism (Stamps) could consume significant memory if not managed properly, especially for long reasoning chains.
-   **Implementation Details:**
    -   `Task` objects will be strictly immutable. Any modification (e.g., updating a truth value) will result in a new `Task` instance.
    -   The `Stamp` will form a directed acyclic graph (DAG) of evidence.

### Memory: The Knowledge Organization System
The `Memory` component organizes all knowledge into `Concepts`, which are collections of `Tasks` related to a specific `Term`.

-   **Core Principles:**
    -   **Concept-Based Storage**: All information related to a `Term` is clustered within a corresponding `Concept`, enabling efficient, associative access.
    -   **Dual-Memory Architecture**: The system separates a `Focus` set (short-term, active processing) from the main `Memory` (long-term storage).
    -   **Attention-Based Consolidation**: An attention mechanism determines which tasks are moved into the focus set for active processing and which are forgotten over time.
-   **Concerns & Requirements:**
    -   The dual-memory architecture adds complexity. The process of consolidating tasks between focus and long-term memory must be efficient to avoid becoming a system bottleneck.
    -   The forgetting mechanism is critical for managing memory usage but must be designed carefully to avoid the premature loss of important, but infrequently accessed, knowledge.
-   **Implementation Details:**
    -   The core data structure will be a `Map<Term, Concept>`.
    -   The `Focus` will be implemented as a priority-based selection mechanism.
    -   Consolidation algorithms will run periodically as part of the main reasoning cycle.

---

## Implementation Roadmap: A Phased Approach to Functionality

This roadmap is divided into phases, each with a clear set of functional goals. Performance optimization is explicitly deferred to the final phases to avoid premature optimization.

### Phase 1: Foundation and Core Infrastructure
-   **Goal**: Establish the foundational data structures and utilities.
-   **Deliverables**:
    -   `Term` class with strict immutability, equality, and hashing.
    -   `TermFactory` with initial caching and normalization for commutative operators (e.g., `&`, `|`).
    -   Implementation of `Term` visitor and reducer patterns.
    -   Core utilities: `EventBus` for component communication, a basic `SystemConfig` for managing parameters, and validation helpers.
-   **Acceptance Criteria**: Achieve >95% unit test coverage for `Term` immutability and normalization logic for all implemented operators.

### Phase 2: Memory System and Task Management
-   **Goal**: Implement the core components for storing and managing knowledge.
-   **Deliverables**:
    -   Immutable `Task`, `Truth`, and `Stamp` classes with full property implementation.
    -   `Memory` class with a concept-based storage map (`Map<Term, Concept>`).
    -   `Focus` component for short-term memory management.
    -   Initial implementation of the dual-memory architecture and task consolidation.
-   **Acceptance Criteria**: The system can correctly store, retrieve, and prioritize tasks based on their budget. Integration tests verify task flow from input to memory.

### Phase 3: Rule Engine and Reasoning
-   **Goal**: Build the engine for applying inference rules.
-   **Deliverables**:
    -   A base `Rule` framework with a clear interface (`canApply()`, `apply()`).
    -   Implementation of core NAL inference rules (deduction, revision) and their corresponding truth functions.
    -   Implementation of the full suite of NAL truth value operations: revision, deduction, induction, abduction, negation, and expectation.
    -   A `RuleEngine` to select and apply rules to tasks.
    -   A `Cycle` component to orchestrate the overall reasoning flow (task selection -> rule application -> memory update).
-   **Acceptance Criteria**: The system can perform basic logical inferences and derive new beliefs from existing ones, with truth values correctly propagated according to NAL specifications.

### Phase 4: Parser and Input Processing
-   **Goal**: Enable the system to understand the Narsese language.
-   **Deliverables**:
    -   A robust Narsese parser capable of handling all specified NAL operator types.
    -   Support for parsing statements with terms, punctuation (`.`, `!`, `?`), and truth values (`%f;c%`).
    -   Comprehensive validation of Narsese syntax with clear error messages and truth value range validation `[0,1]`.
    -   Error recovery mechanisms for malformed input.
-   **Acceptance Criteria**: The parser correctly handles all documented Narsese syntax, with property-based tests verifying its robustness against a wide range of inputs.

### Phase 5: NAR Main Component and API
-   **Goal**: Assemble all components into a unified system with a public API.
-   **Deliverables**:
    -   `NAR` class as the central system orchestrator, with a detailed API (see *Technical Specifications*).
    -   `input(narseseString)` method for feeding knowledge into the system.
    -   `on(eventName, callback)` for subscribing to a comprehensive set of system events (e.g., `'output'`, `'belief_updated'`, `'cycle_end'`).
    -   Control methods: `start()`, `stop()`, `step()`.
    -   Query methods: `getBeliefs()`, `query()`.
    -   Initial "metacognitive" capabilities: The event system will emit detailed metrics about cycle performance and rule application, making the system's internal state observable.
-   **Acceptance Criteria**: A fully integrated NAR system that can be controlled and queried through a well-defined API, demonstrated via end-to-end tests.

### Phase 6: Advanced Features and NARS-LM Integration
-   **Goal**: Implement advanced reasoning capabilities and hybrid NAL-LM logic.
-   **Deliverables**:
    -   An `LM` integration component with a provider registry.
    -   Protocols for NARS-LM collaboration, focusing on synergistic reasoning (e.g., using the LM to generate hypotheses that NAL then validates).
    -   Cross-validation mechanisms to ensure consistency between NAL and LM outputs.
    -   Advanced memory management: priority decay, more sophisticated forgetting algorithms, and specialized indexing for different term types (inheritance, implication, etc.).
    -   A basic plugin architecture to allow for the dynamic registration of new inference rules.
-   **Acceptance Criteria**: The system can successfully use an LLM to generate candidate beliefs and validate them using its internal NAL logic. The plugin system can load a custom rule at runtime.

### Phase 7: Testing and Quality Assurance
-   **Goal**: Ensure the system is robust, reliable, and correct.
-   **Deliverables**:
    -   Comprehensive unit test coverage (>95%) for all core components.
    -   Integration tests simulating real-world input sequences and reasoning chains.
    -   Property-based testing for the `Term` normalization and `Truth` function logic.
    -   A fluent "Reasoner Test API" to simplify the writing of integration tests, abstracting away cycle management and memory inspection for clearer test cases.
-   **Acceptance Criteria**: The test suite is automated and passes consistently, providing high confidence in the correctness of the system's logic.

### Phase 8: Deployment, Documentation, and Optimization
-   **Goal**: Prepare the system for production use and perform targeted performance tuning.
-   **Deliverables**:
    -   Detailed API documentation and comprehensive user guides.
    -   Containerization support (Docker) for easy deployment.
    -   **Security Hardening**: Implementation of input sanitization and resource limits to prevent abuse.
    -   **Reliability Engineering**: Implementation of robust error handling, graceful degradation, and circuit breaker patterns for external services (like LMs).
    -   **Internationalization**: Basic support for different Narsese syntax variants and natural language translation hooks.
    -   **Performance Profiling**: A systematic analysis to identify and quantify performance bottlenecks in the now-functional system.
    -   **Targeted Optimization**: Code changes to address the identified bottlenecks.
    -   Establishment of performance benchmarks for regression testing.
-   **Acceptance Criteria**: The system is deployable via Docker, is well-documented, secure, reliable, and meets defined performance targets for key operations.

---

## Coherent Technical Specifications

### NAR API Specification
-   `constructor(config: SystemConfig)`: Initializes all components with a validated configuration object.
-   `input(narseseString: string)`: Parses a Narsese string, creates a `Task`, and adds it to memory.
-   `on(eventName: string, callback: Function)`: Registers listeners for system events.
-   `start()` / `stop()`: Initiates/halts the continuous reasoning cycle.
-   `step()`: Executes a single reasoning cycle for debugging.
-   `getBeliefs(queryTerm?: Term)`: Returns current beliefs, optionally filtered.
-   `query(questionTerm: Term)`: Submits a question and returns a promise that resolves with the answer.
-   `reset()`: Clears memory and resets the system state.

### Parser System Specifications
-   **Narsese Syntax Support**: Must parse all NAL operator types, including:
    -   Inheritance `(A --> B)`, Similarity `(A <-> B)`, Implication `(A ==> B)`, Equivalence `(A <=> B)`
    -   Conjunction `(&, A, B, ...)`, Disjunction `(|, A, B, ...)`, Negation `(--, A)`
    -   Sets `{A, B, C}`, `[A, B, C]`, Sequential conjunction `(&/, A, B)`, Instance `(--{ A)`, Property `(-->} B)`
    -   Operations `(A ^ B)`, Products `(A, B, C)`
-   **Error Handling**: The parser must not crash on invalid input. It should report a clear error and allow the system to continue running.
-   **Integration**: The parser must use the `TermFactory` to create all `Term` objects, ensuring normalization is applied at the point of creation.

### Rule Engine Framework
-   **NAL Truth Functions**: The engine must correctly implement the full set of NAL truth functions for inference.
-   **Rule Interface**: All rules will implement a common interface: `canApply(task)` and `apply(task)`.
-   **Hybrid Coordination**: The engine will orchestrate NAL-LM interaction. A potential workflow:
    1.  NAL engine processes a task.
    2.  If no NAL rule can be applied or confidence is low, the engine can formulate a prompt for an LM.
    3.  The LM response is parsed back into Narsese.
    4.  The new Narsese statement is input into the NAL engine, which checks it for consistency with existing beliefs (cross-validation).

### Memory and Attention Management
-   **Concept Structure**: Each `Concept` will contain collections of `Tasks` (e.g., beliefs, goals) and links to related concepts.
-   **Focus Selection**: The `FocusSetSelector` will use a composite score based on a task's priority, urgency (time since last access), and novelty to promote cognitive diversity.
-   **Forgetting Policy**: The initial policy will be a simple priority decay over time. More advanced, usage-based policies will be implemented in Phase 6.

### Configuration Management
-   **Structure**: A single, immutable `SystemConfig` object will be passed to the `NAR` constructor.
-   **Validation**: The configuration system will validate the provided settings (e.g., checking for valid ranges, required parameters) and provide clear error messages.
-   **Defaults**: The system will provide sensible default values for all parameters to facilitate ease of use.
