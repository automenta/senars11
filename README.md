# SeNARS (Semantic Non-axiomatic Reasoning System)

A hybrid neuro-symbolic reasoning system that combines Non-Axiomatic Logic (NAL) with Language Models (LM) to create an observable platform for exploring advanced AI concepts.

**System Definition:**
- **Hybrid Neuro-Symbolic Reasoning**: Integration of formal symbolic reasoning (NAL) with neural language model capabilities
- **Non-Axiomatic Logic (NAL)**: A logic system that does not rely on fixed axioms but adapts based on experience and evidence
- **Observable Platform**: A system that provides real-time visibility into its reasoning processes, enabling analysis and understanding of its decision-making

## System Architecture

### Core Components Overview

The system consists of several interconnected components:

- **NAR (NARS Reasoner Engine)**: The main entry point and orchestrator that manages the reasoning cycle and coordinates all system components
- **Memory**: Manages concepts, tasks, and knowledge representation; implements both long-term and short-term (focus) memory systems
- **Focus Manager**: Handles attention focus sets (short-term memory) that prioritize tasks for immediate processing based on attention mechanisms
- **Term**: Core immutable data structure for representing knowledge elements with structural properties that support reasoning
- **Task**: Represents units of work or information processed by the system; encapsulates a Term with associated truth values, stamps, and processing priorities
- **Reasoning Engine**: Applies NAL and LM rules to generate inferences, conclusions, and new knowledge from existing information
- **Parser**: Handles Narsese syntax parsing and generation; converts between human-readable Narsese notation and internal Term representations
- **LM (Language Model Integration)**: Provides language model capabilities that complement formal symbolic reasoning with neural pattern recognition

### Directory Structure

```
/
├── src/
│   ├── core/                   # Core reasoning logic and data structures
│   │   ├── nar/                # NAR system entry point and control
│   │   │   ├── NAR.js          # Main API for system control, input, and output
│   │   │   ├── Cycle.js        # Manages the reasoning cycle execution
│   │   │   └── SystemConfig.js # Configuration for NAR instance
│   │   ├── memory/             # Memory management and knowledge representation
│   │   │   ├── Memory.js       # Central memory component, stores Concepts
│   │   │   ├── Concept.js      # Represents a concept in memory, holds related Tasks
│   │   │   └── Bag.js          # Priority-based collection for Tasks within Concepts
│   │   ├── term/               # Robust Term handling
│   │   │   ├── Term.js         # Immutable Term class
│   │   │   ├── TermFactory.js  # Factory for creating and normalizing Terms
│   │   │   └── operations/     # Subterm access, visitors, reducers, equality, hashing
│   │   ├── task/               # Task representation and management
│   │   │   ├── Task.js         # Immutable Task class
│   │   │   └── TaskManager.js  # Manages task lifecycle, priority, and selection
│   │   ├── reasoning/          # Rule application and inference
│   │   │   ├── RuleEngine.js   # Orchestrates NAL and LM rule application
│   │   │   ├── RuleSet.js      # Manages collections of rules
│   │   │   ├── nal/            # NAL-specific rules and structures
│   │   │   │   ├── NALRule.js
│   │   │   │   └── ...
│   │   │   └── lm/             # LM-specific rules and integration
│   │   │       ├── LMRule.js
│   │   │       └── ...
│   │   └── io/                 # Input/Output adapters and management
│   │       └── IOAdapterManager.js # Manages various input/output formats
├── tests/
│   ├── unit/                   # Focused tests for individual classes/functions
│   │   ├── term/Term.test.js
│   │   ├── task/Task.test.js
│   │   └── ...
│   ├── integration/            # Tests for component interactions and overall system behavior
│   │   └── NAR.integration.test.js
│   └── support/                # Test utilities and fluent API
│       └── fluentReasonerAPI.js # Fluent API for writing expressive reasoner tests
├── examples/                   # Demonstrations of system usage
│   ├── basic-usage.js
│   └── ...
├── ui/                         # Web UI built with React and Vite
├── scripts/                    # Organized scripts for operations
├── package.json
└── README.md
```

---

## Key Objectives

**Key Design Objectives:**

- **Simplicity:** Reduce complexity and eliminate over-engineering.
- **Robustness:** Create stable, predictable, and error-resistant core components.
- **Consistency:** Establish clear conventions for API design, data structures, and code style.
- **Testability:** Ensure all parts of the system are comprehensively testable with unit and integration tests.
- **Extensibility:** Design for easy addition of new features, reasoning capabilities, and rule sets.
- **Performance:** Optimize critical paths, especially for `Term` and `Memory` operations.

---

## Core Data Structures

### `Term` Class

The `Term` class is the cornerstone of the system, designed for strict immutability and robust operations.

**Key Features:**

- **Strict Immutability:** Once created, a `Term` instance cannot be modified. All internal data structures are
  frozen or deeply immutable. This simplifies reasoning about state and enables efficient caching.
- **Equality, Comparators, and Hashcode:**
    - `equals(otherTerm)`: Deep equality comparison, considering structure and content.
    - `hashCode()`: A consistent hash code generation for efficient use in `Map`s and `Set`s. This is
      pre-calculated upon creation and stored.
    - `compareTo(otherTerm)`: For ordered collections (if needed).
- **Factory Construction (`TermFactory`):**
    - All `Term` instances are created via `TermFactory.create(termExpression)`.
    - The factory handles parsing of Narsese-like string expressions into concrete `Term` objects.
    - **Reduction and Normalization:** The factory automatically performs canonical reductions for compound terms,
      such as:
        - Commutativity for operators like `&` (conjunction), `|` (disjunction): `(&, B, A)` normalizes to
          `(&, A, B)`.
        - Associativity for operators: `(&, A, (&, B, C))` normalizes to `(&, A, B, C)`.
        - Elimination of redundancies: `(&, A, A)` normalizes to `A`.
    - **Caching:** The factory caches `Term` instances to ensure that identical terms (after normalization) always
      refer to the same object, optimizing memory and equality checks.
