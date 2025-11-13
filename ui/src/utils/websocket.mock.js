// Mock WebSocket service for testing
import useUiStore from '../stores/uiStore';

// Connection state management (mimic the real WebSocketService)
const ConnectionState = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  RECONNECTING: 3,
};

class MockWebSocketService {
  constructor(url, options = {}) {
    console.log('MockWebSocketService constructor called!');
    this.url = url;
    this.state = ConnectionState.DISCONNECTED; // Start in disconnected state like real service
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatTimeoutDuration = options.heartbeatTimeout || 15000; // 15 seconds
    this.lastHeartbeat = Date.now();

    // Set up the connection - do it immediately to make it connect fast
    this.connect();
  }

  connect() {
    this.state = ConnectionState.CONNECTING;
    console.log(`Mock connecting to WebSocket: ${this.url}`);

    // Simulate connection after a short delay to mimic real behavior
    setTimeout(() => {
      this.handleOpen();
    }, 100);
  }

  handleOpen() {
    console.log('Mock WebSocket connected');
    this.state = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    useUiStore.getState().setWsConnected(true);
    this.setupHeartbeat();
    this.processMessageQueue(); // Send any queued messages

    // Simulate sending system metrics to show connection status
    setTimeout(() => {
      this.routeMessage({
        type: 'systemMetrics',
        payload: {
          wsConnected: true,
          cpu: 10,
          memory: 20,
          activeTasks: 0,
          reasoningSpeed: 0
        }
      });
    }, 150);

    // Send initial demo list
    setTimeout(() => {
      this.simulateDemoList();
    }, 200);

    // Start simulating activity
    this.simulateActivity();
  }

  handleClose(event) {
    console.log(`Mock WebSocket disconnected: ${event ? event.code : 'code'} - ${event ? event.reason : 'reason'}`);
    useUiStore.getState().setWsConnected(false);
    this.state = ConnectionState.DISCONNECTED;
    this.clearHeartbeat();
    // Don't attempt reconnection in mock
  }

  handleError(error) {
    console.error('Mock WebSocket error:', error);
    useUiStore.getState().setError({
      message: error.message || 'Mock WebSocket connection error',
      timestamp: Date.now()
    });
  }

  setupHeartbeat() {
    // Clear any existing heartbeat
    this.clearHeartbeat();

    // Set up heartbeat ping
    this.heartbeatInterval = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
        // Send heartbeat
        this.sendMessage({type: 'ping', timestamp: Date.now()});

        // Set timeout for response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Mock heartbeat timeout - connection may be lost');
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
    console.warn('Mock heartbeat timeout detected');
  }

  // Simulate demo list
  simulateDemoList() {
    const demoList = [
      {id: 'demo1', name: 'Demo 1 - Basic Reasoning', description: 'A basic reasoning demo'},
      {id: 'demo2', name: 'Demo 2 - Syllogistic Reasoning', description: 'Syllogistic reasoning patterns'},
      {id: 'demo3', name: 'Demo 3 - Complex Inference', description: 'Complex inference and chaining'}
    ];

    const data = {
      type: 'demoList',
      payload: demoList
    };

    this.handleMessage({data: JSON.stringify(data)});
  }

  disconnect() {
    this.state = 0; // DISCONNECTED
    useUiStore.getState().setWsConnected(false);
  }

  async handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Simulate heartbeat response
      if (data.type === 'ping') {
        setTimeout(() => {
          const pongData = {type: 'pong', timestamp: Date.now()};
          this.routeMessage(pongData);
        }, 10);
        return;
      }

