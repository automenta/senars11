# SeNARS (Semantic Non-axiomatic Reasoning System)

A hybrid neuro-symbolic reasoning system that combines Non-Axiomatic Logic (NAL) with Language Models (LM) to create an
observable platform for exploring advanced AI concepts. The system implements a continuous, stream-based dataflow
architecture for processing streams of premises into conclusions.

## Quick Reference

### I want to...

| Goal | Command / Location |
|------|-------------------|
| Run reasoning | `const nar = new NAR(); nar.input('(a --> b).');` |
| Start REPL | `node repl/src/Repl.js` |
| Run demos | `node agent/src/demo/demoRunner.js` |
| Start MCP server | `node agent/src/mcp/start-server.js` |
| Run all tests | `npm test` |
| Start WebSocket monitor | `node agent/src/server/WebSocketMonitor.js` |

### Subsystems

| System | Location | Purpose |
|--------|----------|---------|
| **Core NAR** | [`core/src/nar/NAR.js`](core/src/nar/NAR.js) | Main reasoning API |
| **Strategies** | [`core/src/reason/strategy/`](core/src/reason/strategy/) | Premise selection algorithms |
| **Rules** | [`core/src/reason/rules/nal/`](core/src/reason/rules/nal/) | NAL inference rules |
| **Tensor Logic** | [`core/src/functor/`](core/src/functor/) | Neural-symbolic AI with differentiable tensors |
| **LM Integration** | [`core/src/lm/`](core/src/lm/) | Language model providers, embeddings |
| **MCP Server** | [`agent/src/mcp/`](agent/src/mcp/) | AI assistant integration |
| **Demo System** | [`agent/src/demo/`](agent/src/demo/) | Remote-controlled demos |
| **RLFP** | [`agent/src/rlfp/`](agent/src/rlfp/) | Learn from preferences |
| **Knowledge** | [`agent/src/know/`](agent/src/know/) | KB connectors, templates |
| **REPL** | [`repl/src/`](repl/src/) | Ink-based TUI |
| **Web UI** | [`ui/src/`](ui/src/) | React-based interface |

---

## Foundation Status

| System | Status | Notes |
|--------|--------|-------|
| **Core NAR** | ✅ Complete | Main reasoning API |
| **Unifier** | ✅ Complete | Logic unification engine |
| **RuleCompiler** | ✅ Complete | Pattern matching optimization |
| **Strategies** | ✅ Complete | All 10 strategies implemented |
| **LM Integration** | ✅ Complete | 16 rules, NARS-GPT, Embeddings |
| **MCP Server** | ✅ Complete | AI assistant integration |
| **Demo System** | ✅ Complete | Remote-controlled demos |
| **RLFP** | 🚧 Skeleton | Phase 7: Learning from preferences |
| **Web Playground** | ❌ Planned | Phase 8: Debugger UI |
| **TensorFunctor** | ❌ Planned | Phase 5: Differentiable Logic |

---

## The Vision: A Cognitive IDE

*Transform complex reasoning into an observable, debuggable, steerable experience.*

We are not just building an AI; we are building a **Debugger for Thought**. SeNARS is designed to make the invisible reasoning process visible, allowing researchers and developers to step through thoughts just as they step through code.

### 1. The Cognitive IDE
Think of an IDE for reasoning:
- **Thought Graph Canvas**: Interactive force-directed graph showing live concept activation and inference flows.
- **Temporal Scrubber**: Rewind/replay reasoning sequences to any point.
- **Derivation Tree Overlays**: Expand any conclusion to see the full proof tree.

### 2. Debugger Experience
- **Breakpoints**: Set breakpoints on specific concepts (e.g., break when "cat" enters focus).
- **Stepping**: Single-step through the NAL inference cycle.
- **Watch Expressions**: Monitor truth values of specific beliefs in real-time.

### 3. Intervention & Steering
- **Belief Surgery**: Directly inject or modify beliefs.
- **Rule Toggles**: Disable induction or specific strategies temporarily.
- **Goal Injection**: Natural language goal specification.

---

## Architecture: The Stream Reasoner

This is not built to be a finished application. **It is a substrate**—the common seed for a future industrial ecosystem of cognitive architectures. Fork it, strip it, break it, and grow it into the species you need.

### Architecture Overview

```
+------------------+      +------------------+
|  PremiseSource   |<-----|      Layer       |
| (e.g., TaskBag)  |      | (Term/Embedding) |
| - Sampling       |      +------------------+
+------------------+
         | (Stream of primary premises)
         v
+------------------+      +------------------+
|    Reasoner      |----->|     Strategy     |
|------------------|      |------------------|
| - Start/Stop/Step|      | - Premise Pairing|
| - CPU Throttle   |      | - Budget Mgmt    |
| - Output Stream  |      +------------------+
+------------------+
         | (Stream of premise pairs)
         v
+------------------+      +------------------+
|  RuleProcessor   |----->|  RuleExecutor   |
| (Async Pipeline) |      |------------------|
+------------------+      | - Guard Analysis |
         |                | - Indexing (Trie)|
         | (Dispatches to Rules)
         |
+--------v--------+
|      Rules      |
| - NAL (sync)    |
| - LM (async)    |
+-----------------+
         | (Results from sync & async rules)
         |
         +------------------> Merged into Reasoner's Output Stream
```