- **Properties:**
    - `id`: A unique identifier (e.g., hash code or canonical string representation).
    - `operator`: The main operator of the term (e.g., `&`, `-->`, `_`).
    - `arity`: Number of direct sub-terms.
    - `complexity`: A numerical measure of the term's structural complexity.
    - `isAtomic`, `isCompound`, `isVariable`, `isStatement`, etc.
- **Sub-term Accessors:**
    - `getComponent(index)`: Access a direct sub-term by its 0-based index.
    - `getComponents()`: Returns an immutable array of direct sub-terms.
    - `getAllSubTerms()`: Returns a flattened, unique list of all sub-terms (including nested ones).
- **Sub-term Visitors:**
    - `visit(visitorFunction)`: Traverses the term structure, applying a function to each sub-term (pre-order, in-order,
      post-order options).
- **Sub-term Reducers:**
    - `reduce(reducerFunction, initialValue)`: Applies a reducer function across the term structure to aggregate a
      result.

**Technical Definitions:**
- **Term**: An atomic or compound representation of knowledge in the system, serving as the basic unit of reasoning
- **Atomic Term**: A simple, indivisible term with no sub-components (e.g., "bird", "red")
- **Compound Term**: A term constructed from multiple sub-terms using logical operators
- **Term Normalization**: The process of converting equivalent terms to a canonical form to ensure consistent representation
- **Term Complexity**: A calculated value representing the structural depth and intricacy of a term

### `Task` Class

The `Task` class represents a unit of work or information within the system, designed for robustness and clarity.

**Key Features:**

- **Immutability:** `Task` instances are immutable.
- **Properties:**
    - `term`: The `Term` instance associated with this task.
    - `truth`: An object representing the truth value (e.g., `{ frequency: 0.9, confidence: 0.8 }`).
    - `stamp`: An object containing metadata about the task's origin and evidence, including creation timestamp, source,
      and derivation history.
    - `priority`: A numerical value indicating the task's urgency or importance in memory.
    - `type`: An enum or string indicating the task's nature (e.g., `INHERITANCE`, `BELIEF`, `GOAL`, `QUESTION`).
    - `budget`: Resources allocated to the task for processing.
- **Methods:**
    - `derive(newTruth, newStamp)`: Creates a new `Task` instance based on the current one but with updated truth and
      stamp, ensuring immutability.

**Technical Definitions:**
- **Task**: An immutable wrapper around a Term that represents a unit of work or information to be processed by the system
- **Truth Value**: A representation of the certainty or likelihood associated with a task, with different semantics for Beliefs vs Goals
- **Stamp**: Metadata tracking the origin, derivation history, and evidence base of a task
- **Priority**: A numerical value determining the order in which tasks are processed by the reasoning engine
- **Budget**: Computational resources allocated to process the task

### Belief vs. Goal: Foundational Concepts for Reinforcement Learning

Understanding the distinction between Belief and Goal tasks is fundamental to SeNARS's capability as a general-purpose reinforcement learning system:

**Belief Tasks (.)** represent declarative knowledge about the world:
- **Purpose**: Encode what the system believes to be true about its environment
- **Truth Values**: Represent frequency (how often something is observed) and confidence (reliability of that observation)
- **Function**: Serve as the system's model of the world, informing decision-making
- **Example**: `<door_open --> visible>{0.8, 0.9}.` (The system believes with 80% frequency and 90% confidence that the door is visible)

**Goal Tasks (!)** represent procedural objectives the system seeks to achieve:
- **Purpose**: Define desired outcomes that guide the system's actions and learning
- **Truth Values**: Represent desire (how much the outcome is wanted) and confidence (strength of that desire)
- **Function**: Drive reinforcement learning through reward signals and action selection
- **Example**: `<key_picked_up --> achieved>!{0.9, 0.8}.` (The system desires with 90% intensity and 80% confidence to pick up the key)

**Technical Definitions:**
- **Belief Task**: A task with frequency-confidence truth semantics representing declarative knowledge about the world
- **Goal Task**: A task with desire-confidence truth semantics representing procedural objectives to be achieved
- **Truth Semantics**: Distinct interpretations of truth values based on task type (frequency-confidence for beliefs, desire-confidence for goals)
- **Reinforcement Learning**: A machine learning paradigm where an agent learns to take actions in an environment to maximize cumulative reward

**Reinforcement Learning Integration**:
This distinction enables SeNARS to function as a general-purpose reinforcement learning system where:
- **Beliefs** form the world model that predicts outcomes of actions
- **Goals** define the reward structure that guides policy learning
- **Interaction**: The system learns by attempting to achieve goals and updating beliefs based on outcomes
- **Adaptation**: Truth value revision mechanisms allow continuous learning from experience

The separation of these concept types with distinct truth semantics enables SeNARS to naturally implement the exploration-exploitation balance fundamental to reinforcement learning, where beliefs guide exploitation of known knowledge while goals drive exploration toward desired outcomes.

---

## Core System Components

### `NAR` (NARS Reasoner Engine)

The `NAR` class serves as the central orchestrator and public API for the entire reasoning system.

**API:**

- `constructor(config: SystemConfig)`:
    - Initializes the `Memory`, `Focus`, `RuleEngine`, `TaskManager`, and `Cycle` with the provided configuration.
    - `SystemConfig` specifies rule sets (NAL, LM), memory parameters, and other system-wide settings.
- `input(narseseString: string)`: Parses a Narsese string, creates a `Task`, and adds it to the `TaskManager` and
  `Memory`.
- `on(eventName: string, callback: Function)`: Registers event listeners for various system outputs and internal
  events (e.g., `'output'`, `'belief_updated'`, `'question_answered'`, `'cycle_start'`, `'cycle_end'`).
- `start()`: Initiates the continuous reasoning cycle.
- `stop()`: Halts the reasoning cycle.
- `step()`: Executes a single reasoning cycle, useful for debugging and controlled execution.
- `getBeliefs(queryTerm?: Term)`: Returns a collection of current beliefs from memory, optionally filtered by a query
  term.
