# SeNARS Configuration

## Configuration and Tuning Parameters

### Stream Reasoner Configuration

The Stream Reasoner system exposes several key parameters for fine-tuning system behavior:

**Reasoner Parameters:**

- `cpuThrottleInterval`: Interval in milliseconds between reasoning steps to prevent blocking the event loop (default: 1ms)
- `maxDerivationDepth`: Maximum derivation depth to keep the derivation graph finite (default: 10)
- `resourceLimits`: Resource management constraints for computational resources

**PremiseSource Sampling Objectives:**

- `priority`: Sample tasks based on their priority value (default: true)
- `recency`: Favor tasks that are closest to a target time (default: false)
- `punctuation`: Focus on Goals (`!`) or Questions (`?`) (default: false)
- `novelty`: Favor tasks with fewer reasoning steps (lower derivation depth) (default: false)
- `dynamic`: Enable performance-based strategy adaptation (default: false)

## Configuration and Extensibility

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
