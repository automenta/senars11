# SeNARS Stream Reasoner

The SeNARS Stream Reasoner is a continuous, stream-based dataflow architecture that transforms streams of premises into
streams of conclusions. This architecture enables hybrid neuro-symbolic reasoning with NAL (Non-Axiomatic Logic) and
Language Models (LM) in a resource-aware, continuous processing pipeline.

## Architecture Overview

```
+------------------+      +------------------+
|  PremiseSource   |<-----|      Memory      |
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

## Core Components

### PremiseSource

The `PremiseSource` generates a continuous stream of `Task`s, drawing from `Memory` based on tunable sampling
objectives.

#### Built-in Implementations:

- `TaskBagPremiseSource`: Samples from a priority bag with configurable strategies
- `PremiseSources`: A bag of multiple `PremiseSource`s that samples proportionally

#### Sampling Objectives:

- `priority`: Sample tasks based on their priority value (default: true)
- `recency`: Favor tasks that are closest to a target time (default: false)
- `punctuation`: Focus on Goals (`!`) or Questions (`?`) (default: false)
- `novelty`: Favor tasks with fewer reasoning steps (lower derivation depth) (default: false)
- `dynamic`: Enable performance-based strategy adaptation (default: false)

### Strategy

The `Strategy` component receives the stream of primary premises and creates premise pairs by finding suitable secondary
premises using various selection algorithms.

### RuleExecutor

The `RuleExecutor` indexes all registered rules for fast retrieval and performs symbolic guard analysis to optimize rule
execution through:

- Deduplication & ordering of common checks
- Subsumption detection
- Constant folding

### RuleProcessor

The `RuleProcessor` consumes premise pairs and executes rules in a non-blocking fashion:

- Synchronous NAL rules are executed immediately and results are emitted
- Asynchronous LM rules are dispatched without blocking and results are emitted when available
- Results are merged into a unified output stream

### Reasoner

The main `Reasoner` class manages the continuous reasoning pipeline:

- Manages pipeline lifecycle with `start()`, `stop()`, `step()` methods
- Exposes a single `outputStream` for consumers
- Implements resource constraints (CPU throttling, derivation depth limits)

## Usage Examples

### Basic Setup

```javascript
import { TaskBagPremiseSource, Strategy, RuleExecutor, RuleProcessor, Reasoner } from './src/reason/index.js';

// Create components
const memory = /* your memory instance */;
const premiseSource = new TaskBagPremiseSource(memory, {
  priority: true,
  recency: false,
  punctuation: false,
  novelty: false
});
const strategy = new Strategy();
const ruleExecutor = new RuleExecutor();
const ruleProcessor = new RuleProcessor(ruleExecutor);

// Create reasoner
const reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
  maxDerivationDepth: 10,
  cpuThrottleInterval: 1
});

// Start continuous reasoning
reasoner.start();

// Or run a single step
const result = await reasoner.step();

// Access metrics
const metrics = reasoner.getMetrics();
```

### Configuring Sampling Strategies

```javascript
// Dynamic adaptation with multiple objectives
const premiseSource = new TaskBagPremiseSource(memory, {
  priority: true,
  recency: true,
  punctuation: true,
  novelty: true,
  dynamic: true,  // Enable performance-based adaptation
  weights: {
    priority: 1.0,
    recency: 0.5,
    punctuation: 0.8,
    novelty: 0.3
  }
});
```

### Accessing Pipeline Information

```javascript
// Get current state
const state = reasoner.getState();

// Get debugging information
const debugInfo = reasoner.getDebugInfo();

// Get performance metrics
const perfMetrics = reasoner.getPerformanceMetrics();

// Get component status
const componentStatus = reasoner.getComponentStatus();
```

## Resource Management

The Stream Reasoner implements several resource management features:

### CPU Throttling

- Configurable CPU throttle interval to prevent blocking the event loop
- Adjustable based on system load and consumer feedback

### Derivation Depth Limits

- Configurable maximum derivation depth to keep the derivation graph finite
- Tasks exceeding the limit are discarded to comply with AIKR (Assumption of Insufficient Knowledge and Resources)

### Backpressure Handling

- Advanced detection when output consumers slow down
- Adaptive processing rate adjustments
- Consumer feedback mechanisms to adjust processing based on downstream capacity

## Event-Driven Architecture

The reasoner supports an event-driven notification system for:

- Premise processing events
- Rule application events
- Result generation events

## Testing

The Stream Reasoner includes comprehensive testing:

- Unit tests for individual components
- Integration tests for component interactions
- End-to-end workflow tests
- Property-based tests for edge cases
- Regression tests to ensure stable behavior

## Self-Optimization Hooks

The architecture provides hooks for metacognitive control:

- Sampling objectives serve as direct control knobs
- Derivation graphs in `Stamp`s enable credit assignment
- Performance metrics enable system optimization

## Migration from Legacy Reasoner

The Stream Reasoner maintains backward compatibility while providing enhanced capabilities. Both reasoners can coexist
during transition periods with runtime configuration switches.

## Key Benefits

- **Continuous Processing**: Operates as a non-blocking pipeline processing information as it becomes available
- **Resource Awareness**: Explicitly manages computational resources for stable long-term operation
- **Hybrid Reasoning**: Seamlessly integrates NAL and LM reasoning in a unified architecture
- **Scalability**: Designed for autonomous, long-running operation with proper resource management
- **Observability**: Comprehensive metrics and introspection capabilities
- **Extensibility**: Flexible architecture supporting custom premise sources, strategies, and rule types