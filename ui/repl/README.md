# SeNARS Web UI REPL

A web-based Read-Eval-Print Loop (REPL) interface for interacting with SeNARS reasoners through WebSocket connections.

## Features

- **Single-Session REPL Skeleton**: Working echo REPL in one session
- **Multi-Session Architecture**: Isolated sessions with independent connections
- **Reasoner Integration**: Real NARS reasoning with structured output
- **Per-Session Notebook & History**: Persistent cell-based history isolated by session
- **Agent-Aware Features**: Cross-session interaction and visualization

## Directory Structure

```
ui/repl/
├── index.html          # Main HTML entry point
├── session-manager.js  # Session creation and management
├── repl-core.js        # Core REPL functionality
├── style.css           # Styling for the REPL interface
├── main.js             # Application entry point
├── __tests__/          # Unit tests for REPL components
│   ├── repl-core.test.js
│   ├── session-manager.test.js
│   └── ws.test.js
└── README.md           # This file
```

## Shared Components

The REPL uses shared components from `ui/shared/`:

- `ws.js`: Simplified WebSocket interface that wraps the existing WebSocketService
- `theme.css`: CSS variables for colors, fonts, and spacing
- `protocol.md`: Protocol schema definition for client-server communication

These shared components are necessary because:
1. `ws.js` provides a simplified interface for WebSocket communication that's compatible with the REPL's needs while leveraging the robust WebSocketService
2. `theme.css` provides consistent styling with the rest of the application
3. `protocol.md` documents the specific protocol used by the REPL

## Getting Started

1. Start the SeNARS web server:
   ```bash
   npm run web
   ```

2. Open your browser and navigate to `http://localhost:5173/repl/`

3. The "main" session is automatically created

4. Type commands in the input area and press Enter to submit

5. Use the "New Session" button to create additional isolated sessions

## Development

### Phase 1: Single-Session REPL Skeleton
- Working echo REPL in one session
- Basic WebSocket integration
- Simple input/output handling

### Code Refactoring
- Improved session ID generation
- Enhanced WebSocket reconnection logic
- Streamlined output handling
- Better organized CSS styling
- More concise conditional logic
- Improved code modularity and organization

### Phase 2: Multi-Session Architecture
- Isolated sessions with independent connections
- Session management UI
- Unique styling per session

### Phase 3: Reasoner Integration
- Real NARS reasoning with structured output
- Command parsing for reasoner controls
- Session-scoped rendering

### Phase 4: Per-Session Notebook & History
- Persistent cell-based history
- Session-isolated history navigation
- Local storage persistence

### Phase 5: Agent-Aware Features
- Cross-session interaction
- Session communication widgets
- Multi-agent visualization

### Phase 6: Optimization & Polish
- Resource management
- Responsiveness improvements
- Stress testing

## Testing

Run the REPL unit tests with:

```bash
cd ui
npm test
```

Or run specific REPL tests:

```bash
cd ui
npx vitest repl
```

## Debugging

Enable debugging features by adding `?debug=true` to the URL:
- Raw WebSocket logging
- Access session registry via `window.NARS_SESSIONS`

## Protocol

See `ui/shared/protocol.md` for the complete client-server protocol specification.

## Implementation Details

This REPL implementation leverages the existing WebSocket infrastructure in the SeNARS codebase:

- Uses `WebSocketService` from `ui/src/utils/websocket.js` for robust WebSocket communication through the wrapper in `ui/shared/ws.js`
- Integrates with the message processing pipeline using `messageProcessor` and `handlerRegistry`
- Follows the same validation patterns as the main UI using Zod schemas
- Reuses connection state management and reconnection logic## Implementation Details

This REPL implementation leverages the existing WebSocket infrastructure in the SeNARS codebase:

- Uses `WebSocketService` from `ui/src/utils/websocket.js` for robust WebSocket communication through the wrapper in `ui/shared/ws.js`
- Integrates with the message processing pipeline using `messageProcessor` and `handlerRegistry`
- Follows the same validation patterns as the main UI using Zod schemas
- Reuses connection state management and reconnection logic