- `query(questionTerm: Term)`: Submits a question to the system and returns a promise that resolves with the answer.
- `reset()`: Clears memory and resets the system to its initial state.

**Technical Definitions:**
- **NAR (NARS Reasoner Engine)**: The main system orchestrator that manages all components and provides the public API
- **Reasoning Cycle**: The iterative process by which the system processes tasks and generates new knowledge
- **Narsese**: The formal language used to represent knowledge and tasks in the system

### Memory and Focus Management

The `Memory` component manages both long-term memory and short-term attention focus sets through the `Focus` system:

- **Structure:** Uses a `Map<Term, Concept>` for efficient lookup of concepts by their associated terms.
- **Dual Memory Architecture:** Separates focus sets (short-term memory) from long-term memory:
    - **Focus Sets:** Priority-based attention focus sets for immediate processing
    - **Long-term Memory:** Storage for all other tasks and concepts
- **Index Management:** Specialized indexes for different term types (inheritance, implication, similarity, etc.)
- **Concept:** Each concept holds related tasks, ordered by priority, and stores metadata.
- **Operations:**
    - `addConcept(term: Term)`: Creates and adds a new concept.
    - `getConcept(term: Term)`: Retrieves a concept.
    - `addOrUpdateTask(task: Task)`: Adds a task to the relevant concept's storage.
    - `consolidate(currentTime)`: Moves tasks between focus and long-term memory based on priority.

**Technical Definitions:**
- **Memory**: The system component that stores and manages all knowledge representations (Terms, Tasks, Concepts)
- **Concept**: A collection of tasks related to the same term, organized by priority and metadata
- **Dual Memory Architecture**: A system design that separates short-term (focus) and long-term memory for efficient processing
- **Focus Sets**: High-priority, short-term memory stores for tasks requiring immediate attention
- **Consolidation**: The process of moving tasks between memory systems based on priority and time factors

### `Focus` and `FocusSetSelector`

Manages attention focus sets (short-term memory):

- **Short-term Memory Management**: Implements attention focus sets that represent short-term memory
- **Focus Set Management**: Creating and managing multiple named focus sets with configurable sizes
- **Priority-Based Selection**: Selecting high-priority tasks from focus sets using configurable selection strategies
- **Attention Scoring**: Maintaining attention scores for focus sets to determine their relevance
- **Task Promotion**: Mechanism for promoting high-priority tasks from focus (short-term) to long-term memory

The `FocusSetSelector` implements advanced task selection:

- **Composite Scoring**: Combining priority, urgency (time since last access), and cognitive diversity
- **Adaptive Selection**: Configurable parameters for priority thresholds, urgency weighting, and diversity factors
- **Cognitive Diversity**: Consideration of term complexity to promote reasoning diversity

**Technical Definitions:**
- **Focus**: The system component managing short-term memory and attention mechanisms
- **Focus Set**: A named collection of high-priority tasks requiring immediate processing
- **Attention Scoring**: The assignment of relevance values to focus sets to guide processing priority
- **FocusSetSelector**: The component responsible for selecting which tasks from focus sets are processed next
- **Cognitive Diversity**: A measure of variety in task characteristics to ensure diverse reasoning paths

### `Cycle` and Task Processing

The `Cycle` orchestrates the flow of reasoning within the `NAR` system:

1. **Task Selection:** Uses the `FocusSetSelector` to choose tasks from the focus set.
2. **Rule Application:** The selected tasks are passed to the `RuleEngine`.
3. **Inference & Derivation:** The `RuleEngine` applies relevant NAL and LM rules, generating new `Task`s (inferences,
   derivations, questions, goals).
4. **Memory Update:** New and updated `Task`s are integrated back into `Memory`.
5. **Output Generation:** Significant inferences or answers trigger output events.

**Technical Definitions:**
- **Reasoning Cycle**: The iterative process that executes one complete step of the reasoning process
- **Task Selection**: The process of choosing which tasks to process in the current cycle based on priority and attention
- **Inference**: The generation of new knowledge from existing knowledge using logical rules
- **Derivation**: The creation of new tasks through rule application and logical operations

### `RuleEngine` and Rule Management

The `RuleEngine` manages and applies both NAL and LM rules with sophisticated management capabilities:

- **Rule Types:** Supports both NAL inference rules and LM integration rules
- **Rule Registration:** System for adding and categorizing different types of rules
- **Enable/Disable Control:** Fine-grained control over which rules are active
- **Group Management:** Ability to organize rules into groups and manage them collectively
- **Rule Validation:** Validation of rule structure and functionality
- **Performance Metrics:** Comprehensive tracking of rule execution performance
- **Hybrid Reasoning:** Orchestrates NAL-LM integration through coordinated rule application
- **Base Rule Interface:** Common interface defining `canApply()` and `apply()` methods

**Rule Classifications:**

- **NAL Rules:** Implement logical inference using NAL truth functions with pattern matching
- **LM Rules:** Interact with language models for enhanced reasoning, including prompt generation and response
  processing

**Technical Definitions:**
- **RuleEngine**: The component responsible for managing and applying inference rules
- **NAL Rules**: Rules implementing Non-Axiomatic Logic inference patterns and truth-value calculations
- **LM Rules**: Rules that interface with language models to enhance reasoning capabilities
- **Rule Application**: The process of matching rules to tasks and generating new inferences
- **Hybrid Reasoning**: The integration of symbolic (NAL) and neural (LM) reasoning approaches

### Parser System

Handles Narsese syntax parsing and generation:

- **Statement Parsing**: Complete parsing of Narsese statements including term, punctuation, and optional truth value
- **Truth Value Extraction**: Recognition and parsing of truth value syntax `%f;c%` where f is frequency and c is
  confidence
