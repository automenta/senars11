// Console bridge to forward logs to WebSocket server
let ws = null;

// Store original console functions
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

// Function to set WebSocket instance for console bridging
export const setConsoleBridge = (webSocket) => {
  ws = webSocket;
};

// Format log arguments for transmission
const formatArgs = (args) => args.map(arg =>
  typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
);

// Create a log sender function for a specific level
const createLogSender = (level) => (...args) => {
  originalConsole[level](...args);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'log',
      level,
      data: formatArgs(args),
      timestamp: Date.now()
    }));
  }
};

// Initialize console bridging by replacing console functions
const initConsoleBridge = () => {
  ['log', 'error', 'warn', 'info'].forEach(level => {
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