import useUiStore from '../stores/uiStore';
import { validateMessage } from '../schemas/messages';

// Message handlers map for cleaner code
const messageHandlers = {
  layoutUpdate: (data) => useUiStore.getState().setLayout(data.payload.layout),
  panelUpdate: (data) => useUiStore.getState().addPanel(data.payload.id, data.payload.config),
  reasoningStep: (data) => useUiStore.getState().addReasoningStep(data.payload.step),
  sessionUpdate: (data) => {
    const { action, session } = data.payload;
    action === 'start' 
      ? useUiStore.getState().setActiveSession(session) 
      : useUiStore.getState().endSession();
  },
  notification: (data) => useUiStore.getState().addNotification(data.payload),
  error: (data) => useUiStore.getState().setError(data.payload),
};

class WebSocketService {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.disconnect();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      useUiStore.getState().setWsConnected(true);
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      useUiStore.getState().setWsConnected(false);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      useUiStore.getState().setError(error);
    };

    this.ws.onmessage = this.handleMessage.bind(this);
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
      useUiStore.getState().setError(new Error('Could not reconnect to server'));
    }
  }

  async handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const validatedData = validateMessage(data);
      
      validatedData 
        ? this.routeMessage(validatedData) 
        : this.handleInvalidMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      useUiStore.getState().setError(error);
    }
  }

  routeMessage(data) {
    const handler = messageHandlers[data.type];
    handler ? handler(data) : console.log('Unknown message type:', data.type, data);
  }

  handleInvalidMessage(data) {
    console.error('Invalid message format:', data);
    useUiStore.getState().setError(new Error('Received invalid message format'));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        useUiStore.getState().setError(error);
      }
    } else {
      this.handleOfflineMessage(message);
    }
  }

  handleOfflineMessage(message) {
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket is connecting, will send message when connected');
      setTimeout(() => this.sendMessage(message), 1000);
    } else {
      console.error('WebSocket is not available for sending message');
    }
  }
}

export default WebSocketService;