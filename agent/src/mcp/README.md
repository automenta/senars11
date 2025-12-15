# MCP Server

Model Context Protocol server that exposes SeNARS reasoning as tools for AI assistants.

## Quick Start

```bash
node agent/src/mcp/start-server.js
```

## Tools Exposed

| Tool | Description | Parameters |
|------|-------------|------------|
| `ping` | Health check | None |
| `reason` | Run reasoning on premises | `premises[]`, `goal?` |
| `memory-query` | Query concept memory | `query`, `limit` |
| `execute-tool` | Execute a registered tool | `toolName`, `parameters` |
| `evaluate_js` | Run sandboxed JavaScript | `code` |
| `get-focus` | Get current focus buffer | `limit` |

## Usage with Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "senars": {
      "command": "node",
      "args": ["path/to/agent/src/mcp/start-server.js"]
    }
  }
}
```

## Programmatic Usage

```javascript
import { Server } from './Server.js';
import { NAR } from '@senars/core';

const nar = new NAR();
await nar.initialize();

const server = new Server({ nar });
await server.start();
```

## Safety

The `Safety.js` module provides:
- PII scrubbing from inputs
- Input validation
- Sandboxed code execution (1s timeout)

## Files

| File | Purpose |
|------|---------|
| `Server.js` | Main MCP server with tool registration |
| `Client.js` | Client for connecting to MCP servers |
| `Safety.js` | Input validation and PII protection |
| `start-server.js` | CLI entry point |
| `index.js` | Module exports |