The SeNARS Stream Reasoner is a continuous, stream-based dataflow architecture that transforms streams of premises into streams of conclusions. This architecture enables hybrid neuro-symbolic reasoning with NAL (Non-Axiomatic Logic) and Language Models (LM) in a resource-aware, continuous processing pipeline.

### System Definition
- **Stream Reasoner**: A continuous, stream-based dataflow architecture (`PremiseSource` → `Strategy` → `RuleProcessor`).
- **Hybrid Core**: Combines synchronous NAL logic with asynchronous Language Model calls.
- **Observable**: Built from the ground up to emit telemetry for every micro-step of reasoning.

### Key Architectural Patterns
1.  **Immutable Data Foundation**: All Terms, Tasks, and Truth values are immutable for safety and caching.
2.  **Component-Based**: Standardized lifecycle (`start`, `stop`, `dispose`) for all parts.
3.  **Dual Memory**: Short-term "Focus" window vs. Long-term persistent storage, managed by automatic consolidation.
4.  **Resource Awareness**: Built-in CPU throttling, backpressure handling, and AIKR (Assumption of Insufficient Knowledge and Resources) budget limits.
5.  **Dynamic Sampling**: Configurable sampling objectives (priority, recency, punctuation, novelty) for intelligent task selection.
6.  **Extensible Architecture**: Pluggable components supporting different reasoning strategies (Bag, Prolog, Exhaustive).



### Practical Use Cases & Domain Laboratories

**Knowledge Discovery:**
- Input: Domain-specific facts and relationships
- Process: System discovers implicit connections and patterns
- Output: Previously unknown relationships or insights

**Decision Support:**
- Input: Current situation and possible options
- Process: Weighs pros/cons based on system knowledge
- Output: Recommended actions with confidence levels

**Healthcare Decision Support (Planned):**
- **Clinical Reasoning Traces**: Transparent diagnostic inference paths
- **Drug Interaction Analysis**: Explainable pharmacological reasoning
- **Treatment Plan Justification**: Clear rationales for recommendations

**Financial Intelligence (Planned):**
- **Compliance Reasoning**: Auditable regulatory analysis
- **Risk Assessment**: Transparent credit/risk evaluation
- **Fraud Detection**: Clear rationale for flagged transactions

**Legal Analysis (Planned):**
- **Case Law Reasoning**: Traceable precedent analysis
- **Contract Risk Identification**: Clause-by-clause reasoning
- **Regulatory Compliance**: Step-by-step verification



## Directory Structure

```
/
├── src/
│   ├── Agent.js                # Agent framework for autonomous operations
│   ├── Stamp.js                # Evidence tracking for tasks and beliefs
│   ├── Truth.js                # Truth value representation and operations
│   ├── config/                 # Configuration management
│   │   ├── ConfigManager.js    # Centralized configuration management
│   │   └── ...
│   ├── demo/                   # Demonstration and example implementations
│   │   └── ...
│   ├── integration/            # External system integration components
│   │   └── KnowledgeBaseConnector.js # Connector for external knowledge bases
│   ├── io/                     # Input/Output adapters and management
│   │   └── ...
│   ├── lm/                     # Language model integration components
│   │   ├── AdvancedNarseseTranslator.js # Advanced translation between Narsese and natural language
│   │   ├── DummyProvider.js    # Dummy provider for testing
│   │   ├── EmbeddingLayer.js   # Vector embeddings for semantic reasoning
│   │   ├── HuggingFaceProvider.js # Hugging Face provider integration
│   │   ├── LM.js               # Main language model component
│   │   ├── LMRuleFactory.js    # Factory for language model rules
│   │   ├── LangChainProvider.js # LangChain provider integration
│   │   ├── ModelSelector.js    # Model selection logic
│   │   ├── NarseseTranslator.js # Basic Narsese translation
│   │   └── ProviderRegistry.js # Registry for language model providers
│   ├── memory/                 # Memory management and knowledge representation
│   │   ├── Bag.js              # Priority-based collection for tasks
│   │   ├── Concept.js          # Represents a concept in memory
│   │   ├── Focus.js            # Attention focus management
│   │   ├── FocusSetSelector.js # Advanced task selection from focus sets
│   │   ├── ForgettingPolicy.js # Policy for forgetting old concepts
│   │   ├── Layer.js            # Abstract layer interface for associative links
│   │   ├── Memory.js           # Central memory component
│   │   ├── MemoryConsolidation.js # Memory consolidation mechanisms
│   │   ├── MemoryIndex.js      # Index management for different term types
│   │   ├── TaskPromotionManager.js # Management of task promotion between memory types
│   │   ├── TermLayer.js        # Term-specific layer implementation
│   │   └── ...
│   ├── module.js               # Module system for dynamic loading
│   ├── nar/                    # NAR system entry point and control
│   │   ├── Cycle.js            # Manages the reasoning cycle execution
│   │   ├── NAR.js              # Main API for system control, input, and output
│   │   ├── OptimizedCycle.js   # Optimized reasoning cycle implementation
│   │   └── SystemConfig.js     # Configuration for NAR instance
│   ├── parser/                 # Narsese parsing and generation
│   │   └── ...
│   ├── reasoning/              # Rule application and inference
│   │   └── ...
│   ├── server/                 # Server-side components
│   │   └── WebSocketMonitor.js # WebSocket-based monitoring and visualization
│   ├── task/                   # Task representation and management
│   │   └── ...
│   ├── term/                   # Robust Term handling
│   │   └── ...
│   ├── testing/                # Testing utilities and frameworks
│   │   └── ...
│   ├── tools/                  # Development and utility tools
│   │   └── ...
│   ├── tui/                    # Text-based user interface
│   │   └── TUIRepl.js          # Main blessed TUI interface REPL
│   └── util/                   # Utility functions and helper classes
│       ├── BaseComponent.js    # Base class for all system components
│       └── ...
├── tests/                      # Unit, integration, and property-based tests
│   ├── ...
├── examples/                   # Demonstrations of system usage
│   └── ...
├── ui/                         # Web UI built with React and Vite
├── scripts/                    # Organized scripts for operations
├── benchmarks/                 # Performance benchmarking tools
├── demo-results/               # Results from demonstrations
├── docs/                       # Documentation files
├── package.json
└── README.md
```

