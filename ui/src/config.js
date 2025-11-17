// Export default WebSocket URL - this can still be used as fallback
export const WEBSOCKET_URL = 'ws://localhost:8080/ws';
export const RECONNECT_DELAY = 3000; // 3 seconds
export const MAX_LOG_ENTRIES = 1000;
export const BATCH_PROCESSING_INTERVAL = 150; // matches server-side batching
export const MAX_GRAPH_NODES = 5000; // Maximum number of nodes to display
export const MAX_GRAPH_EDGES = 10000; // Maximum number of edges to display
export const UI_UPDATE_INTERVAL = 1000; // How often to update UI in ms