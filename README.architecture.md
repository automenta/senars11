# SeNARS Architecture

## Key Objectives

**Key Design Objectives:**

- **Simplicity:** Reduce complexity and eliminate over-engineering.
- **Robustness:** Create stable, predictable, and error-resistant core components.
- **Consistency:** Establish clear conventions for API design, data structures, and code style.
- **Testability:** Ensure all parts of the system are comprehensively testable with unit and integration tests.
- **Extensibility:** Design for easy addition of new features, reasoning capabilities, and rule sets.
- **Performance:** Optimize critical paths, especially for `Term` and `Memory` operations.

## Key Architectural Patterns

The SeNARS architecture is built around several fundamental patterns that enable effective reasoning and adaptability through dynamic sampling strategies and configurable reasoning approaches:

### 1. Immutable Data Foundation

- **Core Data Structures** (Terms, Tasks, Truth, Stamps) are immutable, ensuring consistency and enabling efficient caching
- **Canonical Representation**: Equivalent structures normalize to identical forms for efficient comparison and storage
- **Functional Processing**: Operations create new instances rather than modifying existing ones

### 2. Component-Based Architecture

- **BaseComponent Foundation**: All major system components inherit from a common base with standardized lifecycle (initialize, start, stop, dispose)
- **Event-Driven Communication**: Components communicate through a centralized EventBus for loose coupling
- **Built-in Metrics**: All components include standardized performance and operational metrics

### 3. Pipeline-Based Architecture

- **Stream-Based Processing**: Continuous pipeline architecture (`PremiseSource` → `Strategy` → `RuleProcessor`) for processing streams of premises into conclusions
- **Non-Blocking Execution**: Asynchronous processing to prevent blocking the main event loop
- **Resource Awareness**: Built-in throttling, backpressure handling, and derivation depth limits to manage computational resources

### 4. Dual Memory Architecture

- **Short-term Focus Memory**: High-priority, limited-capacity memory for immediate processing
- **Long-term Memory**: Persistent storage for all other knowledge and tasks
- **Automatic Consolidation**: Intelligent movement of information between memory types based on priority and usage

### 5. Hybrid Reasoning Integration

- **NAL-LM Collaboration**: Formal symbolic reasoning combined with neural language model capabilities
- **Circuit Breaker Protection**: Automatic fallback mechanisms when external services fail
- **Bidirectional Enhancement**: Each reasoning modality improves the other's effectiveness

### 6. Layer-Based Extensibility

- **Abstract Layer Interface**: Foundation for different types of associative and semantic connections
- **Specialized Implementations**: TermLayer for term connections, EmbeddingLayer for semantic similarity
- **Flexible Extension**: Easy to add new layer types for different reasoning needs

---

## Async/Sync Hybridization

- **Synchronous Processing**: NAL (Non-Axiomatic Logic) rules execute synchronously for rapid inference
- **Asynchronous Processing**: LM (Language Model) rules execute asynchronously to prevent blocking the main event loop
- **Non-Blocking Pipeline**: Asynchronous LM rules are dispatched without blocking and results are emitted when available
- **Unified Output Stream**: Results from both sync and async rules are merged into a unified output stream

This hybrid approach allows the system to:
- Maintain low latency for core logical inference
- Leverage powerful but slow language model capabilities
- Scale to high-throughput reasoning workloads
- Operate in real-time applications with bounded response times

---

## Truth & Logic Systems

SeNARS supports multiple reasoning strategies with distinct truth value semantics:

**NAL (Non-Axiomatic Logic) Strategy**:
- Uses probabilistic truth values `{frequency, confidence}` for beliefs
- Implements inheritance, similarity, conjunction, and other NAL operators
- Provides default reasoning with frequency-confidence semantics for uncertainty management

**Prolog Strategy**:
- Implements backward-chaining resolution for goal-driven queries
- Uses unification with variable binding for logical inference
- Bridges formal logical unification with the system's knowledge base for goal-oriented problem solving

---

## Advanced Reasoning Capabilities

Beyond basic syllogistic inference, SeNARS supports advanced reasoning patterns:

**Variable Unification**: 
- Queries with variables like `(bird --> ?X)?` resolve to specific bindings
- Enables pattern-based question answering across the knowledge base
- Supports both query variables (`?X`) and independent variables (`$X`)

**Goal-Driven Reasoning**: 
- Tasks with `!` punctuation represent goals to achieve, e.g., `(self --> happy)!`
- Backward chaining synthesizes plans to achieve goals
- Goals drive exploration while beliefs guide exploitation

**Analogical Transfer**: 
- Knowledge transfers across domains via similarity relations
- E.g., `(bird <-> airplane)` enables inferring `(airplane --> flyer)` from `(bird --> flyer)`
- Confidence adjustment based on similarity strength

---

## Stream Reasoner Architecture

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
|                  |      | - Guard Analysis |
+------------------+      | - Indexing (Trie)|
         |                +------------------+
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

### Core Components

The Stream Reasoner is composed of specialized components that form a processing pipeline. It separates the **Premise Source** (where tasks come from) from the **Strategy** (how they are paired) and **Rule Processing** (how they are reasoned upon), allowing for a highly modular and extensible system.

For detailed API definitions and internal implementations of these components (`PremiseSource`, `Strategy`, `RuleProcessor`), see **[README.core.md](README.core.md)**.

For configuration of these components, see **[README.config.md](README.config.md)**.

---

## Component Architecture

All system components follow a standardized architecture based on `BaseComponent`:

- **Lifecycle Management**: Initialize → Start → Stop → Dispose
- **Event Communication**: Components use `EventBus` for loose coupling
- **Built-in Metrics**: Automatic performance tracking
- **Standardized Logging**: Scoped logging for each component

For detailed lifecycle and development patterns, see **[README.development.md](README.development.md)**.

---

## Structural Intelligence Foundation

SeNARS builds intelligence on immutable data structures with powerful properties:

- **Term Analysis**: Immutability, canonical normalization, visitor/reducer patterns, and hash consistency
- **Task Optimization**: Punctuation awareness, Truth-Stamp-Budget properties, and immutable processing
- **Truth Validation**: Revision, expectation, and confidence mechanisms for quality assessment
- **Stamp Evidence Tracking**: Complete derivation information for validation and learning

For detailed data structure implementations, see **[README.core.md](README.core.md)**.

## Technical Implementation Details

- **Self-monitoring** of reasoning performance and compound intelligence growth
- **Pattern recognition** identifying improvement opportunities and optimization paths
- **Automatic optimization** based on performance data and outcome feedback
- **Reasoning State Analysis**: Comprehensive analysis of system reasoning state with insights generation
- **Performance Metrics**: Detailed metrics collection across all system components
- **Component Architecture**: Sophisticated component management with lifecycle control, dependency resolution, and standardized interfaces
- **Event-Driven Architecture**: Comprehensive event system with middleware support, error handling, and performance tracking

- [Core Components](README.core.md) - Deep dive into Memory, Focus, Strategie, and Rules
- [Configuration](README.config.md) - System customization and parameters
- [Development Guide](README.development.md) - Patterns for extending the system
- [Resources](README.resources.md) - AIKR principle and resource management implementation
