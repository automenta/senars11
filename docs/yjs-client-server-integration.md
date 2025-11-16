# Yjs Client/Server Synchronization System

This document explains the real-time collaborative editing system implemented in SeNARS using Yjs for conflict-free
replicated data types (CRDTs).

## Architecture Overview

The system enables multiple clients to simultaneously interact with the NAR (Non-Axiomatic Reasoning system) with all
changes synchronized in real-time across clients.

```
[Client 1] ←→ [WebSocket] ←→ [Server] ←→ [NAR] ←→ [Yjs Doc] ←→ [Client 2]
     ↑                ↑           ↑         ↑           ↑
narseseInput    Commands    Processing  Sync State  Synchronized UI
```

## Component Flow

### 1. Client-Side (`/ui/src/utils/websocket.js`)

- `WebSocketService` connects to main server
- `YjsSyncClient` connects to Yjs server independently
- Both connections are managed by `Zustand` store

### 2. Server-Side (`/src/server/`)

- `WebSocketMonitor` handles command routing
- `YjsStateManager` captures NAR events
- `YjsDocServer` serves Yjs documents to clients

### 3. Data Flow

1. **User Input**: Client sends `narseseInput` command via WebSocket
2. **Server Processing**: Server routes to NAR instance
3. **Event Capture**: NAR events captured by YjsStateManager
4. **Yjs Sync**: Events update shared Yjs document
5. **Broadcast**: Changes propagate to all connected clients
6. **UI Update**: Client Zustand stores update automatically

## Key Files

### Client-Side

- `ui/src/utils/websocket.js` - Main WebSocket service with Yjs integration
- `ui/src/utils/YjsSyncClient.js` - Yjs document synchronization
- `ui/src/stores/uiStore.js` - Zustand store with Yjs service reference

### Server-Side

- `src/server/WebSocketMonitor.js` - WebSocket command routing
- `src/server/YjsStateManager.js` - NAR event to Yjs synchronization
- `src/server/YjsDocServer.js` - Yjs WebSocket server

## Testing

The integration is tested with `tests/integration/yjs/YjsClientServerIntegration.test.js` which validates:

- Multiple client synchronization
- Cross-client command visibility
- Disconnect/reconnect scenarios
- Complete round-trip flow

## Usage

To use in UI components:

1. Send commands via WebSocketService: `{type: 'narseseInput', payload: {input: '...'}}`
2. Listen to Zustand store for updates (automatically updated via Yjs)
3. All connected clients see real-time state changes

The system provides seamless real-time collaboration where multiple users can simultaneously work with the NAR system
while maintaining synchronized state views.