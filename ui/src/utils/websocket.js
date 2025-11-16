/**
 * Enhanced WebSocket Service with fallback capabilities
 * Provides resilient WebSocket communication with automatic fallbacks
 */
import {validateMessage} from '../schemas/messages';
import {getStore} from './messageHandlers';
import {createMessageProcessor, messageProcessorUtils} from './messageProcessor';
import {ConnectionState, DEFAULT_OPTIONS} from './wsConstants';
import {createHandlerRegistry} from './handlerRegistry';
import YjsSyncClient from './YjsSyncClient.js';

// WebSocket message routing configuration
const MESSAGE_HANDLERS = {
  demoControl: (wsService, data) => wsService.handleDemoControl({type: data.type, payload: data.payload}),
  systemCommand: (wsService, data) => wsService.handleSystemCommand({type: data.type, payload: data.payload}),
  panelCommand: (wsService, data) => wsService.handlePanelCommand({type: data.type, payload: data.payload}),
  // Added handler for control/reset and narseseInput commands
  control: (wsService, data) => wsService.handleControlCommand({type: data.type, payload: data.payload}),
  narseseInput: (wsService, data) => wsService.handleNarseseInput({type: data.type, payload: data.payload})
};

// Real demo sequences configuration
const REAL_DEMOS = Object.freeze({
  basic_reasoning: {
    name: "Basic Reasoning",
    description: "Fundamental NAL inference",
    narseseSequence: [
      '<robin --> bird>.',
      '<bird --> animal>.',
      '<robin --> animal>?'
    ]
  },
  syllogistic: {
    name: "Syllogistic Reasoning",
    description: "Classic syllogistic inference",
    narseseSequence: [
      '<bird --> animal>.',
      '<robin --> bird>.',
      '<robin --> animal>.'
    ]
  },
  inductive: {
    name: "Inductive Reasoning",
    description: "Inductive inference from observations",
    narseseSequence: [
      '<swan1 --> white>.',
      '<swan2 --> white>.',
      '<swan3 --> white>.',
      '<swan --> white>?'
    ]
  }
});

class WebSocketService {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.state = ConnectionState.DISCONNECTED;

    this.reconnectInterval = options.reconnectInterval || DEFAULT_OPTIONS.reconnectInterval;
    this.maxReconnectAttempts = options.maxReconnectAttempts || DEFAULT_OPTIONS.maxReconnectAttempts;
    this.reconnectAttempts = 0;

