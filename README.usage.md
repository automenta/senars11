# SeNARS Usage Guide

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Basic Usage

```javascript
import { Reasoner, TaskBagPremiseSource, BagStrategy, RuleExecutor, RuleProcessor } from './src';

/* Standard stream reasoner construction */
const reasoner = new Reasoner(
    new TaskBagPremiseSource(memory, {priority: true}), 
    new BagStrategy(), 
    new RuleProcessor(new RuleExecutor())
);

/* Initialize reasoning engine */
reasoner.start();
```

For detailed configuration options, see [README.config.md](README.config.md).


## Text User Interface (`TUI`)

Command-line interface for interacting with the system:

- **REPL**: Interactive command-line interface for direct system interaction
- **Command Processing**: Handles user commands and displays results
