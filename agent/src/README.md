# Agent Subsystems

This directory contains the high-level agent systems that build on the core reasoning engine.

## Quick Reference

| System | Purpose | Entry Point |
|--------|---------|-------------|
| **MCP** | Model Context Protocol server for AI assistants | `mcp/Server.js` |
| **Demo** | Remote-controlled demo runner with WebSocket | `demo/DemoWrapper.js` |
| **RLFP** | Reinforcement Learning from Preferences | `rlfp/RLFPLearner.js` |
| **Know** | Knowledge management and templates | `know/Knowing.js` |
| **Server** | WebSocket monitoring and broadcasting | `server/WebSocketMonitor.js` |
| **App** | Application lifecycle and configuration | `app/App.js` |

## Subsystems

### MCP Server (`mcp/`)
Exposes SeNARS as MCP tools for AI assistants (Claude, etc.).
```bash
node agent/src/mcp/start-server.js
```
**Tools**: `reason`, `memory-query`, `execute-tool`, `evaluate_js`, `get-focus`

### Demo System (`demo/`)
Remote-controlled demo execution with pause/resume/step.
- WebSocket integration for real-time updates
- Builtin demos from `examples/*.nars`
- Custom demo support

### RLFP Framework (`rlfp/`)
Learn reasoning preferences from human feedback.
- `ReasoningTrajectoryLogger` — Capture reasoning traces
- `PreferenceCollector` — A/B comparison
- `RLFPLearner` — Apply preference updates

### Knowledge System (`know/`)
Structured knowledge management.
- `Knowing.js` — Core knowledge operations
- `KnowledgeBaseConnector.js` — External KB integration
- `NarseseTemplate.js` — Template-based Narsese generation

### WebSocket Server (`server/`)
Real-time monitoring and client communication.
- `WebSocketMonitor.js` — Event broadcasting, rate limiting
- `ClientMessageHandlers.js` — Message routing

## Usage

```javascript
import { Server as MCPServer } from './mcp/Server.js';
import { DemoWrapper } from './demo/DemoWrapper.js';
import { Knowing } from './know/Knowing.js';

// Start MCP server
const mcp = new MCPServer({ nar });
await mcp.start();

// Run demos
const demo = new DemoWrapper();
demo.initialize(nar, webSocketMonitor);
await demo.startDemo('syllogism');
```

## Dependencies

All subsystems depend on `@senars/core` for the NAR instance.