---

## Deep Dive: Stream Reasoner Specification

### Pipeline Specification

#### PremiseSource

The `PremiseSource` generates a continuous stream of `Task`s, drawing from `Memory` based on tunable sampling
objectives.

#### Built-in Implementations:

- `TaskBagPremiseSource`: Samples from a priority bag with configurable strategies
- `PremiseSources`: A bag of multiple `PremiseSource`s that samples proportionally

#### Sampling Objectives:

<a id="sampling-objectives"></a>

- `priority`: Sample tasks based on their priority value (default: true)
- `recency`: Favor tasks that are closest to a target time (default: false)
- `punctuation`: Focus on Goals (`!`) or Questions (`?`) (default: false)
- `novelty`: Favor tasks with fewer reasoning steps (lower derivation depth) (default: false)
- `dynamic`: Enable performance-based strategy adaptation (default: false)

#### Strategy

The `Strategy` component receives the stream of primary premises and creates premise pairs by finding suitable secondary
premises using various selection algorithms. Different strategy implementations provide different reasoning approaches:

- **BagStrategy**: NARS-style priority-sampled bag approach for anytime reasoning
- **ExhaustiveStrategy**: Comprehensive search for all related beliefs for a given task
- **PrologStrategy**: Goal-driven backward chaining with Prolog-style unification and resolution
- **ResolutionStrategy**: NAL-6 query matching with variable unification for question answering
- **GoalDrivenStrategy**: NAL-8 goal achievement through backward chaining and plan synthesis
- **AnalogicalStrategy**: NAL-6 cross-domain knowledge transfer via structure mapping

#### Premise Formation Strategies

The system uses a **composable, modular premise formation architecture** that can be extended for any reasoning paradigm:

| Strategy | Pattern | Priority |
|----------|---------|----------|
| `TaskMatchStrategy` | Syllogistic patterns (shared subject/predicate/middle) | 1.0 |
| `DecompositionStrategy` | Extract subterms from compound statements | 0.8 |
| `TermLinkStrategy` | Associative links via TermLayer | 0.6 |

Custom strategies can be added by extending `PremiseFormationStrategy` and implementing `async* generateCandidates()`.

#### NAL Inference Rules

The rule executor applies NAL inference patterns with corresponding truth functions:

| Rule | Pattern | Truth Function |
|------|---------|----------------|
| `SyllogisticRule` | (A→M), (M→B) ⇒ (A→B) | `Truth.deduction` |
| `ModusPonensRule` | (A⇒B), A ⇒ B | detachment |
| `InductionRule` | (M→P), (M→S) ⇒ (S→P) | `Truth.induction` |
| `AbductionRule` | (P→M), (S→M) ⇒ (S→P) | `Truth.abduction` |
| `ConversionRule` | (P→S) ⇒ (S→P) | `Truth.conversion` |
| `ContrapositionRule` | (S⇒P) ⇒ (¬P⇒¬S) | `Truth.structuralReduction` |