- **Punctuation Recognition**: Support for belief (.), goal (!), and question (?) punctuation
- **Term Parsing**: Recursive parsing of complex term structures
- **Atomic Term Handling**: Recognition of simple atomic terms
- **Compound Term Parsing**: Support for all NAL operator types:
    - Inheritance: `(A --> B)`
    - Similarity: `(A <-> B)`
    - Implication: `(A ==> B)`
    - Equivalence: `(A <=> B)`
    - Conjunction: `(&, A, B, ...)`
    - Disjunction: `(|, A, B, ...)`
    - Negation: `(--, A)`
    - Extensional sets: `{A, B, C}`
    - Intensional sets: `[A, B, C]`
    - Operations: `(A ^ B)`
    - Sequential conjunction: `(&/, A, B)`
    - Instance: `(A {{-- B)`
    - Property: `(A --}} B)`
    - Products: `(A, B, C)`
- **Nested Structure Support**: Proper parsing of nested compound terms with appropriate grouping
- **List Parsing**: Handling of comma-separated lists with respect for nested parentheses

**Technical Definitions:**
- **Parser**: The component that converts Narsese text into internal Term and Task representations
- **Narsese**: The formal language used to express knowledge in the NARS system
- **Statement**: A complete Narsese expression including term, punctuation, and optional truth value
- **Punctuation**: Characters that specify task type (. for Belief, ! for Goal, ? for Question)
- **NAL Operators**: Logical operators defined by Non-Axiomatic Logic for knowledge representation

### Language Model Integration (`LM`)

Provides comprehensive language model capabilities:

- **Provider Management**: Registry and selection of multiple LM providers
- **Workflow Engine**: Support for complex LM-based reasoning workflows
- **Metrics Tracking**: Monitoring of LM usage, token counts, and processing times
- **Narsese Translation**: Conversion between Narsese and natural language
- **Resource Management**: Handling of LM resources and capacity

**Technical Definitions:**
- **LM (Language Model Integration)**: The component that interfaces with external language models
- **Provider Management**: The system for registering and selecting different language model services
- **Narsese Translation**: The bidirectional conversion between formal Narsese and natural language
- **Workflow Engine**: The system for managing complex interactions between the reasoning system and language models

---

## Algorithms and Implementation

### Term Normalization Algorithm

The normalization algorithm in `TermFactory` handles commutativity, associativity, and redundancy elimination
efficiently:

1. **Parse Components:** If the term is compound, parse its components.
2. **Recursive Normalization:** Recursively normalize all sub-terms.
3. **Apply Operator Rules:**
    - For commutative operators (`&`, `|`, `+`, `*`): Sort components lexicographically by their string representation.
    - For associative operators (`&`, `|`): Flatten nested structures.
    - For redundancy: Remove duplicate components.
4. **Reconstruct Term:** Build the normalized term from the processed components.
5. **Cache Check:** Check the factory's cache for an existing equivalent term.
6. **Store/Return:** If found in cache, return the cached instance; otherwise, freeze the new term, store it in the
   cache, and return it.

### Memory Management Algorithms

- **Consolidation:** Mechanism for moving tasks between short-term and long-term memory based on priority
- **Priority Decay:** Gradual reduction of task priority over time
- **Index Management:** Efficient indexes for different term types (inheritance, implication, similarity, etc.)

### Truth Value Operations

Implement NAL-specific truth value calculations:

1. **Revision:** Combine two truth values with the same content but different evidence bases.
2. **Deduction:** Apply deduction rules with proper truth value propagation.
3. **Induction/Abduction:** Implement induction and abduction truth value calculations.
4. **Negation:** Properly calculate negated truth values.
5. **Expectation:** Calculate expectation values for decision making.

---

## Testing Strategy

### Unit Tests

- **Granularity:** Each class and significant function has its own dedicated unit test file.
- **Focus:** Unit tests verify the correctness of individual components in isolation.
- **`Term` Class:** Extensive unit tests for `Term`'s immutability, equality, hash code, factory construction (including
  all reduction and commutativity rules), properties, and sub-term access/visitor/reducer methods.
- **`Task` Class:** Unit tests for immutability, property access, and `derive` method.
- **`Bag` and `Memory`:** Tests for correct priority-based storage, retrieval, and updates.
- **`RuleEngine` and Rules:** Tests for individual rule application and correct inference generation.

### Integration Tests

- **Focus:** Verify the correct interaction between multiple components and the overall system behavior.
- **`NAR` Integration:** Tests primarily target the `NAR` class, simulating real-world input sequences and
  asserting expected outputs and changes in the belief base.
- **NAL-LM Hybrid:** Specific integration tests ensure the seamless interplay between NAL and LM rules within the
  `RuleEngine`.

### Fluent Reasoner Test API

A fluent, expressive API is developed to simplify the writing and reading of integration tests for the `NAR`
system.

**Example Usage:**

```javascript
import { createReasoner } from '../support/fluentReasonerAPI';

describe('NAR System Deductions', () => {
  let nar;

  beforeEach(() => {
    nar = createReasoner();
  });

  test('should deduce a simple conclusion from two premises', async () => {
    nar.input('<A --> B>.');
    nar.input('<B --> C>.');

    await nar.cycles(5); // Run for a few cycles to allow inference

    nar.expectBelief('<A --> C>.').toHaveTruth({ frequency: 1.0, confidence: 0.9 });
  });

  test('should answer a question based on existing beliefs', async () => {
    nar.input('<dog --> animal>.');
    nar.input('<cat --> animal>.');

    await nar.cycles(10);

    const answer = await nar.query('<dog --> ?x>.');
    expect(answer).toBeInferred('<dog --> animal>.');
  });

  test('should handle contradictory evidence', async () => {
    nar.input('<sky --> blue>{1.0, 0.9}.');
    nar.input('<sky --> blue>{0.0, 0.9}.'); // Contradictory evidence

    await nar.cycles(5);

    nar.expectBelief('<sky --> blue>.').toHaveTruth({ frequency: 0.5, confidence: expect.any(Number) });
  });
});
```

This API abstracts away the complexities of direct memory inspection and cycle management, allowing tests to focus
on the logical behavior of the reasoner.

---

## Supporting Components

### `Truth` Value Representation

The `Truth` class encapsulates the frequency and confidence values associated with beliefs and tasks.

