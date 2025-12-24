# SeNARS Core Components and Data Structures

This document provides detailed technical specifications for SeNARS core components and data structures. For architectural patterns and high-level design, see [README.architecture.md](README.architecture.md). For API usage, see [README.api.md](README.api.md).

## Technical Definitions

Throughout this document, these terms have specific meanings:

- **Term**: The fundamental unit of knowledge representation (atomic or compound)
- **Task**: A unit of work containing knowledge and processing instructions
- **Truth Value**: A `{frequency, confidence}` pair measuring certainty
- **Stamp**: Records the task's origin and derivation history
- **Memory**: The system component storing all knowledge representations
- **Concept**: A collection of tasks related to the same term
- **Focus Sets**: High-priority, short-term memory for immediate attention
- **Consolidation**: Moving tasks between memory systems based on priority

## System Architecture: Core Components Overview

The system consists of several interconnected components:

- **NAR (NARS Reasoner Engine)**: The main entry point and orchestrator that manages the reasoning cycle and coordinates all system components
- **PremiseSource**: Generates a continuous stream of `Task`s, drawing from `Memory` based on tunable sampling objectives (e.g., `TaskBagPremiseSource`)
- **Strategy**: Creates premise pairs by finding suitable secondary premises for reasoning approaches (BagStrategy, PrologStrategy, ExhaustiveStrategy, etc.)
- **RuleExecutor**: Indexes all registered rules for fast retrieval and performs symbolic guard analysis to optimize rule execution
- **RuleProcessor**: Consumes premise pairs and executes rules in a non-blocking fashion, handling both synchronous NAL and asynchronous LM rules
- **Reasoner**: Manages the continuous reasoning pipeline with `start()`, `stop()`, `step()` methods and implements resource constraints
- **Memory**: Manages concepts, tasks, and knowledge representation; implements both long-term and short-term (focus) memory systems
- **Focus Manager**: Handles attention focus sets (short-term memory) that prioritize tasks for immediate processing based on attention mechanisms
- **Term**: Core immutable data structure for representing knowledge elements with structural properties that support reasoning
- **Task**: Represents units of work or information processed by the system; encapsulates a Term with associated truth values, stamps, and processing priorities
- **Parser**: Handles Narsese syntax parsing and generation; converts between human-readable Narsese notation and internal Term representations
- **LM (Language Model Integration)**: Provides language model capabilities that complement formal symbolic reasoning with neural pattern recognition

### PremiseSource

The `PremiseSource` generates a continuous stream of `Task`s, drawing from `Memory` based on tunable sampling objectives.

**Built-in Implementations:**
- `TaskBagPremiseSource`: Samples from a priority bag with configurable strategies
- `PremiseSources`: A bag of multiple `PremiseSource`s that samples proportionally

**Sampling Objectives:**
- `priority`: Sample tasks based on their priority value (default: true)
- `recency`: Favor tasks that are closest to a target time (default: false)
- `punctuation`: Focus on Goals (`!`) or Questions (`?`) (default: false)
- `novelty`: Favor tasks with fewer reasoning steps (lower derivation depth) (default: false)
- `dynamic`: Enable performance-based strategy adaptation (default: false)

### Strategy

The `Strategy` component receives the stream of primary premises and creates premise pairs by finding suitable secondary premises.

**Implementations:**
- **BagStrategy**: NARS-style priority-sampled bag approach for anytime reasoning
- **ExhaustiveStrategy**: Comprehensive search for all related beliefs for a given task
- **PrologStrategy**: Goal-driven backward chaining with Prolog-style unification and resolution
- **ResolutionStrategy**: NAL-6 query matching with variable unification for question answering
- **GoalDrivenStrategy**: NAL-8 goal achievement through backward chaining and plan synthesis
- **AnalogicalStrategy**: NAL-6 cross-domain knowledge transfer via structure mapping