**Advanced Reasoning Capabilities**:

- **Variable Unification**: Queries with variables like `(bird --> ?X)?` resolve to specific bindings, enabling pattern-based question answering
- **Goal-Driven Reasoning**: Tasks with `!` punctuation represent goals to achieve, e.g., `(self --> happy)!`, with backward chaining to synthesize plans
- **Analogical Transfer**: Knowledge transfers across domains via similarity relations, e.g., `(bird <-> airplane)` enables inferring `(airplane --> flyer)` from `(bird --> flyer)` with confidence adjustment

#### RuleExecutor

The `RuleExecutor` indexes all registered rules for fast retrieval and performs symbolic guard analysis to optimize rule
execution through:

- Deduplication & ordering of common checks
- Subsumption detection
- Constant folding

#### RuleProcessor

The `RuleProcessor` consumes premise pairs and executes rules in a non-blocking fashion:

- Synchronous NAL rules are executed immediately and results are emitted
- Asynchronous LM rules are dispatched without blocking and results are emitted when available
- Results are merged into a unified output stream

#### Reasoner

The main `Reasoner` class manages the continuous reasoning pipeline:

- Manages pipeline lifecycle with `start()`, `stop()`, `step()` methods
- Exposes a single `outputStream` for consumers
- Implements resource constraints (CPU throttling, derivation depth limits)

#### Operational Characteristics

**Async/Sync Hybridization**
- **Synchronous Processing**: NAL rules execute synchronously for rapid inference.
- **Asynchronous Processing**: LM rules execute asynchronously to prevent blocking.
- **Unified Output**: Results from both streams are merged into a single output stream.

**Resource Awareness**
- **CPU Throttling**: Configurable interval to prevent event loop blocking.
- **Backpressure**: Adaptive rate adjustment based on consumer feedback.
- **AIKR Limits**: Derivation depth limits to manage combinatorial explosion.

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

## Core System Components

### Supporting Components Overview

The system consists of several interconnected components:

- **NAR (NARS Reasoner Engine)**: The main entry point and orchestrator that manages the reasoning cycle and coordinates all system components.
- **Memory**: Manages concepts, tasks, and knowledge representation; implements both long-term and short-term (focus) memory systems.
- **Focus Manager**: Handles attention focus sets (short-term memory) that prioritize tasks for immediate processing based on attention mechanisms.
- **Term**: Core immutable data structure for representing knowledge elements with structural properties that support reasoning.
- **Task**: Represents units of work or information processed by the system; encapsulates a Term with associated truth values, stamps, and processing priorities.
- **Parser**: Handles Narsese syntax parsing and generation.
- **LM (Language Model Integration)**: Provides language model capabilities that complement formal symbolic reasoning.

### Core Data Structures

#### `Term` Class

The `Term` class represents knowledge in the system and is designed to be immutable for reliability and performance.

**Key Features:**

- **Immutability:** Once created, a `Term` cannot be changed. This ensures data consistency and enables efficient
  caching.
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

**Technical Definitions:**

- **Term**: The fundamental unit of knowledge representation in the system
- **Atomic Term**: A simple, indivisible term (like "bird" or "red")
- **Compound Term**: A term built from multiple sub-terms using logical operators
- **Term Normalization**: Converting equivalent terms to the same canonical form

#### `Task` Class

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

**Technical Definitions:**

- **Task**: A unit of work containing knowledge and processing instructions
- **Truth Value**: Measures certainty or confidence in the task's information
- **Stamp**: Records the task's origin and derivation history
- **Priority**: Determines processing order among tasks

#### `Truth` Value Representation

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

#### `Stamp` and Evidence Tracking

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

## Reasoning Paradigms & Learning

### Multi-Logic Support (Unified Truth)
SeNARS supports multiple reasoning strategies with distinct truth value semantics:
- **NAL (Non-Axiomatic Logic)**: Probabilistic `{frequency, confidence}` semantics for uncertainty management.
- **Prolog Strategy**: Backward-chaining resolution with variable unification for classical logic queries.
- **Tensor Logic**: Neural operations expressed as logical predicates (see below).

### Belief vs. Goal Architecture
The system distinguishes between **Beliefs** (what is known) and **Goals** (what is desired):
- **Belief Tasks (`.`)**: Store knowledge. Truth = `{frequency, confidence}`.
- **Goal Tasks (`!`)**: Define objectives. Truth = `{desire, obtainability}`.
This distinction enables the "Nagging Drive" where the system persistently pursues high-priority goals despite distractions.

### Neural-Symbolic Foundation (Tensor Logic)
SeNARS integrates **Tensor Logic** (Domingos, 2024) to treat neural operations and logical reasoning as the same fundamental process:
- **Differentiable Tensors**: N-dimensional arrays with automatic differentiation.
- **End-to-End Learning**: Gradient descent optimizations (Adam, SGD) directly on logical structures.
- **Hybrid Reasoning**: Symbolic logic and neural computation in the same framework.

