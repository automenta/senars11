// Console bridge to forward logs to WebSocket server
import useUiStore from '../stores/uiStore.js';

// Store original console functions
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
};

// Format log arguments for transmission
const formatArgs = (args) => args.map(arg =>
  typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
);

// Get metadata for debugging
const getLogMetadata = () => ({
  url: typeof window !== 'undefined' ? window.location.href : 'N/A',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
});

// Send log message to WebSocket
const sendLogToWebSocket = (currentWsService, level, args) => {
  if (!currentWsService || currentWsService.state !== 2) return; // 2 is ConnectionState.CONNECTED
  
  try {
    const message = {
      type: 'log',
      level,
      data: formatArgs(args),
      timestamp: Date.now(),
      meta: getLogMetadata()
    };
    
    // Use the WebSocketService's sendMessage method
    if (typeof currentWsService.sendMessage === 'function') {
      currentWsService.sendMessage(message);
    } else if (currentWsService.ws?.readyState === WebSocket.OPEN) {
      currentWsService.ws.send(JSON.stringify(message));
    }
  } catch (error) {
    originalConsole.error('Failed to send console log to WebSocket:', error);
  }
};

// Create a log sender function that wraps original console and sends to WebSocket
const createLogSender = (level) => (...args) => {
  // Always call original console function for browser visibility
  originalConsole[level](...args);
  
  // Also send to WebSocket if available and connected
  const currentWsService = useUiStore.getState().wsService;
  sendLogToWebSocket(currentWsService, level, args);
};

// Initialize console bridging by replacing console functions
const initConsoleBridge = () => {
  Object.keys(originalConsole).forEach(level => {
    console[level] = createLogSender(level);
  });
};

// Initialize the console bridge when module is loaded
initConsoleBridge();

// Function to restore original console functions
export const restoreOriginalConsole = () => {
  Object.keys(originalConsole).forEach(level => {
    console[level] = originalConsole[level];
  });
};

// Export function to manually set WebSocket service (if needed) - kept for compatibility
export const setConsoleBridge = (webSocketService) => {
  // This function is now primarily for compatibility - console functions already access store directly
};

// Export the current wsService for debugging purposes
export const getConsoleBridgeService = () => useUiStore.getState().wsService;