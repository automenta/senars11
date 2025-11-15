/**
 * Shared WebSocket initialization utility for consistent WebSocket setup across all UI apps
 * Following AGENTS.md: DRY, Modular, Organized, Abstract
 */
import WebSocketService from './websocket.js';
import useUiStore from '../stores/uiStore.js';

/**
 * Initialize WebSocket connection with consistent configuration
 * @param {Object} options - Optional configuration
 * @param {string} options.wsHost - WebSocket host (defaults to current page's host)
 * @param {string} options.wsPort - WebSocket port (defaults to VITE_WS_PORT or 8080)
 * @param {string} options.wsPath - WebSocket path (defaults to VITE_WS_PATH or /ws)
 * @returns {WebSocketService} Initialized WebSocket service instance
 */
export const initializeWebSocket = (options = {}) => {
  // Check if WebSocket service is already initialized in the store
  const existingWsService = useUiStore.getState().wsService;

  if (existingWsService) {
    // Make sure window reference is set if store has service but window doesn't
    if (!window.wsService) {
      window.wsService = existingWsService;
    }
    console.log('WebSocket service already exists, reusing:', existingWsService.url);
    return existingWsService;
  }

  // Use environment variables or defaults
  const { VITE_WS_PORT = '8080', VITE_WS_PATH = '/ws' } = import.meta.env;
  
  const wsHost = options.wsHost || window.location.hostname || 'localhost';
  const wsPort = options.wsPort || VITE_WS_PORT;
  const wsPath = options.wsPath || VITE_WS_PATH;

  const wsUrl = `ws://${wsHost}:${wsPort}${wsPath}`;

  console.log('Initializing WebSocket connection to:', wsUrl);
  console.log('Page loaded from:', window.location.href, 'Connecting to WebSocket host:', wsHost);

  const wsService = new WebSocketService(wsUrl);
  window.wsService = wsService;
  useUiStore.getState().setWsService(wsService);

  wsService.connect();
  
  return wsService;
};

/**
 * React hook for initializing WebSocket connection in function components
 * @param {Object} options - WebSocket configuration options
 * @returns {Object} WebSocket connection state
 */
export const useWebSocketInitializer = (options = {}) => {
  // This would be used if we need a React hook version
  // For now, we'll focus on the function-based approach
  return {
    initialize: () => initializeWebSocket(options),
    wsService: useUiStore(state => state.wsService),
    wsConnected: useUiStore(state => state.wsConnected)
  };
};

/**
 * Clean up WebSocket connection when needed
 */
export const cleanupWebSocket = () => {
  const wsService = useUiStore.getState().wsService;
  if (wsService) {
    wsService.disconnect();
    useUiStore.getState().setWsService(null);
    if (window.wsService) {
      delete window.wsService;
    }
  }
};