### Reinforcement Learning (RLFP)
SeNARS incorporates **Reinforcement Learning from Preferences (RLFP)** to learn *how* to think:
- **Trajectory Learning**: Records reasoning paths and optimizes them based on feedback.
- **Policy Adaptation**: Adjusts task selection and rule application strategies to maximize coherent thought.
- **Benefits**: Enables the system to learn distinct "thinking styles" for different domains (e.g., creative vs. analytical).

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

**Stream Reasoner Usage Examples:**

```javascript
const premiseSource = new TaskBagPremiseSource(memory, {priority: true});
const strategy = new BagStrategy();
const ruleExecutor = new RuleExecutor();
const ruleProcessor = new RuleProcessor(ruleExecutor);
const reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
    cpuThrottleInterval: 1,
    maxDerivationDepth: 10
});
reasoner.start();
```

**Technical Definitions:**

- **NAR (NARS Reasoner Engine)**: The main system orchestrator that manages all components and provides the public API
- **Reasoning Cycle**: The iterative process by which the system processes tasks and generates new knowledge
- **Narsese**: The formal language used to represent knowledge and tasks in the system

---





### Memory & Attention System

The `Memory` component orchestrates both long-term storage and short-term attention (`Focus`), managing the system's "Stream of Consciousness".

- **Dual Memory Architecture**:
    - **Focus Sets (Short-term)**: Priority-based working memory. Selects tasks based on urgency, importance, and diversity to prevent tunnel vision.
    - **Long-term Memory**: Persistent storage for Concepts and Terms.
    - **Consolidation**: Automatic movement of items between Focus and Long-term memory based on activation levels.
- **Concept Structure**: Each `Concept` acts as a container for all Beliefs and Questions related to a specific `Term`.
- **Associative Layers**:
    - **TermLayer**: Explicit structural links between terms.
    - **EmbeddingLayer**: Semantic vector similarity links (via `Layer` interface).

### Integration & Interfaces

- **Parser System**: Converts Narsese (e.g., `<bird --> animal>.`) into internal `Term` structures. Handles truth values `{0.9, 0.9}` and complex nested logic.
- **Language Model Integration (LM)**:
    - **Provider Agnostic**: Supports OpenAI, Anthropic, Ollama.
    - **Circuit Breakers**: Automatic fallbacks to pure NAL reasoning if LMs fail.
    - **Smart Selection**: Routes tasks to the most appropriate model based on complexity.

### Tooling & Server

- **TUI (Text User Interface)**: Blessed-based interactive REPL for direct system manipulation.
- **WebSocket Monitor**: Real-time telemetry streaming for the "Cognitive IDE" frontend.
- **External Connectors**: `KnowledgeBaseConnector` for ingesting domain documents.

---

## Configuration and Extensibility



### Stream Reasoner Tuning (Quick Start)
The Stream Reasoner exposes key parameters for behavior tuning:
- `cpuThrottleInterval`: Prevent event loop blocking (default: 1ms).
- `maxDerivationDepth`: Limit reasoning depth (default: 10).
- `Sampling Objectives`: Priority, Recency, Novelty, Dynamic (see "Deep Dive").

**Example:**
```javascript
const reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
    cpuThrottleInterval: 1,
    maxDerivationDepth: 10
});
```

### Configuration Management

Centralized system configuration with validation and default values:

**Key Features:**

- **Immutable:** Configuration values cannot be changed after creation
- **Centralized:** Single management system for all configuration
- **Validated:** Checks ensure configuration values are valid

**Common Configuration Areas:**

- **Memory:** `memory.capacity` (default: 1000), `memory.consolidationThreshold` (default: 0.1)
- **Focus:** `focus.size` (default: 100), `focus.diversityFactor` (default: 0.3)
- **Cycles:** `cycle.delay` (default: 50ms), `cycle.maxTasksPerCycle` (default: 10)
- **Language Models:** `lm.enabled` (default: false), `lm.defaultProvider` (default: 'dummy')
- **Performance:** `performance.maxExecutionTime` (default: 100ms), `performance.memoryLimit` (default: 512MB)

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

## Component Architecture and Utilities

### BaseComponent Architecture

All system components follow a standardized architecture with consistent lifecycle and features:

**Key Features:**

- **Lifecycle Management:** All components follow the same pattern: initialize → start → run → stop → dispose
- **Metrics:** Built-in tracking of component performance and usage
- **Events:** Standardized communication between components
- **Logging:** Consistent logging across all components
- **Error Handling:** Standardized error management

**Component Lifecycle Methods:**

- `initialize()`: Set up the component
- `start()`: Begin operations
- `stop()`: Stop operations gracefully
- `dispose()`: Clean up resources

### Event System (`EventBus`)

Components communicate through a central event system:

