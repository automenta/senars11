import WebSocket from 'ws';
import { useStore } from './store.js';

// For the NodeGUI app, we'll use a global WebSocket connection
let ws;

// Initialize WebSocket connection
const initWebSocket = () => {
  // Create WebSocket connection to SeNARS engine
  ws = new WebSocket('ws://127.0.0.1:8080');

  ws.onopen = () => {
    console.log('Connected to SeNARS engine');
    // Add connection status to log
    useStore.getState().appendLog({
      type: 'status',
      message: 'Connected to SeNARS engine',
      timestamp: Date.now()
    });
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const store = useStore.getState();

    if (msg.type === 'snapshot') {
      store.setSnapshot(msg);
    } else if (store.live) {
      store.appendLog(msg);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Add error to log
    useStore.getState().appendLog({
      type: 'error',
      message: `WebSocket error: ${error.message || 'Unknown error'}`,
      timestamp: Date.now()
    });
  };

  ws.onclose = () => {
    console.log('Disconnected from SeNARS engine');
    // Add disconnect status to log
    useStore.getState().appendLog({
      type: 'status',
      message: 'Disconnected from SeNARS engine',
      timestamp: Date.now()
    });
  };
};

// Initialize the connection
initWebSocket();

export const requestSnapshot = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'request_snapshot', limit: 100 }));
    // Add to log
    useStore.getState().appendLog({
      type: 'command',
      command: 'request_snapshot',
      timestamp: Date.now()
    });
  }
};

// Function to send NAR commands
export const sendNARCommand = (command) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'nar_command', command: command }));
    // Add to log
    useStore.getState().appendLog({
      type: 'command',
      command: command,
      timestamp: Date.now()
    });
    return true;
  } else {
    // Add error to log
    useStore.getState().appendLog({
      type: 'error',
      message: 'Not connected to SeNARS engine',
      timestamp: Date.now()
    });
    return false;
  }
};