import useUiStore from '../stores/uiStore';
import {validateMessage} from '../schemas/messages';

// Utility function to get store methods
const getStore = () => useUiStore.getState();

// Connection state management
const ConnectionState = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  RECONNECTING: 3,
};

// Message handler utilities
const createMessageHandler = (action) => (data) => {
  try {
    return getStore()[action](data.payload);
  } catch (error) {
    console.error(`Error handling ${action}:`, error);
  }
};

const createMessageHandlerWithParams = (action) => (data) => {
  try {
    const {id, config} = data.payload;
    return getStore()[action](id, config);
  } catch (error) {
    console.error(`Error handling ${action}:`, error);
  }
};

const createDemoStateHandler = (data) => {
  try {
    const {demoId, ...payload} = data.payload;
    return getStore().setDemoState(demoId, payload);
  } catch (error) {
    console.error('Error handling demoState:', error);
  }
};

const createDemoMetricsHandler = (data) => {
  try {
    const {demoId, ...payload} = data.payload;
    return getStore().setDemoMetrics(demoId, payload);
  } catch (error) {
    console.error('Error handling demoMetrics:', error);
  }
};

const createNarseseInputHandler = (data) => {
  try {
    const {input, success, message} = data.payload;
    const notification = {
      type: success ? 'success' : 'error',
      title: success ? 'Narsese Input Success' : 'Narsese Input Error',
      message: success ? `Processed: ${input}` : (message || 'Failed to process input'),
      timestamp: Date.now()
    };
    getStore().addNotification(notification);
  } catch (error) {
    console.error('Error handling narseseInput:', error);
  }
};

const createSessionUpdateHandler = (data) => {
  try {
    const {action, session} = data.payload;
    return action === 'start'
      ? getStore().setActiveSession(session)
      : getStore().endSession();
  } catch (error) {
    console.error('Error handling sessionUpdate:', error);
  }
};

const createConceptUpdateHandler = (data) => {
  try {
    const {concept, changeType} = data.payload;
    return changeType === 'removed'
      ? getStore().removeConcept(concept.term)
      : getStore().addConcept(concept);
  } catch (error) {
    console.error('Error handling conceptUpdate:', error);
  }
};

const createLogHandler = ({level = 'log', data: logData}) => {
  try {
    console[level](...(logData || []));
  } catch (error) {
    console.error('Error handling log:', error);
  }
};

// Message handlers map for cleaner code
const messageHandlers = {
  layoutUpdate: createMessageHandler('setLayout'),
  panelUpdate: createMessageHandlerWithParams('addPanel'),
  reasoningStep: createMessageHandler('addReasoningStep'),
  sessionUpdate: createSessionUpdateHandler,
  notification: createMessageHandler('addNotification'),
  error: createMessageHandler('setError'),
  conceptUpdate: createConceptUpdateHandler,
  taskUpdate: createMessageHandler('addTask'),
  cycleUpdate: createMessageHandler('addCycle'),
  systemMetrics: createMessageHandler('setSystemMetrics'),
  log: createLogHandler,
  
  // Demo-related handlers
  demoState: createDemoStateHandler,
  demoStep: createMessageHandler('addDemoStep'),
  demoMetrics: createDemoMetricsHandler,
  demoList: createMessageHandler('setDemoList'),
  
  // Narsese input handler
  narseseInput: createNarseseInputHandler,
};

class WebSocketService {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.state = ConnectionState.DISCONNECTED;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatTimeoutDuration = options.heartbeatTimeout || 15000; // 15 seconds
    this.lastHeartbeat = Date.now();
  }

  connect() {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      console.warn('WebSocket is already connecting or connected');
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.disconnect(); // Ensure clean state
    
    try {
      console.log(`Connecting to WebSocket: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      getStore().setError({
        message: error.message || 'Failed to create WebSocket connection',
        timestamp: Date.now()
      });
      this.state = ConnectionState.DISCONNECTED;
    }
  }

  handleOpen() {
    console.log('WebSocket connected');
    getStore().setWsConnected(true);
    this.state = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    this.setupHeartbeat();
    this.processMessageQueue(); // Send any queued messages
  }

  handleClose(event) {
    console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
    getStore().setWsConnected(false);
    this.state = ConnectionState.DISCONNECTED;
    this.clearHeartbeat();
    this.attemptReconnect();
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    getStore().setError({
      message: error.message || 'WebSocket connection error',
      timestamp: Date.now()
    });
  }

  setupHeartbeat() {
    // Clear any existing heartbeat
    this.clearHeartbeat();
    
    // Set up heartbeat ping
    this.heartbeatInterval = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
        // Send heartbeat
        this.sendMessage({ type: 'ping', timestamp: Date.now() });
        
        // Set timeout for response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be lost');
          this.handleHeartbeatTimeout();
        }, this.heartbeatTimeoutDuration);
      }
    }, 30000); // Ping every 30 seconds
  }
  
  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
  
  handleHeartbeatTimeout() {
    console.warn('Heartbeat timeout detected, attempting to reconnect');
    this.disconnect();
    this.attemptReconnect();
  }

  attemptReconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.state = ConnectionState.RECONNECTING;
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
      getStore().setError({
        message: 'Could not reconnect to server after multiple attempts',
        timestamp: Date.now()
      });
    }
  };

  async handleMessage(event) {
    try {
      // Check if this is a heartbeat response
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        this.lastHeartbeat = Date.now();
        // Clear the heartbeat timeout if set
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
          this.heartbeatTimeout = null;
        }
        return;
      }
      
      const validatedData = validateMessage(data);

      if (validatedData) {
        return this.routeMessage(validatedData);
      } else {
        this.handleInvalidMessage(data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      // Don't setError for every parsing error as it could flood the UI
      console.warn('Invalid message format (see above error)');
    }
  }

  routeMessage(data) {
    try {
      const handler = messageHandlers[data.type];
      if (handler) {
        return handler(data);
      } else {
        console.log('Unknown message type:', data.type, data);
      }
    } catch (error) {
      console.error('Error in message handler:', error, 'for message:', data);
    }
  }

  handleInvalidMessage(data) {
    console.error('Invalid message format:', data);
    // Don't setError for every invalid message to avoid UI flooding
    console.warn('Received invalid message format (see above)');
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnecting');
      } catch (error) {
        console.warn('Error closing WebSocket:', error);
      }
      this.ws = null;
    }
    this.state = ConnectionState.DISCONNECTED;
    this.clearHeartbeat();
  }

  sendMessage(message) {
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        getStore().setError({
          message: error.message || 'Failed to send message',
          timestamp: Date.now()
        });
        this.queueMessage(message); // Queue message for later if send fails
      }
    } else {
      console.warn('WebSocket not connected, queuing message');
      this.queueMessage(message);
    }
  }

  queueMessage(message) {
    // Add message to queue
    this.messageQueue.push(message);
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      const removedMessage = this.messageQueue.shift();
      console.warn('Message queue overflow, removing oldest message:', removedMessage);
    }
  }

  processMessageQueue() {
    // Process messages that were queued while disconnected
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue[0]; // Peek at first message
      if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(message));
          this.messageQueue.shift(); // Remove successfully sent message
        } catch (error) {
          console.error('Error sending queued message:', error);
          break; // Stop processing if we can't send
        }
      } else {
        break; // Stop if no longer connected
      }
    }
  }
}

export default WebSocketService;