- `emit(eventName, data)`: Send an event with data
- `on(eventName, handler)`: Listen for specific events
- `off(eventName, handler)`: Stop listening to events

### Utilities (`util/`)

Helper functions for common operations:

- **Collections:** Specialized data structures like priority queues
- **Constants:** Shared system-wide values
- **Validation:** Input validation functions
- **Logging:** System-wide logging utility

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
3. **Induction/Abstraction:** Implement induction and abduction truth value calculations.
4. **Negation:** Properly calculate negated truth values.
5. **Expectation:** Calculate expectation values for decision making.

---

## API Conventions and Code Quality

### API Design Conventions

- **Component Architecture:** Use BaseComponent as the foundation for all system components with standardized methods
- **Clear Naming:** Use descriptive names for classes, methods, and variables
- **Immutability:** Keep core data structures (Terms, Tasks, Truth, Stamps) unchanged after creation
- **Async Operations:** Use `async/await` for operations involving I/O or heavy computation
- **Configuration Objects:** Pass settings as single objects rather than multiple parameters
- **Event-Driven:** Use events for system outputs and communication
- **Standardized Metrics:** Include built-in metrics collection in all components

### Code Quality and Maintainability

- **Type Safety:** Use JSDoc annotations for type checking
- **Clear Organization:** Separate concerns between modules with consistent conventions
- **Consistent Error Handling:** Standardized error handling across all components
- **Documentation:** JSDoc comments for all public interfaces

---

## Error Handling and Robustness

### Input Validation

- **Narsese Parsing:** Check syntax before processing
- **Truth Values:** Ensure values are between 0 and 1
- **Task Validation:** Verify structure before processing

### Error Handling Strategies

- **Graceful Degradation:** System continues working when parts fail
- **Circuit Breakers:** Prevent cascading failures with automatic recovery
- **Clear Logging:** Detailed logs for debugging
- **Automatic Recovery:** System recovers from common failures
- **User-Friendly Errors:** Helpful error messages for users

### Security Implementation

- **Input Validation:** Check all inputs to prevent attacks
- **Resource Limits:** Prevent system overload with timeouts and limits
- **Secure Configuration:** Safe defaults and environment protection
- **Security Logging:** Track security-related events
- **Rate Limiting:** Prevent abuse by limiting requests per client

---

## Testing Strategy

### Unit Tests

- **Individual Components:** Test each class and function separately
- **Core Classes:** Extensive tests for Term, Task, Memory, and RuleEngine functionality
- **Validation:** Test configuration, error handling, and lifecycle methods

### Integration Tests

- **Component Interaction:** Test how multiple components work together
- **System Behavior:** Verify overall system behavior under real-world scenarios
- **Performance:** Test system performance under various loads

### Property-Based Tests

- **System Invariants:** Verify that core properties remain consistent across transformations
- **Term Properties:** Test immutability and equality invariants
- **Truth Calculations:** Verify truth value operations

### Testing API

The system provides a fluent API for easy test creation.

---

## Performance and Scalability

- **Fast Operations**: <1ms for Term processing, <2ms for Task processing, <5ms for Memory operations
- **High Throughput**: 10,000+ operations per second
- **Memory Efficient**: Smart caching reduces memory growth as knowledge base expands
- **Scalable**: Can distribute across multiple nodes
- **Resource Management**: Configurable limits prevent resource exhaustion (default: 512MB memory, 100ms per cycle)

---

## Technical Architecture Details

### Structural Intelligence Foundation

- **Term Analysis**: Terms enable automatic analysis and optimization through immutability, canonical normalization,
  visitor/reducer patterns, and hash consistency
- **Task Optimization**: Tasks carry information for resource and process optimization using punctuation awareness,
  Truth-Stamp-Budget properties, and immutable processing
- **Truth Validation**: Truth values enable quality assessment and improvement through revision, expectation, and
  confidence mechanisms
- **Stamp Evidence Tracking**: Stamps contain derivation information for validation and learning through complete
  evidence tracking

### Technical Implementation Details

- **Self-monitoring** of reasoning performance and compound intelligence growth
- **Pattern recognition** identifying improvement opportunities and optimization paths
- **Automatic optimization** based on performance data and outcome feedback
- **Reasoning State Analysis**: Comprehensive analysis of system reasoning state with insights generation
- **Performance Metrics**: Detailed metrics collection across all system components
- **Component Architecture**: Sophisticated component management with lifecycle control, dependency resolution, and
  standardized interfaces
- **Event-Driven Architecture**: Comprehensive event system with middleware support, error handling, and performance
  tracking

## NAR: Cognitive Agent

A NAR is a 'Non-Axiomatic Reasoner' instance.

We are transitioning from **Model-Centric** AI (making the LLM bigger/smarter) to **System-Centric** AI (building a
cognitive architecture *around* the model). The SeNARS Stream Reasoner embodies this transition by treating the Language
Model as a substrate for processing context, while the NAR provides the agency.