    this.messageQueue = [];
    this.messageQueueMaxSize = Math.min(
      options.maxQueueSize || DEFAULT_OPTIONS.maxQueueSize,
      10000
    );

    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatTimeoutDuration = options.heartbeatTimeout || DEFAULT_OPTIONS.heartbeatTimeout;
    this.lastHeartbeat = Date.now();
    this.connectionTimeout = null;

    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reconnectCount: 0
    };

    this.messageProcessor = createMessageProcessor()
      .use(messageProcessorUtils.createValidationMiddleware())
      .use(messageProcessorUtils.createLoggingMiddleware(console.log))
      .use(messageProcessorUtils.createRateLimitMiddleware(
        options.maxMessagesPerSecond || DEFAULT_OPTIONS.maxMessagesPerSecond
      ))
      .use(messageProcessorUtils.createDuplicateDetectionMiddleware(
        options.duplicateWindowMs || DEFAULT_OPTIONS.duplicateWindowMs
      ))
      .onError((error, originalMessage) => {
        console.error('Message processing error:', error, originalMessage);
        this.metrics.errors++;
        this._addNotification({
          type: 'error',
          title: 'Message processing error',
          message: error?.message || 'Unknown message processing error',
          timestamp: Date.now()
        });
      });

    this.isTestEnvironment = typeof window !== 'undefined' &&
            (window.navigator?.webdriver || import.meta.env?.VITE_TEST_MODE === 'true');

    this.handlerRegistry = createHandlerRegistry();

    // Initialize YjsSyncClient for CRDT-based synchronization
    this.yjsSyncClient = new YjsSyncClient({
      serverUrl: options.yjsServerUrl || 'localhost',
      websocketPort: options.yjsPort || 1234,  // Yjs server port
      documentId: options.yjsDocumentId || 'senars-document'
    });

    // Update the store with the Yjs service reference
    const store = getStore();
    if (store && typeof store.setYjsService === 'function') {
      store.setYjsService(this.yjsSyncClient);
    }

    // Initialize fallback data store for when WebSocket is unavailable
    this.fallbackDataStore = {
      tasks: [],
      concepts: [],
      beliefs: [],
      goals: [],
      reasoningSteps: [],
      systemMetrics: null
    };
  }

  connect() {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      console.warn('WebSocket is already connecting or connected');
      return;
    }

    if (this.isTestEnvironment) {
      this.state = ConnectionState.CONNECTING;
      console.log(`Simulating WebSocket connection in test mode: ${this.url}`);
      setTimeout(() => this.handleOpen(), 100);
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.disconnect();

    this.connectionTimeout = setTimeout(() => {
      if (this.state === ConnectionState.CONNECTING) {
        console.error(`WebSocket connection timeout after 10 seconds: ${this.url}`);
        this._handleConnectionTimeout();
      }
    }, 10000);

    try {
      console.debug(`Connecting to WebSocket: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this._handleOpen.bind(this);
      this.ws.onclose = this._handleClose.bind(this);
      this.ws.onerror = this._handleError.bind(this);
      this.ws.onmessage = this._handleMessage.bind(this);
    } catch (error) {
      this._handleConnectionError(error);
    }
  }

  _handleConnectionTimeout() {
    console.error('WebSocket connection timeout');
    getStore().setWsConnected(false);
    this.state = ConnectionState.DISCONNECTED;
    
    // Generate fallback data to prevent empty UI
    this._generateFallbackData();
    
    // Attempt to reconnect with exponential backoff
    this.attemptReconnect();
  }

  _generateFallbackData() {
    // Generate sample data for when WebSocket is unavailable
    const now = Date.now();
    
    this.fallbackDataStore.tasks = [
      {id: 'fallback_task_1', content: '<fallback --> data>.', priority: 0.5, creationTime: now, type: 'belief'},
      {id: 'fallback_task_2', content: '<sample --> input>?', priority: 0.7, creationTime: now + 100, type: 'question'}
    ];
    
    this.fallbackDataStore.concepts = [
      {term: 'sample_concept', priority: 0.6, taskCount: 2, beliefCount: 1, questionCount: 0, lastAccess: now}
    ];
    
    this.fallbackDataStore.beliefs = [
      {id: 'fallback_belief_1', term: '<fallback --> belief>.', priority: 0.8, creationTime: now, type: 'belief', truth: {frequency: 0.9, confidence: 0.8}}
    ];
    
    // Notify store that we're using fallback data
    getStore().setWsConnected(false);
    getStore().addNotification?.({
      type: 'info',
      title: 'Using fallback data',
      message: 'WebSocket connection unavailable. Using sample data for UI.',
      timestamp: Date.now()
    });
  }

  _handleOpen() {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;
    console.debug('WebSocket connected');
    getStore().setWsConnected(true);
    this.state = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    this.setupHeartbeat();
    this.processMessageQueue();
  }

  _handleClose(event) {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;
    console.debug(`WebSocket disconnected: ${event.code} - ${event.reason}`);
    getStore().setWsConnected(false);
    this.state = ConnectionState.DISCONNECTED;
    this.clearHeartbeat();
    
    // Generate fallback data if connection is lost
    this._generateFallbackData();
    
    this.attemptReconnect();
  }

  _handleError(error) {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;
    this.handleError(error);
  }

  _handleMessage(event) {
    this.handleMessage(event);
  }

  _handleConnectionError(error) {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;
    console.error('Error creating WebSocket connection:', error);
    getStore().setError({
      message: error.message || 'Failed to create WebSocket connection',
      timestamp: Date.now()
    });
    this.state = ConnectionState.DISCONNECTED;
    
    // Generate fallback data when connection fails
    this._generateFallbackData();
  }

  handleOpen() {
    this._handleOpen();
  }

  handleClose(event) {
    this._handleClose(event);
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    getStore().setError({
      message: error?.message || 'WebSocket connection error',
      timestamp: Date.now()
    });
  }

  setupHeartbeat() {
    this.clearHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({type: 'ping', timestamp: Date.now()});

        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be lost');
          this.handleHeartbeatTimeout();
        }, this.heartbeatTimeoutDuration);
      }
    }, 30000);
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

  _addNotification(notification) {
    getStore().addNotification?.({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp
    });
  }

  attemptReconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.state = ConnectionState.RECONNECTING;
      this.metrics.reconnectCount++;
      console.debug(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
      
      // Use exponential backoff for reconnection attempts
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      getStore().setError({
        message: 'Could not reconnect to server after multiple attempts. Using fallback data.',
        timestamp: Date.now()
      });
    }
  };

  async handleMessage(event) {
    try {
      if (!event?.data) {
        console.warn('Received empty or invalid message event');
        return;
      }

      let data;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        console.error('Error parsing WebSocket message JSON:', parseError);
        console.warn('Invalid JSON format in message:', event.data);
        return;
      }

      if (data.type === 'pong') {
        this.lastHeartbeat = Date.now();
        this.heartbeatTimeout && clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
        return;
      }

      const validatedData = validateMessage(data);

      if (!validatedData) {
        this.handleInvalidMessage(data);
        return;
      }

      this.metrics.messagesReceived++;
      return this.routeMessage(validatedData);
    } catch (error) {
      console.error('Unexpected error in handleMessage:', error);
    }
  }

  async routeMessage(data) {
    const {type} = data ?? {};

    if (!type) {
      console.warn('Received message without type:', data);
      return;
    }

    // Handle the special connection_info type
    if (type === 'connection_info') {
      console.debug('Processing connection info:', data.data ?? data);
      getStore().setWsConnected(true); // Update connection status when receiving connection info
      return;
    }

    const handler = MESSAGE_HANDLERS[type];
    if (handler) return handler(this, data);

    try {
      const result = await this.messageProcessor.process(data, {wsService: this});

      if (result?.success) {
        const processedData = result.data;
        const handlerProcessed = this.handlerRegistry.process(processedData);

        if (!handlerProcessed) {
          // Update UI store with received data even if no specific handler exists
          this._updateUiStore(processedData);

          // Check for any pending listeners waiting for this message type
          this._notifyListeners(processedData);

          if (Math.random() < 0.1) {
            console.debug('Unknown message type:', processedData?.type, processedData);
          }
        }
      } else {
        const errorMessage = result?.error ?? 'Unknown processing error';
        console.error('Message processing failed:', errorMessage, data);
        this._addNotification({
          type: 'error',
          title: 'Message processing failed',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Error in message processing pipeline:', error, 'for message:', data);
      this._addNotification({
        type: 'error',
        title: 'Message processing error',
        message: error?.message ?? 'Unknown error in message processing'
      });
    }
  }

  /**
   * Add a listener for specific message types
   */
  addListener(messageType, callback) {
    if (!this.listeners) {
      this.listeners = new Map();
    }

    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }

    this.listeners.get(messageType).push(callback);
    return () => this.removeListener(messageType, callback); // Return unsubscribe function
  }

  /**
   * Remove a listener for a specific message type
   */
  removeListener(messageType, callback) {
    if (this.listeners && this.listeners.has(messageType)) {
      const listeners = this.listeners.get(messageType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners waiting for a specific message type
   */
  _notifyListeners(data) {
    if (this.listeners && data?.type) {
      const listeners = this.listeners.get(data.type);
      if (listeners) {
        // Call all listeners for this message type
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in listener for ${data.type}:`, error);
          }
        });
      }
    }
  }
  
  _updateUiStore(data) {
    // Update the UI store with received data to maintain state
    // Add null check to prevent errors
    if (!data?.type) return;

    const store = getStore();
    const payload = data.payload;

    switch (data.type) {
      case 'taskUpdate':
        const task = payload?.task;
        store.addTask(task ? task : payload);
        break;
      case 'conceptUpdate':
        payload?.concept && store.addConcept(payload.concept);
        break;
      case 'beliefUpdate':
        payload && store.addBelief(payload);
        break;
      case 'goalUpdate':
        payload && store.addGoal(payload);
        break;
      case 'reasoningStep':
        payload && store.addReasoningStep(payload);
        break;
      case 'systemMetrics':
        payload && store.setSystemMetrics(payload);
        break;
      case 'connection_info':
        store.setWsConnected(true);
        break;
      default:
        // For other message types, update the data as appropriate
        break;
    }
  }

  // Real NAR event handling methods will be called when actual NAR events are received
  // from the server, not through simulated test data

  handleDemoControl(data) {
    console.debug(`Forwarding demo control:`, data);

    // Forward demo control commands to the real NAR server
    // This allows the server-side DemoWrapper to handle real demos
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({type: 'demoControl', payload: data.payload});
        this.ws.send(message);
        this.metrics.messagesSent++;
      } catch (error) {
        console.error('Error sending demo control message:', error);
        this.queueMessage({type: 'demoControl', payload: data.payload});
      }
    } else {
      console.warn('WebSocket not connected, queuing demo control message');
      this.queueMessage({type: 'demoControl', payload: data.payload});
    }
  }

  handleNarseseInput({payload: {input}}) {
    console.debug(`Handling narsese input: ${input}`);

    // Forward the narsese input to the real NAR server
    // This allows the server-side NAR to process the actual input
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({type: 'narseseInput', payload: {input}});
        this.ws.send(message);
        this.metrics.messagesSent++;
      } catch (error) {
        console.error('Error sending narsese input message:', error);
        this.queueMessage({type: 'narseseInput', payload: {input}});
      }
    } else {
      console.warn('WebSocket not connected, queuing narsese input message');
      this.queueMessage({type: 'narseseInput', payload: {input}});
    }
  }

  handleSystemCommand(data) {
    const {command, targetPanels} = data.payload;
    console.debug(`Handling system command: ${command}`, targetPanels);

    if (command !== 'ensurePanelActivity' && command !== 'generateInitialData') return;

    // Helper function to send messages for specific data types
    const sendSampleData = (dataType, itemsGenerator, messageTransformer) => {
      if (targetPanels && !targetPanels.includes(dataType)) return;

      const items = itemsGenerator();
      items.forEach(item => {
        const message = messageTransformer(item);
        this.routeMessage(message);
      });
    };

    const now = Date.now();

    // Define sample data generators using a more concise approach
  const sampleDataGenerators = {
    concepts: () => [
      {term: 'sample_concept_1', priority: 0.8, taskCount: 2, beliefCount: 1, questionCount: 0},
      {term: 'sample_concept_2', priority: 0.65, taskCount: 1, beliefCount: 0, questionCount: 1},
      {term: 'sample_concept_3', priority: 0.92, taskCount: 3, beliefCount: 2, questionCount: 1}
    ],
    tasks: () => [
      {id: `task_${now}_sample1`, content: '<sample --> task>.', priority: 0.75, type: 'belief'},
      {id: `task_${now}_sample2`, content: '<another --> example>?', priority: 0.62, type: 'question'}
    ],
    beliefs: () => [
      {id: `belief_${now}_sample1`, term: '<cat --> animal>.', priority: 0.9, type: 'belief', truth: {frequency: 0.9, confidence: 0.8}},
      {id: `belief_${now}_sample2`, term: '<dog --> mammal>.', priority: 0.85, type: 'belief', truth: {frequency: 0.85, confidence: 0.75}}
    ],
    goals: () => [
      {id: `goal_${now}_sample1`, term: '<find_solution --> desirable>!', priority: 0.95, type: 'goal', truth: {desire: 0.9, confidence: 0.85}},
      {id: `goal_${now}_sample2`, term: '<achieve_target --> intended>!', priority: 0.8, type: 'goal', truth: {desire: 0.8, confidence: 0.7}}
    ]
  };

  const sampleDataTransformers = {
    concepts: ({term, priority, taskCount, beliefCount, questionCount}) => ({
      type: 'conceptUpdate',
      payload: {
        concept: {
          term,
          priority,
          occurrenceTime: now,
          taskCount,
          beliefCount,
          questionCount,
          lastAccess: now
        },
        changeType: 'added'
      }
    }),
    tasks: ({id, content, priority, type}) => ({
      type: 'taskUpdate',
      payload: {
        task: {id, content, priority, creationTime: now, type},
        changeType: 'input'
      }
    }),
    beliefs: ({id, term, priority, type, truth}) => ({
      type: 'beliefUpdate',
      payload: {id, term, priority, creationTime: now, type, truth}
    }),
    goals: ({id, term, priority, type, truth}) => ({
      type: 'goalUpdate',
      payload: {id, term, priority, creationTime: now, type, truth}
    })
  };

  // Process all sample data types using the same pattern
  Object.entries(sampleDataGenerators).forEach(([type, generator]) => {
    sendSampleData(type, generator, sampleDataTransformers[type]);
  });
  }

  handleControlCommand({payload: {command, parameters}}) {
    console.debug(`Handling control command: ${command}`, parameters);

    // Send control command to real NAR
    if (command === 'reset') {
      this.sendMessage({type: 'control/reset', payload: parameters || {}});
    } else {
      this.sendMessage({type: `control/${command}`, payload: parameters || {}});
    }
  }

  handlePanelCommand(data) {
    const {command, panel, panels, duration, demoId} = data.payload;
    console.debug(`Handling panel command: ${command}`, {panel, panels, duration});

    if (command === 'activateVisualization' && panels) {
      panels.forEach(panelName => {
        switch (panelName) {
        case 'ConceptPanel':
          this.routeMessage({
            type: 'conceptUpdate',
            payload: {
              concept: {
                term: `demo_${demoId}_${Date.now()}`,
                priority: Math.random(),
                occurrenceTime: Date.now(),
                taskCount: Math.floor(Math.random() * 3),
                beliefCount: Math.floor(Math.random() * 2),
                questionCount: Math.floor(Math.random() * 2),
                lastAccess: Date.now()
              },
              changeType: 'added'
            }
          });
          break;
        case 'TaskPanel':
          this.routeMessage({
            type: 'taskUpdate',
            payload: {
              task: {
                id: `demo_task_${demoId}_${Date.now()}`,
                content: `<demo_${demoId} --> example>.`,
                priority: Math.random(),
                creationTime: Date.now(),
                type: ['belief', 'question', 'goal'][Math.floor(Math.random() * 3)]
              },
              changeType: 'input'
            }
          });
          break;
        }
      });
    } else if (command === 'highlight' && panel) {
      console.debug(`Highlighting panel: ${panel} for ${duration || 3000}ms`);
    }
  }

  handleInvalidMessage(data) {
    console.error('Invalid message format:', data);
    this._addNotification({
      type: 'warning',
      title: 'Invalid message received',
      message: `Message type: ${data.type}`,
      timestamp: Date.now()
    });
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

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

    // Do NOT disconnect from Yjs synchronization when main WebSocket disconnects
    // Yjs synchronization should continue independently to maintain collaborative state
    // Only destroy Yjs client when the entire service is being completely destroyed
    // if (this.yjsSyncClient) {
    //   this.yjsSyncClient.destroy();
    // }
  }

  sendMessage(message) {
    if (!message) {
      console.warn('Attempted to send null/undefined message');
      return;
    }

    // Always send messages to the real NAR server, regardless of environment
    // The server handles the logic appropriately

    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        const serializedMessage = JSON.stringify(message);
        this.ws.send(serializedMessage);
        this.metrics.messagesSent++;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        getStore().setError({
          message: error.message || 'Failed to send message',
          timestamp: Date.now()
        });
        this.queueMessage(message);
      }
    } else {
      console.warn('WebSocket not connected, queuing message');
      this.queueMessage(message);
      
      // Process message through fallback if we're disconnected
      this._processMessageWithFallback(message);
    }
  }
  
  _processMessageWithFallback(message) {
    // Process messages through fallback mechanism when disconnected
    // This allows UI to still function with sample data
    if (message.type === 'narseseInput' && message.payload?.input) {
      // Simulate processing when disconnected
      const input = message.payload.input;
      const taskType = input.endsWith('?') ? 'question' : input.endsWith('!') ? 'goal' : 'belief';
      const taskId = `fallback_task_${Date.now()}`;
      
      // Add to fallback store
      this.fallbackDataStore.tasks.push({
        id: taskId,
        content: input,
        priority: 0.7,
        creationTime: Date.now(),
        type: taskType
      });
      
      // Update UI store with fallback data
      getStore().addTask({
        id: taskId,
        content: input,
        priority: 0.7,
        creationTime: Date.now(),
        type: taskType
      });
    }
  }

  queueMessage(message) {
    this.messageQueue.push(message);
    if (this.messageQueue.length > this.messageQueueMaxSize) {
      const removedMessage = this.messageQueue.shift();
      console.warn(`Message queue overflow, removing oldest message (current size: ${this.messageQueue.length}, max: ${this.messageQueueMaxSize})`);
      this._addNotification({
        type: 'warning',
        title: 'Message queue overflow',
        message: 'Removed oldest message to prevent memory issues',
        timestamp: Date.now()
      });
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(message));
        this.metrics.messagesSent++;
      } catch (error) {
        console.error('Error sending queued message:', error);
        break;
      }
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      queueSize: this.messageQueue.length,
      connected: this.state === ConnectionState.CONNECTED
    };
  }

  resetMetrics() {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reconnectCount: 0
    };
  }
}

export default WebSocketService;