**Premise Formation Strategies:**
The system uses a composable architecture:
- `TaskMatchStrategy`: Syllogistic patterns (shared subject/predicate/middle)
- `DecompositionStrategy`: Extract subterms from compound statements
- `TermLinkStrategy`: Associative links via TermLayer

### Rule Execution

**NAL Inference Rules Table:**

| Rule | Pattern | Truth Function |
|------|---------|----------------|
| `SyllogisticRule` | (A→M), (M→B) ⇒ (A→B) | `Truth.deduction` |
| `ModusPonensRule` | (A⇒B), A ⇒ B | detachment |
| `InductionRule` | (M→P), (M→S) ⇒ (S→P) | `Truth.induction` |
| `AbductionRule` | (P→M), (S→M) ⇒ (S→P) | `Truth.abduction` |
| `ConversionRule` | (P→S) ⇒ (S→P) | `Truth.conversion` |
| `ContrapositionRule` | (S⇒P) ⇒ (¬P⇒¬S) | `Truth.structuralReduction` |

**RuleExecutor:** Indexes rules for fast retrieval and performs symbolic guard analysis:
- Deduplication and ordering of common checks
- Subsumption detection
- Constant folding

**RuleProcessor:** Consumes premise pairs and executes rules in a non-blocking fashion, merging sync NAL and async LM results.

**Custom Strategy Extension:**

Custom strategies can be added by extending `PremiseFormationStrategy` and implementing the async generator:

```javascript
class MyCustomStrategy extends PremiseFormationStrategy {
    async* generateCandidates(primaryPremise, memory) {
        // Yield candidate secondary premises
        for (const concept of memory.getRelatedConcepts(primaryPremise.term)) {
            yield { secondary: concept.getBestBelief(), priority: 0.7 };
        }
    }
}
```

## Core Data Structures

### `Term` Class

The `Term` class represents knowledge in the system and is designed to be immutable for reliability and performance.

**Key Features:**

- **Immutability:** Once created, a `Term` cannot be changed. This ensures data consistency and enables efficient caching.
- **Equality and Hashing:**
    - `equals(otherTerm)`: Compares two terms for equality, considering their structure and content.
    - `hashCode()`: Provides a unique hash code for use in collections like Maps and Sets.
- **Factory Construction (`TermFactory`):**
    - All `Term` instances are created via `TermFactory.create(termExpression)`.
    - The factory parses Narsese expressions (like `(A --> B)`) into structured objects.
    - **Normalization:** Automatically normalizes equivalent terms (e.g., `(&, A, B)` and `(&, B, A)` become the same).
    - **Caching:** Reuses identical terms to save memory and speed up comparisons.
- **Properties:**
    - `id`: Unique identifier for the term.
    - `operator`: The logical operator (e.g., `&` for conjunction, `-->` for inheritance).
    - `arity`: Number of sub-components the term has.
    - `complexity`: A measure of how complex the term structure is.
    - `isAtomic`, `isCompound`, etc.: Boolean properties describing the term type.
- **Sub-term Access:**
    - `getComponent(index)`: Access a specific sub-part of the term.
    - `getComponents()`: Get all direct sub-parts.
    - `getAllSubTerms()`: Get all nested parts recursively.
- **Structural Analysis:**
    - `visit(visitorFunction)`: Traverse the term structure applying functions to each part.
    - `reduce(reducerFunction, initialValue)`: Aggregate information across the term structure.

### `Task` Class

The `Task` class represents a unit of work in the system, containing information to be processed along with metadata.

**Key Features:**

- **Immutability:** `Task` instances cannot be changed after creation.
- **Properties:**
    - `term`: The knowledge content of the task (a Term object).
    - `truth`: The certainty of the information (e.g., `{ frequency: 0.9, confidence: 0.8 }`).
    - `stamp`: Metadata tracking where the task came from and how it was derived.
    - `priority`: How important the task is (higher priority tasks get processed first).
    - `type`: The kind of task (BELIEF, GOAL, QUESTION, etc.).
    - `budget`: Resources allocated for processing this task.