**The SeNARS Solution**: The `Focus` and `Bag` systems act as a **Dynamic Context Manager**. The NAR decides *what* goes
into the LM's context window based on goals and urgency.

### The "Operating System" Analogy

Think of the LM as the **CPU/ALU** (Arithmetic Logic Unit). It is incredibly fast at processing symbols and pattern
matching, but it has no state. The NAR acts as the **Kernel**:

- **Scheduler**: The `Reasoner` pipeline determines which process gets CPU (LM) time
- **File System**: The `Memory` and `Term` structures provide persistent storage of state
- **Permissions/Security**: The `Truth` values and `Stamps` determine what information is trusted

### Epistemic Stability (The Anchor)

LMs are fluid. If you ask an LM the same question twice with slightly different settings, you get different answers.
This is fatal for an autonomous agent.

**The NAR's Job**: It provides the **Anchor**. If SeNARS holds a belief `<fire --> hot> {1.0, 0.9}`, it doesn't matter
if the LM hallucinates that fire is cold in a poetic context. The NAR enforces consistency.

### The "Goal" Vector

LMs are reactive. They only complete the pattern you give them. They have no intrinsic drive.

**The NAR's Job**: It holds the **Intention**. By separating Beliefs (`.`) from Goals (`!`), the architecture allows the
system to have a "nagging" drive. The LM might get distracted by a tangent, but the SeNARS `Task` with high priority
remains in the system, forcing the system to return to the objective.

## Feature Roadmap

### ML Technique Priority (Research Roadmap)

| Technique | Phase | Prereqs | Benefit |
|-----------|-------|---------|---------|
| **TensorFunctor** | 5 | Unifier | Neural ops as terms |
| **RLFP** | 6 | Phase 6 | Preference learning |
| **Hopfield** | 6+ | Embeddings | Associative retrieval |
| **Bayesian** | 6+ | None | Principled uncertainty |
| **GNN** | 8+ | Indexing | Graph learning |
| **Differentiable Logic** | 6+ | Phase 6 | End-to-end training |



---

## General-Purpose Reinforcement Learning Foundation

The SeNARS architecture naturally supports general-purpose reinforcement learning through its foundational Belief-Goal
distinction:

- **World Model Learning**: Belief tasks with frequency-confidence truth semantics form predictive models of environment
  dynamics
- **Reward Structure Definition**: Goal tasks define reward functions for policy learning
- **Exploration-Exploitation Balance**: Truth value revision mechanisms naturally implement the fundamental RL tradeoff
- **Policy Learning**: Task processing adapts action selection based on predicted outcomes and desired goals
- **Continuous Adaptation**: The system learns through experience by updating beliefs from environmental feedback while
  pursuing goals
- **Transfer Learning**: Knowledge gained in one domain transfers to related domains through structural similarity

This enables SeNARS to function as a general-purpose reinforcement learning system where:

- **Beliefs** form the world model that predicts outcomes of actions
- **Goals** define the reward structure that guides policy learning
- **Interaction** enables the system to learn by attempting to achieve goals and updating beliefs based on outcomes
- **Adaptation** allows continuous learning from experience through truth value revision mechanisms

The separation of these concept types with distinct truth semantics enables SeNARS to naturally implement the
exploration-exploitation balance fundamental to reinforcement learning, where beliefs guide exploitation of known
knowledge while goals drive exploration toward desired outcomes.

---

## Core Technical Challenges

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

These technical challenges and design considerations guide development priorities and ensure the system evolves toward
its ambitious vision while maintaining practical implementation focus.

---

## Long-Term Specification: A Self-Evolving Intelligence Ecosystem

The long-term specification for SeNARS defines a self-evolving intelligence ecosystem that adapts through experience,
user interaction, external knowledge integration, and collaborative development. The system achieves enhanced
intelligence growth with finite resources through recursive structural self-improvement and pattern recognition, all
while maintaining production-ready quality, security, and reliability.

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

### Key Characteristics of the Ideal Result

#### 1. **Compound Intelligence Hybrid System**

- **Real-time NARS reasoning** engine with compound intelligence that grows through use
- **Integrated Language Models** (OpenAI, Ollama, etc.) with intelligent collaboration and validation
- **Bidirectional communication** where LM insights inform NARS reasoning and vice versa
- **Observable reasoning process** with complete traceability and compound improvement visibility

#### 2. **Self-Improving Visualization Interface**

- **Compound reasoning traces** showing how intelligence emerges and grows through structural properties with annotation
  capabilities
- **Task flow visualization** illustrating compound optimization and adaptive processing with dependency mapping
- **Concept evolution mapping** displaying how knowledge organization improves with use, including activation and
  priority changes
