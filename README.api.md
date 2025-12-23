# SeNARS API Documentation

## `NAR` (NARS Reasoner Engine)

The `NAR` class serves as the central orchestrator and public API for the entire reasoning system.

**API:**

- `constructor(config: SystemConfig)`:
    - Initializes the `Memory`, `Focus`, `RuleEngine`, `TaskManager`, and `Cycle` with the provided configuration.
    - `SystemConfig` specifies rule sets (NAL, LM), memory parameters, and other system-wide settings.
- `input(narseseString: string)`: Parses a Narsese string, creates a `Task`, and adds it to the `TaskManager` and `Memory`.
- `on(eventName: string, callback: Function)`: Registers event listeners for various system outputs and internal events (e.g., `'output'`, `'belief_updated'`, `'question_answered'`, `'cycle_start'`, `'cycle_end'`).
- `start()`: Initiates the continuous reasoning cycle.
- `stop()`: Halts the reasoning cycle.
- `step()`: Executes a single reasoning cycle, useful for debugging and controlled execution.
- `getBeliefs(queryTerm?: Term)`: Returns a collection of current beliefs from memory, optionally filtered by a query term.
- `query(questionTerm: Term)`: Submits a question to the system and returns a promise that resolves with the answer.
- `reset()`: Clears memory and resets the system to its initial state.

## Stream Reasoner Usage Examples

### Basic Construction

```javascript
import { Reasoner, TaskBagPremiseSource, BagStrategy, RuleExecutor, RuleProcessor, Memory } from './src';

const memory = new Memory();
const premiseSource = new TaskBagPremiseSource(memory, { priority: true });
const strategy = new BagStrategy();
const ruleExecutor = new RuleExecutor();
const ruleProcessor = new RuleProcessor(ruleExecutor);

const reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
    cpuThrottleInterval: 1,
    maxDerivationDepth: 10
});

reasoner.start();
```

### Event Handling

```javascript
// Listen for derivations
reasoner.on('derivation', (task) => {
    console.log(`Derived: ${task.toString()}`);
});

// Listen for questions answered
reasoner.on('answer', (question, answer) => {
    console.log(`Q: ${question.toString()}`);
    console.log(`A: ${answer.toString()}`);
});

// Listen for system metrics
reasoner.on('metrics', ({ derivationsPerSecond, memoryUsage }) => {
    console.log(`Rate: ${derivationsPerSecond}/s, Memory: ${memoryUsage}MB`);
});
```

### Step-by-Step Execution

```javascript
// For debugging and controlled execution
reasoner.stop();

// Execute single reasoning steps
See [README.usage.md](README.usage.md) for complete usage examples and [README.core.md](README.core.md) for detailed component documentation.