- **Methods:**
    - `derive(newTruth, newStamp)`: Creates an updated version of the task with new truth values or metadata.

### `Truth` Value Representation

The `Truth` class represents the certainty of information with two values: frequency and confidence.

**Key Features:**

- **Immutability:** `Truth` values cannot be changed after creation.
- **Properties:**
    - `frequency`: A number 0-1 indicating how often something is observed as true.
    - `confidence`: A number 0-1 indicating how reliable the frequency value is.
- **Operations:**
    - `combine(otherTruth)`: Merges two truth values using logical rules.
    - `negate()`: Returns the opposite truth value.
    - `equals(otherTruth)`: Compares two truth values for equality.

### `Stamp` and Evidence Tracking

The `Stamp` class tracks where information came from and how it was derived.

**Key Features:**

- **Immutability:** `Stamp` information is fixed once created.
- **Properties:**
    - `id`: Unique identifier for this stamp.
    - `occurrenceTime`: When this information was created.
    - `source`: Where it came from (user input, system inference, language model, etc.).
    - `derivations`: List of previous stamps this information was derived from.
    - `evidentialBase`: Original evidence that supports this information.
- **Operations:**
    - `derive(parentStamps, newSource)`: Creates a new stamp based on existing ones and a new source.

### Belief vs. Goal: Key Concepts

The system distinguishes between beliefs (what the system knows) and goals (what the system wants to achieve):

**Belief Tasks (.)** represent what the system knows about the world:
- **Purpose**: Store knowledge about the environment
- **Truth Values**: Frequency (how often something is true) and confidence (how reliable the knowledge is)
- **Example**: `(bird --> animal){0.9, 0.8}.` (The system believes birds are animals 90% of the time with 80% confidence)

**Goal Tasks (!)** represent what the system aims to achieve:
- **Purpose**: Define objectives or desired outcomes
- **Truth Values**: Frequency (desired frequency) and confidence (how likely it is to be achievable)
- **Example**: `(task_completed --> desirable)!{0.8, 0.9}.` (The system wants the task to be 80% completed with 90% confidence)

This design enables reinforcement learning where:
- **Beliefs** model the world and predict action outcomes
- **Goals** drive learning by defining desired behaviors
- The system learns by pursuing goals and updating beliefs based on results

## Detailed Component Implementations

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
See the Technical Definitions section at the top of this document for term explanations.

### Layer System

The Layer system manages connections between concepts and enables semantic reasoning:

- **Layer Interface**: Foundation for creating different types of connections between knowledge elements
- **TermLayer**: Manages connections between terms with priority-based storage and automatic cleanup of low-priority links
- **EmbeddingLayer**: Uses vector embeddings to find semantic similarities between terms and concepts

**Key Features:**
- **Associative Links**: Create and manage connections between concepts and terms
- **Priority Management**: Automatically manages storage by keeping important links and removing less important ones
- **Semantic Reasoning**: Find similarities between terms based on meaning, not just structure
- **Extensible**: Easy to add new types of layers for different reasoning needs

### Focus Management

Handles short-term memory and attention in the system:

- **Short-term Memory**: Maintains a limited set of high-priority tasks for immediate processing
- **Priority Selection**: Chooses which tasks to process based on their importance and urgency
- **Task Promotion**: Moves important tasks from short-term to long-term memory when appropriate

The system uses smart selection to:
- **Balance priorities**: Consider both task importance and how long it's been waiting
- **Diversify reasoning**: Ensure different types of tasks get processed to prevent tunnel vision

### Task Processing and Reasoning Cycle

The system processes tasks in repeating cycles:
1. **Select Tasks:** Choose high-priority tasks from short-term memory
2. **Apply Rules:** Use logical and language model rules to process the tasks
3. **Generate New Knowledge:** Create new inferences, conclusions, and questions
4. **Update Memory:** Store new and updated information
5. **Output Results:** Share important findings through system events