- **Intelligence growth dashboard** showing compound improvement metrics and performance with real-time updates
- **Graph UI** for dynamic visualization of Concepts, Tasks, Beliefs, and Goals with force-directed layout
- **Reasoning Trace Panel**: Detailed visualization of reasoning steps with comprehensive logging and annotation tools
- **Task Flow Diagram**: Visual representation of task processing chains and dependencies with interactive exploration
- **Concept Panel**: Real-time monitoring of concept activation and priority changes with detailed metrics
- **Priority Histogram**: Distribution visualization of task and concept priorities with dynamic updates
- **System Status Panel**: Real-time metrics for reasoning performance and system health with resource utilization
- **Meta-Cognition Panel**: Visualization of self-analysis and optimization processes with automated insight generation
- **Time Series Panel**: Temporal analysis of reasoning activities and performance metrics with trend analysis
- **Interactive Exploration Mode**: Allowing users to understand compound improvement processes with detailed drill-down
  capabilities
- **Pattern Analysis Tools**: For discovering compound intelligence patterns and optimization opportunities with visual
  insights
- **Compound Insight Generation**: With automatic discovery and visualization of improvements and system behaviors

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

> *"I can observe exactly how compound NARS-LM reasoning works, identify compound intelligence patterns, and understand
how the system improves itself through structural properties."*

#### For Developers:

> *"I can quickly test different configurations, debug compound intelligence issues, and extend the system with new
compound capabilities using the self-improving architecture."*

#### For Educators:

> *"I can demonstrate compound AI reasoning concepts showing how intelligence emerges from structural properties in an
engaging, understandable way."*

#### For Learners:

> *"I can explore how compound artificial intelligence thinks, reasons, and improves itself, gaining insights into both
logical inference and compound learning."*

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
- **Component Lifecycle Management**: Standardized component foundation with metrics, logging, and error handling
- **Event-Driven Architecture**: Sophisticated event system with middleware support and error handling
- **Circuit Breaker Pattern**: Robust error handling with fallback mechanisms for external services

#### Compound Capabilities:

- **Compound reasoning examples** with intelligence that grows through structural properties
- **Compound LM integration** with compound enhancement of logical reasoning
- **Compound intelligence demonstration** where combination compounds beyond individual parts
- **Compound performance metrics** with continuously improving efficiency and quality
- **Real-time Reasoning Engine**: High-performance engine processing inputs and generating conclusions
- **Intelligent Visualization**: Step-by-step reasoning traces, multiple specialized panels, and interactive exploration
  tools
- **Capture and Analysis Tools**: Comprehensive tools for educational content and research with annotation and export
  capabilities
- **Configurable Interface**: Simple LM provider management, adjustable reasoning parameters, and flexible layout
  management
- **Advanced Hybrid Reasoning**: Sophisticated NARS-LLM collaboration with conflict resolution and cross-validation
- **Self-Analysis and Meta-Reasoning**: Advanced reasoning quality assessment and strategy learning with automatic
  optimization

### System Behavior and Properties

#### 1. **Intelligence Emergence**

The system demonstrates how intelligence emerges from data structure properties, with each Term operation potentially
improving all future Term operations through structural intelligence principles.

#### 2. **Pattern Recognition Properties**

The system exhibits pattern recognition properties where each new pattern may improve recognition of all patterns,
creating enhanced pattern detection and optimization.

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

The SeNARS system demonstrates how reasoning capabilities can emerge from structural properties and improve with use.
This system demonstrates that artificial reasoning systems can be
both powerful and transparent, showing how architectural design leads to enhanced reasoning through systematic
improvement.

---

## Summary

SeNARS is a sophisticated hybrid neuro-symbolic reasoning system that combines the precision of formal logic with the
flexibility of neural language models. Built on immutable data structures and a component-based architecture, it
provides an observable platform for advanced AI reasoning with:

- **Hybrid Intelligence**: Seamless integration of symbolic (NAL) and neural (LM) reasoning
- **Self-Improving Architecture**: Intelligence that grows through use and experience
- **Observable Reasoning**: Clear visibility into how conclusions are reached
- **Practical Applications**: From knowledge discovery to decision support systems
- **Robust Design**: Fault-tolerant with graceful degradation and comprehensive error handling

The system's architecture enables compound intelligence where each addition enhances overall capabilities, making it
suitable for research, education, and production applications requiring transparent and adaptable AI reasoning.

## References

- Wang, P. (2013). _Non-Axiomatic Logic: A Model of Intelligent Reasoning_. World Scientific.
- OpenNARS https://github.com/opennars
- NARchy http://github.com/narchy
- NARS-GPT https://github.com/opennars/NARS-GPT
- Hammer, P. and Lofthouse, T. (2020). ANSNA: An attention-driven non-axiomatic semantic navigation architecture.
  _AGI_ https://github.com/patham9/ANSNA
- NARCES - https://www.proquest.com/openview/65226a4235b1b3f45a155267d08e7994/1?pq-origsite=gscholar&cbl=18750