**Key Features:**

- **Immutability:** `Truth` instances are immutable.
- **Properties:**
    - `frequency`: A number between 0 and 1, representing the proportion of positive evidence.
    - `confidence`: A number between 0 and 1, representing the reliability of the frequency.
- **Operations:**
    - `combine(otherTruth)`: Static method to combine two truth values according to NAL truth functions.
    - `negate()`: Returns a new `Truth` instance representing the negation of the current truth value.
    - `equals(otherTruth)`: Deep equality comparison.

### `Stamp` and Evidence Handling

The `Stamp` class tracks the origin and derivation history of `Task`s and `Belief`s.

**Key Features:**

- **Immutability:** `Stamp` instances are immutable.
- **Properties:**
    - `id`: A unique identifier for the stamp (e.g., a UUID or a hash of its components).
    - `occurrenceTime`: Timestamp of when the task was created or observed.
    - `source`: An identifier for the source of the task (e.g., `INPUT`, `INFERENCE`, `LM_GENERATED`).
    - `derivations`: An immutable array of `Stamp` IDs from which this task was derived, forming a directed acyclic
      graph (DAG) of evidence.
    - `evidentialBase`: A set of `Term` IDs that form the direct evidential base for this task.
- **Operations:**
    - `derive(parentStamps: Stamp[], newSource: string)`: Static method to create a new `Stamp` based on parent stamps
      and a new source. This correctly merges derivation histories.

### Configuration Management (`SystemConfig`)

A centralized and immutable configuration system for the `NAR` instance.

**Key Features:**

- **Immutability:** Configuration objects are immutable once created.
- **Properties:**
    - `nalRuleSets`: Array of NAL rule identifiers to load.
    - `lmRuleSets`: Array of LM rule identifiers to load.
    - `memoryCapacity`: Maximum number of concepts/tasks in memory.
    - `cycleSpeed`: Delay between reasoning cycles.
    - `truthFunctions`: Custom truth combination functions (if overriding defaults).
    - `debugMode`: Boolean for enabling verbose logging.
- **Validation:** Ensures that provided configuration values are valid.
- **Default Values:** Provides sensible default values for all configuration parameters.

### Event System (`EventBus`)

A lightweight, internal event bus for decoupled communication between components.

**Key Features:**

- **Centralized Dispatch:** A single `EventBus` instance (or a module with event methods) accessible throughout the
  system.
- **`emit(eventName: string, data: any)`:** Dispatches an event with associated data.
- **`on(eventName: string, listener: Function)`:** Registers a listener for a specific event.
- **`off(eventName: string, listener: Function)`:** Removes a registered listener.
- **Event Types:** Standardized event names (e.g., `NAR.Output`, `Memory.BeliefUpdated`, `Task.Created`).

### Utilities (`util/`)

A collection of general-purpose utility functions and helper classes.

- **`collections.js`:** Implementations of common data structures like `Bag`, `PriorityQueue`, `ImmutableMap`,
  `ImmutableSet`.
- **`constants.js`:** System-wide constants (e.g., Narsese operators, default truth values).
- **`validation.js`:** Helper functions for input validation and assertion.
- **`logger.js`:** A simple, configurable logging utility.

---

## API Conventions and Code Quality

### API Design Conventions

- **Clear Naming:** Use descriptive and unambiguous names for classes, methods, and variables.
- **Functional Purity:** Favor pure functions where possible, especially for `Term` operations.
- **Asynchronous Operations:** Use `async/await` for operations that involve I/O or significant computation.
- **Configuration Objects:** Pass configuration via single, well-defined objects rather than multiple positional
  arguments.
- **Event-Driven Output:** Use an event emitter pattern for system outputs and notifications.

### Code Quality and Maintainability

- **Type Safety:** Implement robust type checking through comprehensive JSDoc annotations with type information and
  runtime type checking for critical operations.
- **Code Organization:** Clear separation of concerns between modules, consistent naming conventions, well-defined
  module interfaces, and proper encapsulation of internal state.

---

## Error Handling and Robustness

### Input Validation

1. **Narsese Parsing:** Comprehensive validation of Narsese syntax before term construction.
2. **Truth Value Validation:** Ensure truth values are within valid ranges [0,1].
3. **Task Validation:** Validate task structure and components before processing.

### Graceful Degradation

1. **Rule Application Errors:** Continue processing if a rule encounters an error, logging the issue and proceeding.
2. **Memory Errors:** Implement fallback mechanisms for memory allocation failures.
3. **Parser Errors:** Provide detailed error messages for malformed input while continuing system operation.

---

## Configuration and Extensibility

### Plugin Architecture

1. **Rule Plugins:** Support dynamic loading of custom NAL and LM rules.
2. **Adapter Plugins:** Allow custom IO adapters and LM adapters.
3. **Event Hooks:** Provide hooks for custom processing during reasoning cycles.

### Parameter Tuning

The `SystemConfig` exposes parameters for fine-tuning system behavior:

- Memory capacity and forgetting thresholds
- Truth value thresholds for task acceptance
- Rule application priority and frequency
- Cycle timing and processing limits
- Activation propagation parameters

---

## Vision: SeNARS Compound Intelligence Architecture

The specification defines a reasoning system where intelligence properties emerge through the structural properties of its fundamental data representations (Terms, Tasks, Truth, and Stamps). This creates a self-improving architecture where each addition to the system enhances the overall intelligence capabilities while maintaining robustness, security, and performance.

### Core Compound Intelligence Architecture

#### Structural Intelligence Foundation
- **Term Analysis**: Terms enable automatic analysis and optimization through immutability, canonical normalization, visitor/reducer patterns, and hash consistency
- **Task Optimization**: Tasks carry information for resource and process optimization using punctuation awareness, Truth-Stamp-Budget properties, and immutable processing
- **Truth Validation**: Truth values enable quality assessment and improvement through revision, expectation, and confidence mechanisms
- **Stamp Evidence Tracking**: Stamps contain derivation information for validation and learning through complete evidence tracking

