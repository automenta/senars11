# SeNARS Quick Reference

## I want to...

| Goal | Command / Location |
|------|-------------------|
| Run reasoning | `const nar = new NAR(); nar.input('(a --> b).');` |
| Start REPL | `node repl/src/Repl.js` |
| Run demos | `node agent/src/demo/demoRunner.js` |
| Start MCP server | `node agent/src/mcp/start-server.js` |
| Run all tests | `npm test` |
| Start WebSocket monitor | `node agent/src/server/WebSocketMonitor.js` |

## Subsystems

| System | Location | Purpose |
|--------|----------|---------|
| **Core NAR** | `core/src/nar/NAR.js` | Main reasoning API |
| **Strategies** | `core/src/reason/strategy/` | Premise selection algorithms |
| **Rules** | `core/src/reason/rules/nal/` | NAL inference rules |
| **Tensor Logic** | `core/src/functor/` | Neural-symbolic AI with differentiable tensors |
| **LM Integration** | `core/src/lm/` | Language model providers, embeddings |
| **MCP Server** | `agent/src/mcp/` | AI assistant integration |
| **Demo System** | `agent/src/demo/` | Remote-controlled demos |
| **RLFP** | `agent/src/rlfp/` | Learn from preferences |
| **Knowledge** | `agent/src/know/` | KB connectors, templates |
| **REPL** | `repl/src/` | Ink-based TUI |
| **Web UI** | `ui/src/` | React-based interface |

## Verification

```bash
npm test                    # All tests (99.8% pass rate)
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
node examples/phase10-final-demo.js  # Full system demo
```

## Common Patterns

### Basic Reasoning

```javascript
import { NAR } from './core/src/nar/NAR.js';

const nar = new NAR();
nar.on('output', (task) => console.log(task.toString()));
nar.input('(bird --> animal).');
nar.input('(robin --> bird).');
nar.step();  // Derives: (robin --> animal)
```

### Stream Reasoner Construction

```javascript
import { Reasoner, TaskBagPremiseSource, BagStrategy, RuleExecutor, RuleProcessor } from './src';

const reasoner = new Reasoner(
    new TaskBagPremiseSource(memory, {priority: true}), 
    new BagStrategy(), 
    new RuleProcessor(new RuleExecutor()),
    { cpuThrottleInterval: 1, maxDerivationDepth: 10 }
);
reasoner.start();
```

### Question Answering

```javascript
nar.input('(bird --> animal).');
nar.input('(robin --> bird).');
nar.input('(robin --> ?what)?');  // Query with variable
// Answers: (robin --> animal)
```

See [README.usage.md](README.usage.md) for more detailed usage instructions.
