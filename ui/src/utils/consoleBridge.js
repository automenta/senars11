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
export function setConsoleBridge(webSocket) {
  ws = webSocket;
}

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

// Replace console functions to forward logs
console.log = createLogSender('log');
console.error = createLogSender('error');
console.warn = createLogSender('warn');
console.info = createLogSender('info');

// Function to restore original console functions
export function restoreOriginalConsole() {
  Object.keys(originalConsole).forEach(level => {
    console[level] = originalConsole[level];
  });
}