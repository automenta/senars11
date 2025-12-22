# Demo System

Remote-controlled demo execution with real-time WebSocket updates.

## Quick Start

```bash
node agent/src/demo/demoRunner.js
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ DemoWrapper │────▶│ DemosManager │────▶│ BuiltinDemoSource │
└─────────────┘     └──────────────┘     │ FileSystemDemoSource │
       │                                  └─────────────────┘
       ▼
┌─────────────────┐
│ WebSocketMonitor │ ← Real-time updates to UI
└─────────────────┘
```

## Features

- **Remote Control**: start, stop, pause, resume, step
- **Metrics**: Real-time derivation counts, memory usage, cycle times
- **Custom Demos**: Run arbitrary Narsese or JavaScript
- **Builtin Demos**: Syllogism, causal, goals, hybrid reasoning

## API

```javascript
import { DemoWrapper } from './DemoWrapper.js';

const demo = new DemoWrapper({ autoStart: false });
demo.initialize(nar, webSocketMonitor);

// Control
await demo.startDemo('syllogism');
demo.pauseDemo('syllogism');
demo.resumeDemo('syllogism');
demo.stepDemo('syllogism', { cycles: 1 });
demo.stopDemo('syllogism');

// Custom
await demo.runCustomDemo('(bird --> animal).', 'narsese');

// List available
const demos = demo.getAvailableDemos();
```

## WebSocket Messages

| Message Type   | Direction     | Description                  |
|----------------|---------------|------------------------------|
| `demo.control` | Client→Server | start/stop/pause/resume/step |
| `demo.list`    | Server→Client | Available demos              |
| `demo.state`   | Server→Client | Current demo state           |
| `demo.step`    | Server→Client | Step completed               |
| `demo.metrics` | Server→Client | Performance metrics          |

## Files

| File                      | Purpose                                    |
|---------------------------|--------------------------------------------|
| `DemoWrapper.js`          | Main controller with WebSocket integration |
| `DemosManager.js`         | Demo registration and lookup               |
| `BuiltinDemoSource.js`    | Built-in demo definitions                  |
| `FileSystemDemoSource.js` | Load demos from filesystem                 |
| `DemoStateManager.js`     | Track demo execution state                 |
| `DemoValidator.js`        | Validate demo configurations               |
| `ProcessDemoRunner.js`    | Run demos in subprocess                    |
| `demoRunner.js`           | CLI entry point                            |

## Extending

Add custom demos:

```javascript
demo.registerDemo('my-demo', {
    name: 'My Custom Demo',
    description: 'Does something cool',
    handler: async (wrapper, params) => {
        await wrapper.nar.input('(custom --> demo).');
        await wrapper.nar.runCycles(10);
    }
});
```