This cycle repeats continuously, allowing the system to reason and learn over time.

### Rule Engine

The Rule Engine applies logical rules to generate new knowledge:

- **Rule Types:** Handles both logical inference rules and language model integration rules
- **Rule Management:** Organize, enable/disable, and track rules efficiently
- **Performance Tracking:** Monitor which rules are most effective

**Rule Categories:**
- **NAL Rules:** Apply formal logic to derive new conclusions from existing knowledge
- **LM Rules:** Use language models to enhance reasoning with neural pattern recognition

### Parser System

Converts between human-readable Narsese language and internal system representations:

- **Narsese Processing**: Parse input like `(bird --> animal){0.9, 0.8}.` into internal structures
- **Truth Value Parsing**: Extract frequency and confidence values from `{f,c}` format
- **Punctuation Support**: Handle different task types using punctuation (. for beliefs, ! for goals, ? for questions)
- **Complex Terms**: Parse nested structures with various logical operators like `(&, A, B)` for conjunction

### Language Model Integration (`LM`)

Connects the system to external language models for enhanced reasoning:

- **Provider Management**: Supports multiple providers (OpenAI, Ollama, Anthropic) with automatic failover
- **Smart Selection**: Chooses the best model for each task based on requirements
- **Circuit Breakers**: Prevents system failures if language model services become unavailable
- **Narsese Translation**: Converts between natural language and the system's formal language
- **Fallbacks**: Continues operating with pure logical reasoning if language models fail

### Server Components

Network services for remote access and monitoring:

- **WebSocket Monitoring**: Real-time system monitoring through web connections at `agent/src/server/WebSocketMonitor.js`
- **Event Streaming**: Continuous updates of system events to connected clients
- **JSON Protocol**: Structured event format for easy client integration

### Integration Components

Connectivity with external systems:

- **Knowledge Base Connector**: Links to external knowledge sources at `agent/src/integration/KnowledgeBaseConnector.js`
- **API Integration**: Standardized interfaces for external service connections
- **MCP Server**: Model Context Protocol server for AI assistant integration at `agent/src/mcp/`


## Algorithms and Implementation

### Term Normalization Algorithm

The normalization algorithm in `TermFactory` handles commutativity, associativity, and redundancy elimination efficiently:

1. **Parse Components:** If the term is compound, parse its components.
2. **Recursive Normalization:** Recursively normalize all sub-terms.
3. **Apply Operator Rules:**
    - For commutative operators (`&`, `|`, `+`, `*`): Sort components lexicographically by their string representation.
    - For associative operators (`&`, `|`): Flatten nested structures.
    - For redundancy: Remove duplicate components.
4. **Reconstruct Term:** Build the normalized term from the processed components.
5. **Cache Check:** Check the factory's cache for an existing equivalent term.
6. **Store/Return:** If found in cache, return the cached instance; otherwise, freeze the new term, store it in the cache, and return it.

### Memory Management Algorithms

- **Consolidation:** Mechanism for moving tasks between short-term and long-term memory based on priority
- **Priority Decay:** Gradual reduction of task priority over time
- **Index Management:** Efficient indexes for different term types (inheritance, implication, similarity, etc.)

### Truth Value Operations

Implement NAL-specific truth value calculations:

1. **Revision:** Combine two truth values with the same content but different evidence bases.
2. **Deduction:** Apply deduction rules with proper truth value propagation.
3. **Induction/Abstraction:** Implement induction and abduction truth value calculations.
4. **Negation:** Properly calculate negated truth values.
5. **Expectation:** Calculate expectation values for decision making.

## See Also

- [Architecture](README.architecture.md) - High-level patterns and design principles
- [API Documentation](README.api.md) - Public API reference and usage examples
- [Configuration](README.config.md) - Component configuration options
- [Development Guide](README.development.md) - Component development patterns
