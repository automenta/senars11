# SeNARS MCP (Model Context Protocol) System

Implementation of the Model Context Protocol for SeNARS (Semantic Non-Axiomatic Reasoning System) following the plan in `PLAN.mcp.md`.

## Overview

This module implements the Model Context Protocol (MCP) to enable SeNARS to both consume external services and expose its own capabilities as MCP tools. The system follows a dual-mode architecture that allows SeNARS to function as both an MCP client (consumer) and MCP server (provider).

## Architecture

The MCP system consists of several core components:

- **MCPManager**: Core abstraction that manages both client and server operations
- **Client**: Handles consumption of external MCP services
- **Server**: Exposes SeNARS services as MCP tools
- **Adapter**: Translates between SeNARS and MCP formats
- **Safety**: Provides unified validation across all operations
- **index.js**: Main entry point for the MCP system

## Features

### Dual-Mode Operations
- **Client Mode**: Discover and consume external MCP tools
- **Server Mode**: Expose SeNARS capabilities as MCP tools
- **Dual Mode**: Operate as both client and server simultaneously

### Supported SeNARS Tools
- `reason`: SeNARS reasoning engine for logical inference
- `memory-query`: Query SeNARS memory system
- `execute-tool`: Execute SeNARS tools and engines

### Safety & Validation
- Input sanitization and validation
- Output validation and structure checking
- PII detection and tokenization
- Rate limiting
- Schema validation

## Usage

### Basic Setup

```javascript
import { SeNARSMCPSystem } from './src/mcp/index.js';

// Initialize the MCP system in dual mode
const mcpSystem = new SeNARSMCPSystem();
await mcpSystem.initialize('dual');

// Setup as server
await mcpSystem.setupAsServer(3000);

// Connect as client to external MCP server
await mcpSystem.connectAsClient('http://external-mcp-server.com');

// Call a tool (either local or remote)
const result = await mcpSystem.callTool('reason', {
  premises: ['<A --> B>', '<B --> C>'],
  goal: '<A --> C>'
});

console.log(result);
```

### Direct Client Usage

```javascript
import { Client } from './src/mcp/Client.js';

const client = new Client({
  endpoint: 'http://mcp-server:3000',
  connectionTimeout: 10000
});

await client.connect();

// Discover available tools
const tools = await client.discoverTools();
console.log('Available tools:', client.getAvailableTools());

// Call a tool
const result = await client.callTool('memory-query', {
  query: 'concept A',
  limit: 5
});
```

### Direct Server Usage

```javascript
import { Server } from './src/mcp/Server.js';

const server = new Server({
  port: 3000,
  host: 'localhost'
});

await server.start();
console.log('MCP server running:', server.getStatus());

// Register a custom tool
await server.registerTool('custom-operation', {
  title: 'Custom Operation',
  description: 'Performs a custom SeNARS operation',
  inputSchema: {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      parameters: { type: 'object' }
    },
    required: ['operation']
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'string' },
      success: { type: 'boolean' }
    }
  }
}, async (input) => {
  // Custom handler implementation
  return {
    result: `Processed: ${input.operation}`,
    success: true
  };
});
```

## API Endpoints (Simplified HTTP Implementation)

For the current simplified implementation, the MCP server exposes these endpoints:

- `POST /mcp/initialize` - MCP initialization handshake
- `GET /mcp/tools/list` - List available tools
- `POST /mcp/tools/call/:toolName` - Execute a specific tool
- `GET /mcp/resources/list` - List available resources

## Code Execution Mode

The system supports code execution mode for chaining operations across tools:

```javascript
// Execute code that chains multiple tools
const result = await mcpSystem.executeCode(`
  const queryResult = await callTool('memory-query', { query: 'concept A' });
  const reasoningResult = await callTool('reason', { 
    premises: queryResult.results.map(r => r.content)
  });
  return reasoningResult;
`);
```

## Safety Features

- Input sanitization to prevent injection attacks
- PII detection with tokenization (e.g., `[EMAIL_1]`, `[PHONE_1]`)
- Schema validation for all inputs and outputs
- Rate limiting for API protection
- Sandboxed code execution with security checks

## Planned Enhancements

- Full MCP SDK integration for proper protocol compliance
- Advanced transport mechanisms (SSE, WebSocket)
- Authentication and authorization
- Enhanced error handling and monitoring
- Performance optimizations

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [SeNARS Architecture Plan](../PLAN.mcp.md)