#### Self-Leveraging Intelligence Properties
- **Self-Generating Reasoning**: Reasoning improvements emerge from structural properties
- **Pattern Recognition Enhancement**: Each discovered pattern may improve recognition of future patterns
- **Resource Optimization**: Resources become more effective through organized usage
- **Validation Improvement**: Truth assessment becomes more accurate with additional evidence
- **Self-Organization**: Knowledge organizes based on usage patterns and relationships
- **Adaptive Processing**: Task processing adapts based on outcome feedback

### Coherent Technical Specifications

#### Parser System Specifications
- **Narsese Syntax Support**: Complete support for NAL operator types including inheritance `(A --> B)`, similarity `(A <-> B)`, implication `(A ==> B)`, equivalence `(A <=> B)`, conjunction `(&, A, B, ...)`, disjunction `(|, A, B, ...)`, negation `(--, A)`, sets `{A, B, C}`, `[A, B, C]`, sequential conjunction `(&/, A, B)`, instance `(--{ A)`, property `(-->} B)`, operations `(A ^ B)`, and products `(A, B, C)`
- **Recursive Parsing**: Support for nested compound terms with appropriate grouping and precedence
- **Truth Value Recognition**: Parsing of truth value syntax `%f;c%` where f is frequency and c is confidence
- **Punctuation Support**: Full recognition of belief (.), goal (!), and question (?) punctuation
- **Error Recovery**: Comprehensive validation and recovery from malformed Narsese input

#### Rule Engine Framework
- **NAL Rule Integration**: Complete implementation of NAL truth functions and inference rules (deduction, induction, abduction, analogy, comparison, resemblance)
- **LM Rule Integration**: Framework for language model collaboration with prompt generation and response processing
- **Dynamic Rule Management**: Runtime rule enable/disable, priority adjustment, and performance tracking
- **Truth Value Operations**: Complete implementation of revision, deduction, induction, abduction, negation, and expectation functions
- **Inference Confidence**: Proper confidence propagation through inference chains with compound confidence calculations

#### Memory and Attention Management
- **Concept-Based Organization**: Associative storage organized around Terms in Concepts with related Task clustering
- **Dual Memory Architecture**: Short-term focus sets for immediate processing and long-term storage for persistent knowledge
- **Attention-Based Consolidation**: Automatic prioritization and forgetting based on usage patterns and importance metrics
- **Index-Based Retrieval**: Efficient access patterns for different knowledge types (inheritance, implication, similarity, etc.)
- **Adaptive Management**: Dynamic adjustment to resource constraints with compound optimization of memory utilization

#### Configuration Management System
- **System-Wide Configuration**: Centralized configuration for NAL/LM rule sets, memory parameters, cycle timing, and truth function overrides
- **Component Configuration**: Per-component configuration with validation and default value management
- **Runtime Reconfiguration**: Dynamic configuration adjustment without system restart
- **Environment-Specific Settings**: Different configurations for development, testing, and production environments
- **Validation Framework**: Comprehensive validation of all configuration parameters with error reporting

#### Performance and Scalability Requirements
- **Core Operation Performance**: <1ms for Term normalization, <2ms for Task processing, <5ms for Memory retrieval
- **Throughput Requirements**: 10,000+ operations per second under normal load
- **Memory Efficiency**: Sublinear growth in memory usage with knowledge base size through caching mechanisms
- **Scalability**: Horizontal scaling support for distributed reasoning across multiple nodes
- **Performance Characteristics**: Performance improvements with each enhancement iteration

#### Security Implementation Details
- **Input Sanitization**: Comprehensive validation of all Narsese input to prevent injection attacks
- **Resource Limits**: Protection against resource exhaustion through processing limits and timeouts
- **Access Controls**: Role-based access controls for system components and data
- **Secure Defaults**: Secure-by-default configuration with optional enhanced security settings
- **Audit Logging**: Complete logging of security-relevant events and system operations

#### Error Handling Strategies
- **Graceful Degradation**: System continues operation when individual components fail
- **Circuit Breakers**: Protection against cascading failures with automatic recovery
- **Comprehensive Logging**: Detailed logging for debugging and system analysis
- **Error Recovery**: Automatic recovery from common failure modes
- **User-Friendly Errors**: Clear error messages that help users understand and resolve issues

#### API Specifications
- **Consistent Interface Patterns**: Standardized APIs following common design principles
- **Backward Compatibility**: Maintaining API compatibility across versions
- **Comprehensive Documentation**: Complete API documentation with examples
- **Event-Driven Communication**: Standard event patterns for component communication
- **WebSocket Integration**: Real-time event streaming for UI and external system integration

### Operational Excellence Requirements

#### Robustness and Reliability Requirements
- **High system reliability** with graceful degradation and error recovery
- **Fault isolation** preventing cascading failures through circuit breakers and recovery mechanisms
- **Stability under load** supporting 10,000+ operations per second with consistent performance
- **Comprehensive error handling** with recovery mechanisms
- **System Health Monitoring**: Continuous monitoring of all system components with alerting
- **Recovery Procedures**: Defined procedures for system recovery from various failure modes
- **Resilience Testing**: Testing of system resilience under various failure conditions

#### Security and Compliance Requirements
- **Minimization of critical vulnerabilities** in production systems through security-first design
- **Secure configuration management** with validated defaults and environment protection
- **Input sanitization** protecting against injection attacks and malicious inputs
- **Access control** for all system components and data flows
- **Data Protection**: Encryption of sensitive data both in transit and at rest
- **Compliance Standards**: Adherence to industry security standards and best practices
- **Security Auditing**: Security audits and vulnerability assessments

#### Performance and Scalability
- **Sub-millisecond response times** for core operations (Term normalization, Task processing)
- **Scalable architecture** supporting large knowledge bases with intelligent caching
- **Memory optimization** through intelligent consolidation and attention mechanisms
- **Resource efficiency** that improves with compound intelligence growth
- **Load Distribution**: Intelligent distribution of processing load across system resources
- **Caching Strategies**: Multi-tiered caching for optimal performance with compound intelligence
- **Performance Monitoring**: Continuous performance monitoring with automated optimization triggers

