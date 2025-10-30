# Web Wrapper for SeNARS

This wrapper allows you to run both the SeNARS WebSocket server and the web UI in a single command.

## Usage

To start both servers together:

```bash
npm run web
```

This will:

1. Start the SeNARS WebSocket monitoring server on ws://localhost:8080/ws
2. Start the Vite development server for the web UI (typically on http://localhost:5174/)
3. Enable real-time communication between the reasoning system and the UI

## Environment Variables

The following environment variables can be used to customize the WebSocket server:

- `WS_PORT` - Port for the WebSocket server (default: 8080)
- `WS_HOST` - Host for the WebSocket server (default: localhost)

## Shutdown

To stop both servers gracefully, press `Ctrl+C`. This will:

1. Save the current NAR state to `agent.json`
2. Stop the WebSocket server
3. Stop the reasoning system
4. Allow the Vite server to shut down cleanly

## How it works

The wrapper script:

- Initializes a NAR (Non-Axiomatic Reasoning) instance
- Sets up a WebSocket monitor to provide real-time data
- Starts the reasoning cycle
- Launches the Vite development server in the `ui` directory
- Handles graceful shutdown of all components