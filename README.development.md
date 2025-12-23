# SeNARS Development Guide

## API Conventions and Code Quality

### API Design Conventions

- **Component Architecture:** Use BaseComponent as the foundation for all system components with standardized methods
- **Clear Naming:** Use descriptive names for classes, methods, and variables
- **Immutability:** Keep core data structures (Terms, Tasks, Truth, Stamps) unchanged after creation
- **Async Operations:** Use `async/await` for operations involving I/O or heavy computation
- **Configuration Objects:** Pass settings as single objects rather than multiple parameters
- **Event-Driven:** Use events for system outputs and communication
- **Standardized Metrics:** Include built-in metrics collection in all components

### BaseComponent & Lifecycle

All system components inheriting from `BaseComponent` follow this lifecycle:

1.  `constructor(config)`: Initialize with immutable configuration.
2.  `initialize()`: Perform async setup (DB connections, model loading).
3.  `start()`: Begin active processing (start loops, listeners).
4.  `stop()`: Gracefully halt processing.
5.  `dispose()`: Cleanup resources (close sockets, file handles).

**Key Features:**
- **Metrics**: Automatic tracking of component performance.
- **Events**: Standardized `emit(event, data)` system.
- **Logging**: Scoped logging accessible via `this.log`.


### Code Quality and Maintainability

- **Type Safety:** Use JSDoc annotations for type checking
- **Clear Organization:** Separate concerns between modules with consistent conventions
- **Consistent Error Handling:** Standardized error handling across all components
- **Documentation:** JSDoc comments for all public interfaces

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

## Performance and Scalability

- **Fast Operations**: <1ms for Term processing, <2ms for Task processing, <5ms for Memory operations
- **High Throughput**: 10,000+ operations per second
- **Memory Efficient**: Smart caching reduces memory growth as knowledge base expands
- **Scalable**: Can distribute across multiple nodes
- **Resource Management**: Configurable limits prevent resource exhaustion (default: 512MB memory, 100ms per cycle)

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