#### Quality Assurance Requirements
- **>95% test coverage** with property-based, unit, integration, and performance testing
- **Performance benchmarks** with defined targets and monitoring
- **Regression testing** preventing quality degradation during system growth
- **Validation frameworks** ensuring correctness of reasoning and improvements
- **Continuous Integration**: Automated testing pipeline with quality gates
- **Code Quality Standards**: Consistent code quality with automated linting and review
- **Test Automation**: Automated testing suites for all functionality

### Hybrid Intelligence Integration

#### NARS-LM Collaboration
- **Seamless integration** between formal symbolic reasoning and language model capabilities
- **Intelligent routing** selecting optimal processing paths based on task characteristics and system state
- **Cross-validation** ensuring consistency and quality between reasoning modalities
- **Synergistic enhancement** where each system improves the other through compound feedback
- **Provider Management**: Registry and selection of multiple LM providers (OpenAI, Ollama, Claude, etc.)
- **Prompt Optimization**: Intelligent prompt generation optimized for each reasoning task
- **Response Processing**: Advanced processing of LM responses with quality assessment and integration
- **Resource Management**: Intelligent allocation of LM resources based on task priority and complexity

#### Metacognitive Self-Analysis
- **Self-monitoring** of reasoning performance and compound intelligence growth
- **Pattern recognition** identifying improvement opportunities and optimization paths
- **Automatic optimization** based on performance data and outcome feedback
- **Predictive adaptation** anticipating system needs and resource requirements
- **Reasoning State Analysis**: Comprehensive analysis of system reasoning state with insights generation
- **Performance Metrics**: Detailed metrics collection across all system components
- **Self-Correction**: Automatic correction of suboptimal behaviors and strategies
- **Insight Generation**: Automatic generation and visualization of system intelligence insights

### Key Characteristics of the Ideal Result

#### 1. **Compound Intelligence Hybrid System**
- **Real-time NARS reasoning** engine with compound intelligence that grows through use
- **Integrated Language Models** (OpenAI, Ollama, etc.) with intelligent collaboration and validation
- **Bidirectional communication** where LM insights inform NARS reasoning and vice versa
- **Observable reasoning process** with complete traceability and compound improvement visibility

#### 2. **Self-Improving Visualization Interface**
- **Compound reasoning traces** showing how intelligence emerges and grows through structural properties
- **Task flow visualization** illustrating compound optimization and adaptive processing
- **Concept evolution mapping** displaying how knowledge organization improves with use
- **Intelligence growth dashboard** showing compound improvement metrics and performance

#### 3. **Educational Compound Intelligence Capabilities**
- **Compound learning demonstrations** showing intelligence emergence from data structures
- **Interactive exploration mode** allowing users to understand compound improvement processes
- **Pattern analysis tools** for discovering compound intelligence patterns and optimization opportunities
- **Compound insight generation** with automatic discovery and visualization of improvements

#### 4. **Production-Ready Configuration & Control**
- **Secure LM provider management** with validated and safe integration
- **Compound optimization parameters** that self-tune based on usage patterns and outcomes  
- **Reliability indicators** showing system health and compound intelligence stability
- **Production controls** for managing reasoning sessions with robust safety

### User Experience Goals

#### For Researchers:
> *"I can observe exactly how compound NARS-LM reasoning works, identify compound intelligence patterns, and understand how the system improves itself through structural properties."*

#### For Developers:
> *"I can quickly test different configurations, debug compound intelligence issues, and extend the system with new compound capabilities using the self-improving architecture."*

#### For Educators:
> *"I can demonstrate compound AI reasoning concepts showing how intelligence emerges from structural properties in an engaging, understandable way."*

#### For Learners:
> *"I can explore how compound artificial intelligence thinks, reasons, and improves itself, gaining insights into both logical inference and compound learning."*

### Technical Excellence Standards

#### Compound Intelligence Foundation:
- **Self-improving data structures** where Terms, Tasks, Truth, and Stamps compound intelligence
- **Robust compound error handling** with self-recovery from compound intelligence failures
- **Compound data flow** from inputs through processing to compound outputs and improvements
- **Self-optimizing codebase** that improves with use and compound insight discovery
- **Immutable Architecture**: Strict immutability principles applied throughout the system
- **Canonical Representations**: Consistent canonical forms for all knowledge representations
- **Hash-Optimized Structures**: Efficient hashing and caching mechanisms throughout
- **Visitor-Reducer Patterns**: Consistent application of structural analysis patterns

#### Compound Capabilities:
- **Compound reasoning examples** with intelligence that grows through structural properties
- **Compound LM integration** with compound enhancement of logical reasoning
- **Compound intelligence demonstration** where combination compounds beyond individual parts
- **Compound performance metrics** with continuously improving efficiency and quality
- **Real-time Reasoning Engine**: High-performance engine processing inputs and generating conclusions
- **Intelligent Visualization**: Step-by-step reasoning traces and interactive exploration tools
- **Capture and Analysis Tools**: Comprehensive tools for educational content and research
- **Configurable Interface**: Simple LM provider management and adjustable reasoning parameters

### System Behavior and Properties

#### 1. **Intelligence Emergence**
The system demonstrates how intelligence emerges from data structure properties, with each Term operation potentially improving all future Term operations through structural intelligence principles.

#### 2. **Pattern Recognition Properties**  
The system exhibits pattern recognition properties where each new pattern may improve recognition of all patterns, creating enhanced pattern detection and optimization.

#### 3. **Self-Improvement Architecture**
The system demonstrates continuous self-improvement through architectural properties that enhance intelligence with use.

#### 4. **Problem Solving Capabilities**
The system addresses complex problems by leveraging its architectural properties for enhanced reasoning.

### System Foundation

The specification serves as both:
1. **A prototype** demonstrating structural intelligence emergence and self-improvement properties
2. **A production-ready foundation** that scales intelligence safely and securely
3. **A learning platform** generating insights about intelligence emergence and optimization
4. **A demonstration tool** showing intelligence potential with finite resources

