import useUiStore from '../stores/uiStore';
import { validateMessage } from '../schemas/messages';

// Utility function to get store methods
const getStore = () => useUiStore.getState();

// Message handlers map for cleaner code
const messageHandlers = {
  layoutUpdate: (data) => getStore().setLayout(data.payload.layout),
  panelUpdate: (data) => getStore().addPanel(data.payload.id, data.payload.config),
  reasoningStep: (data) => getStore().addReasoningStep(data.payload.step),
  sessionUpdate: (data) => {
    const { action, session } = data.payload;
    return action === 'start' 
      ? getStore().setActiveSession(session) 
      : getStore().endSession();
  },
  notification: (data) => getStore().addNotification(data.payload),
  error: (data) => getStore().setError(data.payload),
  conceptUpdate: (data) => {
    const { concept, changeType } = data.payload;
    return changeType === 'removed' 
      ? getStore().removeConcept(concept.term) 
      : getStore().addConcept(concept);
  },
  taskUpdate: (data) => getStore().addTask(data.payload.task),
  cycleUpdate: (data) => getStore().addCycle(data.payload.cycle),
  systemMetrics: (data) => getStore().setSystemMetrics(data.payload),
  log: ({ level = 'log', data: logData }) => console[level](...logData ?? []),
};

// Connection state management
const ConnectionState = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  RECONNECTING: 3,
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
  }

  connect() {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      return; // Don't connect if already connecting or connected
    }
    
    this.state = ConnectionState.CONNECTING;
    this.disconnect(); // Ensure clean state
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      getStore().setWsConnected(true);
      this.state = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.processMessageQueue(); // Send any queued messages
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      getStore().setWsConnected(false);
      this.state = ConnectionState.DISCONNECTED;
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      getStore().setError(error);
    };

    this.ws.onmessage = this.handleMessage.bind(this);
  }

  attemptReconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.state = ConnectionState.RECONNECTING;
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
      getStore().setError(new Error('Could not reconnect to server'));
    }
  };

  async handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const validatedData = validateMessage(data);
      
      return validatedData 
        ? this.routeMessage(validatedData) 
        : this.handleInvalidMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      getStore().setError(error);
    }
  }

  routeMessage(data) {
    const handler = messageHandlers[data.type];
    return handler ? handler(data) : console.log('Unknown message type:', data.type, data);
  }

  handleInvalidMessage(data) {
    console.error('Invalid message format:', data);
    getStore().setError(new Error('Received invalid message format'));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state = ConnectionState.DISCONNECTED;
  }

  sendMessage(message) {
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        getStore().setError(error);
      }
    } else {
      this.queueMessage(message);
    }
  }

  queueMessage(message) {
    this.messageQueue.push(message);
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift(); // Remove oldest message
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }
}

export default WebSocketService;