      this.routeMessage(data);
    } catch (error) {
      console.error('Error parsing mock WebSocket message:', error);
    }
  }

  routeMessage(data) {
    // Route to store handlers
    const handlers = {
      layoutUpdate: (payload) => useUiStore.getState().setLayout(payload),
      panelUpdate: (payload) => {
        const {id, config} = payload;
        useUiStore.getState().addPanel(id, config);
      },
      reasoningStep: (payload) => useUiStore.getState().addReasoningStep(payload),
      sessionUpdate: (payload) => {
        const {action, session} = payload;
        return action === 'start'
          ? useUiStore.getState().setActiveSession(session)
          : useUiStore.getState().endSession();
      },
      notification: (payload) => useUiStore.getState().addNotification(payload),
      error: (payload) => useUiStore.getState().setError(payload),
      conceptUpdate: (payload) => {
        const {concept, changeType} = payload;
        return changeType === 'removed'
          ? useUiStore.getState().removeConcept(concept.term)
          : useUiStore.getState().addConcept(concept);
      },
      taskUpdate: (payload) => useUiStore.getState().addTask(payload),
      cycleUpdate: (payload) => useUiStore.getState().addCycle(payload),
      systemMetrics: (payload) => useUiStore.getState().setSystemMetrics(payload),
      demoState: (payload) => {
        const {demoId, ...rest} = payload;
        useUiStore.getState().setDemoState(demoId, rest);
      },
      demoStep: (payload) => useUiStore.getState().addDemoStep(payload),
      demoMetrics: (payload) => {
        const {demoId, ...rest} = payload;
        useUiStore.getState().setDemoMetrics(demoId, rest);
      },
      demoList: (payload) => useUiStore.getState().setDemoList(payload),
      narseseInput: (payload) => {
        // Simulate success response
        useUiStore.getState().addNotification({
          type: payload.success ? 'success' : 'error',
          title: payload.success ? 'Narsese Input Success' : 'Narsese Input Error',
          message: payload.success ? `Processed: ${payload.input}` : (payload.message || 'Failed to process input'),
          timestamp: Date.now()
        });
      }
    };

    const handler = handlers[data.type];
    if (handler) {
      handler(data.payload);
    } else {
      console.log('Mock: Unknown message type:', data.type, data);
    }
  }

  sendMessage(message) {
    // Simulate processing the message
    if (message.type === 'startDemo') {
      // Simulate demo starting
      setTimeout(() => {
        this.routeMessage({
          type: 'demoState',
          payload: {demoId: message.payload.id, status: 'running', progress: 0}
        });
      }, 100);
    } else if (message.type === 'narseseInput') {
      // Simulate narsese input processing
      setTimeout(() => {
        this.routeMessage({
          type: 'narseseInput',
          payload: {
            input: message.payload.input,
            success: true,
            message: `Processed: ${message.payload.input}`
          }
        });
      }, 50);
    } else if (message.type === 'stopDemo') {
      // Simulate demo stopping
      setTimeout(() => {
        this.routeMessage({
          type: 'demoState',
          payload: {demoId: message.payload.id, status: 'stopped'}
        });
      }, 100);
    }

    // Add to message queue for potential future processing
    this.messageQueue.push(message);
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  // Additional methods to simulate activity
  simulateActivity() {
    // Simulate some periodic updates
    const interval = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
        // Simulate some random updates
        const randomEvents = [
          {
            type: 'systemMetrics',
            payload: {
              wsConnected: true,
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              activeTasks: Math.floor(Math.random() * 10),
              reasoningSpeed: Math.floor(Math.random() * 1000)
            }
          },
          {
            type: 'reasoningStep',
            payload: {
              id: `step_${Date.now()}`,
              timestamp: Date.now(),
              input: `<a --> b> ${Math.random() > 0.5 ? '.' : '?'}`,
              output: `<b --> a> ${Math.random() > 0.5 ? '.' : '?'}`,
              rule: Math.random() > 0.5 ? 'deduction' : 'induction'
            }
          },
          {
            type: 'taskUpdate',
            payload: {
              id: `task_${Date.now()}`,
              content: `<a --> b> ${Math.random() > 0.5 ? '.' : '?'}`,
              priority: Math.random(),
              creationTime: Date.now()
            }
          }
        ];

        const randomEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
        this.routeMessage(randomEvent);
      } else {
        clearInterval(interval);
      }
    }, 2000); // Every 2 seconds
  }


  queueMessage(message) {
    // Add message to queue
    this.messageQueue.push(message);
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      const removedMessage = this.messageQueue.shift();
      console.warn('Mock: Message queue overflow, removing oldest message:', removedMessage);
    }
  }

  processMessageQueue() {
    // Process messages that were queued while disconnected
    // In mock, we'll process them immediately
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue[0]; // Peek at first message
      if (this.state === ConnectionState.CONNECTED) {
        this.sendMessage(message);
        this.messageQueue.shift(); // Remove successfully processed message
      } else {
        break; // Stop if no longer connected
      }
    }
  }
}

export default MockWebSocketService;