### System Characteristics

The specified SeNARS system demonstrates principles of autocatalytic artificial intelligence - showing how intelligence can emerge from structural properties and improve with use. This system demonstrates that intelligent systems can be both powerful and transparent, showing how intelligence emerges from structure and improves through use.

---

## Long-Term Specification: A Self-Evolving Intelligence Ecosystem

The long-term specification for SeNARS defines a self-evolving intelligence ecosystem that adapts through experience, user interaction, external knowledge integration, and collaborative development. The system achieves enhanced intelligence growth with finite resources through recursive structural self-improvement and pattern recognition, all while maintaining production-ready quality, security, and reliability.

### System Success Metrics:
- **Intelligence Growth**: The system's reasoning capabilities improve through structural properties and experience.
- **User Empowerment**: Users become more capable of understanding and leveraging AI reasoning through system tools.
- **Community Intelligence**: Collective insights and collaborative improvements enhance system capabilities.
- **Real-World Impact**: The system demonstrates value in solving complex real-world problems through hybrid reasoning.
- **System Autonomy**: The system becomes capable of self-improvement and self-optimization.

### Development and Operational Specifications:
- **Continuous Integration Pipeline**: Automated testing and deployment with quality gates
- **Performance Monitoring**: Real-time performance metrics with automated alerting and optimization
- **Security Compliance**: Regular security assessments and compliance with industry standards
- **Scalability Planning**: Horizontal and vertical scaling capabilities for growing intelligence
- **Documentation Standards**: Comprehensive documentation for all components and interfaces

### Future Development Trajectory:
- **External Knowledge Integration**: Pluggable frameworks for connecting to knowledge bases and APIs
- **Advanced Visualization**: Interactive, collaborative analysis and exploration tools
- **Distributed Reasoning**: Multi-node distributed intelligence capabilities
- **Adaptive Interfaces**: Universal access across all devices and platforms
- **Community Extensions**: Plugin architecture for community-contributed capabilities

---

## General-Purpose Reinforcement Learning Foundation

The SeNARS architecture naturally supports general-purpose reinforcement learning through its foundational Belief-Goal distinction:

- **World Model Learning**: Belief tasks with frequency-confidence truth semantics form predictive models of environment dynamics
- **Reward Structure Definition**: Goal tasks with desire-confidence truth semantics define reward functions for policy learning
- **Exploration-Exploitation Balance**: Truth value revision mechanisms naturally implement the fundamental RL tradeoff
- **Policy Learning**: Task processing adapts action selection based on predicted outcomes and desired goals
- **Continuous Adaptation**: The system learns through experience by updating beliefs from environmental feedback while pursuing goals
- **Transfer Learning**: Knowledge gained in one domain transfers to related domains through structural similarity

This enables SeNARS to function as a general-purpose reinforcement learning system where:
- **Beliefs** form the world model that predicts outcomes of actions
- **Goals** define the reward structure that guides policy learning
- **Interaction** enables the system to learn by attempting to achieve goals and updating beliefs based on outcomes
- **Adaptation** allows continuous learning from experience through truth value revision mechanisms

The separation of these concept types with distinct truth semantics enables SeNARS to naturally implement the exploration-exploitation balance fundamental to reinforcement learning, where beliefs guide exploitation of known knowledge while goals drive exploration toward desired outcomes.

---

## Core Technical Challenges

### Core Technical Challenges

**Term Normalization and Equality:**
- The Term implementation requires refinement to achieve full immutability - some computed properties need proper freezing
- The equality method `equals()` needs implementation of canonical normalization for commutative and associative operators
- Without proper normalization, logically equivalent terms (e.g., `(&, A, B)` vs `(&, B, A)`) may be treated as different objects

**Performance Optimization:**
- Performance targets (<1ms operations) require optimization in the full NARS reasoning cycle
- Extensive validation and metrics collection may impact runtime performance
- Complex reasoning chains with multiple rule applications may require algorithmic improvements

**Memory Management:**
- The dual memory architecture (focus/long-term) consolidation mechanisms can be optimized for better scalability
- Memory pressure handling and forgetting policies need refinement to better preserve important knowledge
- The memory index system may benefit from optimization as the knowledge base grows

### System Architecture Considerations

**Component Decoupling:**
- The NAR component exhibits coupling with sub-components (Memory, TaskManager, RuleEngine, etc.)
- Further decoupling can improve maintainability
- Testing individual components in isolation can be enhanced through better interface design

**Scalability:**
- The current memory implementation can scale to higher throughput with optimization
- The event-driven architecture can be optimized to reduce bottlenecks under high load
- Serialization/deserialization performance can be improved for large knowledge bases

**Configuration Management:**
- The SystemConfig has grown in complexity with many parameters requiring careful management of interdependencies
- Some configuration values may exhibit unexpected interactions when modified
- Default values can be refined based on usage patterns and performance data

### Quality Assurance Requirements

**Testing Coverage:**
- Comprehensive coverage of complex reasoning chains can be expanded
- Integration testing of NARS-LM hybrid reasoning can be enhanced to catch more edge cases
- Property-based testing for Term normalization can be extended to exercise more operator combinations

**Error Handling Robustness:**
- Circuit breaker implementation requires additional defensive programming to prevent cascading errors
- Fallback mechanisms need refinement to produce more predictable behaviors
- Graceful degradation mechanisms can be strengthened through additional validation

### Resource and Maintenance Considerations

**Resource Efficiency:**
- Memory and computational requirements for complex reasoning tasks can be optimized through algorithmic improvements
- The dual memory architecture parameter tuning can be automated for better resource utilization
- Sophisticated resource management features can be developed incrementally

**Maintainability:**
- Component interactions can be simplified through better architectural patterns
- Self-modifying behaviors can be made more predictable through better design
- Complex reasoning pattern documentation can be enhanced with automated tools

These technical challenges and design considerations guide development priorities and ensure the system evolves toward its ambitious vision while maintaining practical implementation focus.