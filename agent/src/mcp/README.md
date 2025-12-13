# SeNARS MCP (Model Context Protocol) System

Implementation of the Model Context Protocol for SeNARS using the official `@modelcontextprotocol/sdk`.

## Overview

This module implements an MCP Server that exposes SeNARS reasoning capabilities as tools.
It uses `stdio` transport, making it compatible with MCP clients like Claude Desktop or other LLM integrations.

## Architecture

- **Server**: Exposes SeNARS tools (`reason`, `memory-query`, `execute-tool`) via Stdio transport.
- **Client**: Connects to the Server (e.g. via subprocess).
- **Demo**: `examples/mcp-demo.js` demonstrates an LLM (Ollama or Transformer.js) connecting to SeNARS MCP Server.

## Usage

### Running the Demo

```bash
npm run demo:mcp --workspace=@senars/agent
```

### Running the Server

To start the server (e.g. for use with Claude Desktop config):

```bash
node agent/src/mcp/start-server.js
```

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "senars": {
      "command": "node",
      "args": ["/absolute/path/to/senars-monorepo/agent/src/mcp/start-server.js"]
    }
  }
}
```

### Tools

- `reason`: Performs logical inference using SeNARS.
    - Inputs: `premises` (array of strings), `goal` (optional string)
- `memory-query`: Queries SeNARS memory.
    - Inputs: `query` (string)
- `execute-tool`: Executes internal SeNARS tools.
    - Inputs: `toolName` (string), `parameters` (object)
