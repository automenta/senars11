# SeNARS Resource Awareness

The SeNARS Stream Reasoner implements comprehensive resource management to operate effectively under the **AIKR principle** (Assumption of Insufficient Knowledge and Resources). The system is designed to reason continuously with finite computational resources.

## CPU Throttling

Configurable CPU throttle interval prevents blocking the event loop. Set via `cpuThrottleInterval` in reasoner configuration (see [README.config.md](README.config.md) for detailed configuration).

**Behavior:**
- After each reasoning step, the system yields control to allow other async operations
- Higher values reduce CPU usage but slow reasoning throughput
- Lower values increase responsiveness but may block other operations

## Backpressure Handling

Advanced detection when output consumers slow down:

- **Adaptive Processing Rate**: Automatically adjusts reasoning pace based on downstream capacity
- **Output Buffer Management**: Prevents unbounded memory growth when outputs aren't consumed
- **Consumer Feedback**: Mechanisms to communicate processing capacity upstream

```javascript
reasoner.on('backpressure', ({ queueDepth, recommendedDelay }) => {
    console.log(`Output queue at ${queueDepth}, slowing down by ${recommendedDelay}ms`);
});
```

## Derivation Depth Limits

Configurable maximum derivation depth keeps the derivation graph finite. Set via `maxDerivationDepth` in reasoner configuration (see [README.config.md](README.config.md)).

**AIKR Compliance:**
- Tasks exceeding the derivation depth limit are discarded
- Prevents infinite inference chains from exhausting resources
- Ensures the system remains responsive even with complex knowledge bases
- Each derivation tracks its depth through the Stamp evidence chain

## Memory Limits

Resource constraints for memory management (see [README.config.md](README.config.md) for configuration details):

- **Memory Capacity**: Maximum number of concepts in long-term memory (default: 1000)
- **Focus Size**: Maximum tasks in short-term focus memory (default: 100)
- **Forgetting Policy**: Automatic eviction of low-priority concepts when limits are reached

## Execution Time Limits

Per-cycle execution time constraints (configurable via `SystemConfig`):

- **maxExecutionTime**: Maximum milliseconds per reasoning cycle (default: 100ms)
- Tasks or rules exceeding time limits are suspended and resumed later
- Prevents any single operation from blocking the system

## Resource Monitoring

Built-in metrics for resource utilization are available through the event system (see [README.api.md](README.api.md) for event handling examples).

## AIKR Principle

The **Assumption of Insufficient Knowledge and Resources** is a core NARS principle that SeNARS implements:

1. **Knowledge Incompleteness**: The system cannot know everything relevant to its tasks
2. **Resource Scarcity**: Computational resources (time, memory, processing) are always limited
3. **Real-Time Constraints**: Responses are needed within bounded time

**Implications:**
- The system must make reasonable inferences with incomplete information
- Processing must be **anytime**: interrupted at any point and still provide useful results
- Priority-based processing ensures the most important tasks are handled first
- Forgetting is a feature, not a bug: low-priority information is discarded to make room for high-priority knowledge

See [README.config.md](README.config.md) for detailed configuration options.

- [Configuration](README.config.md) - System configuration and tuning
- [Architecture](README.architecture.md) - Resource awareness design patterns
- [Core Components](README.core.md) - Implementation of resource-constrained components

