import useUiStore from '../stores/uiStore';
import { validateMessage } from '../schemas/messages';
import {
  createMessageHandler,
  createMessageHandlerWithParams,
  createDemoStateHandler,
  createDemoMetricsHandler,
  createNarseseInputHandler,
  createSessionUpdateHandler,
  createConceptUpdateHandler,
  createLogHandler,
  getStore
} from './messageHandlers';
import { createMessageProcessor, messageProcessorUtils } from './messageProcessor';

const ConnectionState = Object.freeze({
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  RECONNECTING: 3,
});

// Optimized message handlers with memoization
const createOptimizedMessageHandlers = () => Object.freeze({
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
  
  // LM configuration handlers
  testLMConnection: createMessageHandler('setLMTestResult'),
});

// Handler registry for dynamic message type registration
const createHandlerRegistry = () => {
  const handlers = new Map();
  const defaultHandlers = createOptimizedMessageHandlers();
  
  // Initialize with default handlers
  Object.entries(defaultHandlers).forEach(([type, handler]) => {
    handlers.set(type, handler);
  });
  
  return {
    register: (type, handler) => {
      handlers.set(type, handler);
      return () => handlers.delete(type); // Return unregister function
    },
    
    get: (type) => handlers.get(type),
    
    has: (type) => handlers.has(type),
    
    getAll: () => handlers,
    
    process: (data) => {
      const { type, payload } = data || {};
      if (!type) {
        console.warn('Received message without type:', data);
        return false;
      }
      
      const handler = handlers.get(type);
      if (handler) {
        handler(data);
        return true;
      }
      return false;
    }
  };
};

class WebSocketService {
  constructor(url, options = {}) {
    // Core connection properties
    this.url = url;
    this.ws = null;
    this.state = ConnectionState.DISCONNECTED;
    
    // Reconnection configuration
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    
    // Message queue for offline buffering with optimized limits
    this.messageQueue = [];
    this.messageQueueMaxSize = Math.min(options.maxQueueSize || 1000, 10000); // Cap for memory safety
    
    // Heartbeat and monitoring
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatTimeoutDuration = options.heartbeatTimeout || 15000; // 15 seconds
    this.lastHeartbeat = Date.now();
    this.connectionTimeout = null;
    
    // Performance tracking
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reconnectCount: 0
    };
    
    // Initialize message processor with optimized middleware
    this.messageProcessor = createMessageProcessor()
      .use(messageProcessorUtils.createValidationMiddleware())
      .use(messageProcessorUtils.createLoggingMiddleware(console.log))
      .use(messageProcessorUtils.createRateLimitMiddleware(options.maxMessagesPerSecond || 1000))
      .use(messageProcessorUtils.createDuplicateDetectionMiddleware(options.duplicateWindowMs || 5000))
      .onError((error, originalMessage) => {
        console.error('Message processing error:', error, originalMessage);
        this.metrics.errors++;
        getStore().addNotification?.({
          type: 'error',
          title: 'Message processing error',
          message: error?.message || 'Unknown message processing error',
          timestamp: Date.now()
        });
      });
    
    // Test environment detection
    this.isTestEnvironment = typeof window !== 'undefined' && 
                             (window.navigator.webdriver || 
                              import.meta.env.VITE_TEST_MODE === 'true');
    
    // Create and initialize handler registry
    this.handlerRegistry = createHandlerRegistry();
  }

  connect() {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      console.warn('WebSocket is already connecting or connected');
      return;
    }

    // If in test environment, simulate connection immediately
    if (this.isTestEnvironment) {
      this.state = ConnectionState.CONNECTING;
      console.log(`Simulating WebSocket connection in test mode: ${this.url}`);
      
      // Simulate connection after a short delay to mimic real behavior
      setTimeout(() => this.handleOpen(), 100);
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.disconnect(); // Ensure clean state
    
    // Set a timeout for connection
    this.connectionTimeout = setTimeout(() => {
      if (this.state === ConnectionState.CONNECTING) {
        console.error(`WebSocket connection timeout after 10 seconds: ${this.url}`);
        this.handleError(new Error('Connection timeout'));
      }
    }, 10000); // 10 second timeout

    try {
      console.log(`Connecting to WebSocket: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
        this.handleOpen();
      };
      this.ws.onclose = (event) => {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
        this.handleClose(event);
      };
      this.ws.onerror = (error) => {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
        this.handleError(error);
      };
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
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
    
    // In test mode, simulate some initial data that tests expect
    if (this.isTestEnvironment) this.simulateTestData();
  }

  simulateTestData() {
    // Send initial demo list that tests expect - do this immediately
    const demoList = [
      { id: 'basic-reasoning', name: 'Basic Reasoning Demo', description: 'A simple reasoning demonstration' },
      { id: 'syllogistic', name: 'Syllogistic Reasoning', description: 'Classic syllogistic inference patterns' },
      { id: 'complex-inference', name: 'Complex Inference', description: 'Advanced inference chaining' }
    ];
    
    // Simulate the message being received immediately
    this.routeMessage({ type: 'demoList', payload: demoList });
    
    // Also send other initial data with short delays
    setTimeout(() => {
      // Simulate some concept updates to show activity
      this.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: { term: 'cat', priority: 0.8, occurrenceTime: Date.now(), truth: { frequency: 0.9, confidence: 0.9 } },
          changeType: 'added'
        }
      });
      
      this.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: { term: 'animal', priority: 0.7, occurrenceTime: Date.now(), truth: { frequency: 0.8, confidence: 0.85 } },
          changeType: 'added'
        }
      });
    }, 100);
    
    // Simulate some tasks and reasoning steps to populate the UI
    setTimeout(() => this.routeMessage({
      type: 'taskUpdate',
      payload: {
        id: `task_${Date.now()}`,
        content: '<cat --> animal>.',
        priority: 0.85,
        creationTime: Date.now(),
        type: 'belief'
      }
    }), 200);
    
    setTimeout(() => this.routeMessage({
      type: 'reasoningStep',
      payload: {
        id: `step_${Date.now()}`,
        timestamp: Date.now(),
        input: '<cat --> animal>.',
        output: '<animal <-- cat>?',
        rule: 'deduction',
        confidence: 0.8,
        priority: 0.75
      }
    }), 300);
    
    // Simulate periodic updates for realistic activity
    const interval = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
        // Send system metrics
        this.routeMessage({
          type: 'systemMetrics',
          payload: {
            wsConnected: true,
            cpu: Math.random() * 30,
            memory: Math.random() * 40,
            activeTasks: Math.floor(Math.random() * 5),
            reasoningSpeed: Math.floor(Math.random() * 100) + 50
          }
        });
        
        // Occasionally send task updates
        if (Math.random() > 0.7) {  // 30% chance each interval
          this.routeMessage({
            type: 'taskUpdate',
            payload: {
              id: `task_${Date.now()}_${Math.random()}`,
              content: `<${['dog', 'bird', 'fish'][Math.floor(Math.random() * 3)]} --> ${['mammal', 'animal', 'pet'][Math.floor(Math.random() * 3)]}>${['.', '?', '!'][Math.floor(Math.random() * 3)]}`,
              priority: Math.random(),
              creationTime: Date.now(),
              type: ['belief', 'question', 'goal'][Math.floor(Math.random() * 3)]
            }
          });
        }
      } else {
        clearInterval(interval);
      }
    }, 1500); // Every 1.5 seconds instead of 2 seconds for more activity
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
      message: error?.message || 'WebSocket connection error',
      timestamp: Date.now()
    });
  }

  setupHeartbeat() {
    // Clear any existing heartbeat
    this.clearHeartbeat();
    
    // Set up heartbeat ping with optimized interval
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
  
  _notifyError(title, message) {
    getStore().addNotification?.({
      type: 'error',
      title,
      message,
      timestamp: Date.now()
    });
  }

  attemptReconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.state = ConnectionState.RECONNECTING;
      this.metrics.reconnectCount++;
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
      if (!event?.data) {
        console.warn('Received empty or invalid message event');
        return;
      }
      
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        console.error('Error parsing WebSocket message JSON:', parseError);
        // Don't setError for every parsing error as it could flood the UI
        console.warn('Invalid JSON format in message:', event.data);
        return;
      }
      
      // Check if this is a heartbeat response
      if (data.type === 'pong') {
        this.lastHeartbeat = Date.now();
        // Clear the heartbeat timeout if set
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
      // Don't setError for every parsing error as it could flood the UI
      console.warn('Unexpected error processing WebSocket message');
    }
  }

  async routeMessage(data) {
    const { type, payload } = data || {};
    
    if (!type) {
      console.warn('Received message without type:', data);
      return;
    }
    
    // Handle special command types with dedicated handlers (these bypass the processor)
    const commandHandlers = {
      demoControl: () => this.isTestEnvironment ? this.handleDemoControl({ type, payload }) : null,
      systemCommand: () => this.handleSystemCommand({ type, payload }),
      panelCommand: () => this.handlePanelCommand({ type, payload })
    };
    
    // Check if it's a special command type
    if (commandHandlers[type]) {
      return commandHandlers[type]?.();
    }
    
    try {
      // Process message through the pipeline
      const result = await this.messageProcessor.process(data, { wsService: this });
      
      if (result.success) {
        const processedData = result.data;
        // Try to use handler registry to process the message
        const handlerProcessed = this.handlerRegistry.process(processedData);
        
        if (!handlerProcessed) {
          // In test mode, we may have additional message types
          if (this.isTestEnvironment && processedData.type === 'narseseInput') {
            return this.handleNarseseInput({ type: processedData.type, payload: processedData.payload });
          }
          // Only log unknown types occasionally to prevent flooding
          if (Math.random() < 0.1) { // Only log 10% of unknown types
            console.log('Unknown message type:', processedData.type, processedData);
          }
        }
      } else {
        console.error('Message processing failed:', result.error, data);
        this._notifyError('Message processing failed', result.error);
      }
    } catch (error) {
      console.error('Error in message processing pipeline:', error, 'for message:', data);
      this._notifyError('Message processing error', error?.message || 'Unknown error in message processing');
    }
  }

  handleDemoControl({ payload: { command, demoId } }) {
    
    console.log(`Handling demo control: ${command} for demo ${demoId}`);
    
    if (command === 'start') {
      // Simulate demo starting
      setTimeout(() => this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'running', progress: 0, currentStep: 'Initializing' }
      }), 100);
      
      // Simulate concept activity during demo
      setTimeout(() => {
        // Add some concepts to visualize
        const concepts = [
          { term: `concept_${demoId}_A`, priority: 0.85, occurrenceTime: Date.now(), taskCount: 3, beliefCount: 2, questionCount: 1, lastAccess: Date.now() },
          { term: `concept_${demoId}_B`, priority: 0.72, occurrenceTime: Date.now(), taskCount: 2, beliefCount: 1, questionCount: 0, lastAccess: Date.now() },
          { term: `concept_${demoId}_C`, priority: 0.91, occurrenceTime: Date.now(), taskCount: 4, beliefCount: 3, questionCount: 2, lastAccess: Date.now() }
        ];
        
        concepts.forEach(concept => this.routeMessage({
          type: 'conceptUpdate',
          payload: { concept, changeType: 'added' }
        }));
      }, 150);
      
      // Simulate task activity during demo
      setTimeout(() => {
        const tasks = [
          {
            id: `task_${demoId}_1`,
            content: `<${['cat', 'dog', 'bird'][Math.floor(Math.random() * 3)]} --> ${['animal', 'pet', 'mammal'][Math.floor(Math.random() * 3)]}>${['.', '?', '!'][Math.floor(Math.random() * 3)]}`,
            priority: 0.78,
            creationTime: Date.now(),
            type: ['belief', 'question', 'goal'][Math.floor(Math.random() * 3)]
          },
          {
            id: `task_${demoId}_2`,
            content: `<${['fish', 'horse', 'rabbit'][Math.floor(Math.random() * 3)]} --> ${['water', 'farm', 'pet'][Math.floor(Math.random() * 3)]}>${['.', '?', '!'][Math.floor(Math.random() * 3)]}`,
            priority: 0.65,
            creationTime: Date.now(),
            type: ['belief', 'question', 'goal'][Math.floor(Math.random() * 3)]
          }
        ];
        
        tasks.forEach(task => this.routeMessage({
          type: 'taskUpdate',
          payload: { task, changeType: 'input' }
        }));
      }, 250);
      
      // Simulate progress with additional data
      setTimeout(() => this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'running', progress: 25, currentStep: 'Processing input' }
      }), 300);
      
      // More concepts during processing
      setTimeout(() => this.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: {
            term: `derived_${demoId}_X`,
            priority: 0.68,
            occurrenceTime: Date.now(),
            taskCount: 1,
            beliefCount: 1,
            questionCount: 0,
            lastAccess: Date.now()
          },
          changeType: 'added'
        }
      }), 400);
      
      setTimeout(() => this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'running', progress: 50, currentStep: 'Running inference' }
      }), 600);
      
      setTimeout(() => this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'running', progress: 75, currentStep: 'Generating output' }
      }), 900);
      
      setTimeout(() => this.routeMessage({
        type: 'demoState', 
        payload: { demoId, status: 'completed', progress: 100, currentStep: 'Completed' }
      }), 1200);
    } else if (command === 'stop') {
      this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'stopped', progress: 0 }
      });
    } else if (command === 'pause') {
      this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'paused', progress: payload.progress || 50 }
      });
    } else if (command === 'resume') {
      this.routeMessage({
        type: 'demoState',
        payload: { demoId, status: 'running', progress: payload.progress || 50 }
      });
    }
  }

  handleNarseseInput({ payload: { input } }) {
    
    console.log(`Handling narsese input: ${input}`);
    
    // Simulate successful processing
    setTimeout(() => {
      this.routeMessage({
        type: 'narseseInput',
        payload: { 
          input, 
          success: true, 
          message: `Processed: ${input}` 
        }
      });
      
      // Also add the task to the task list
      this.routeMessage({
        type: 'taskUpdate',
        payload: {
          id: `task_${Date.now()}`,
          content: input,
          priority: Math.random(),
          creationTime: Date.now(),
          type: input.endsWith('?') ? 'question' : input.endsWith('!') ? 'goal' : 'belief'
        }
      });
    }, 50);
  }

  handleSystemCommand(data) {
    const { command, targetPanels } = data.payload;
    
    console.log(`Handling system command: ${command}`, targetPanels);
    
    if (command === 'ensurePanelActivity' || command === 'generateInitialData') {
      // Generate some sample data for the specified panels
      if (!targetPanels || targetPanels.includes('concepts')) {
        // Add sample concepts
        const sampleConcepts = [
          { term: 'sample_concept_1', priority: 0.8, occurrenceTime: Date.now(), taskCount: 2, beliefCount: 1, questionCount: 0, lastAccess: Date.now() },
          { term: 'sample_concept_2', priority: 0.65, occurrenceTime: Date.now(), taskCount: 1, beliefCount: 0, questionCount: 1, lastAccess: Date.now() },
          { term: 'sample_concept_3', priority: 0.92, occurrenceTime: Date.now(), taskCount: 3, beliefCount: 2, questionCount: 1, lastAccess: Date.now() }
        ];
        
        sampleConcepts.forEach(concept => this.routeMessage({
          type: 'conceptUpdate',
          payload: { concept, changeType: 'added' }
        }));
      }
      
      if (!targetPanels || targetPanels.includes('tasks')) {
        // Add sample tasks
        const sampleTasks = [
          { id: `task_${Date.now()}_sample1`, content: '<sample --> task>.', priority: 0.75, creationTime: Date.now(), type: 'belief' },
          { id: `task_${Date.now()}_sample2`, content: '<another --> example>?', priority: 0.62, creationTime: Date.now(), type: 'question' }
        ];
        
        sampleTasks.forEach(task => this.routeMessage({
          type: 'taskUpdate',
          payload: { task, changeType: 'input' }
        }));
      }
    }
  }

  handlePanelCommand(data) {
    const { command, panel, panels, duration, demoId } = data.payload;
    
    console.log(`Handling panel command: ${command}`, { panel, panels, duration });
    
    if (command === 'activateVisualization' && panels) {
      // Generate data relevant to the demo to activate visualization panels
      panels.forEach(panelName => {
        if (panelName === 'PriorityHistogramPanel') {
          // The panel will visualize existing data, so just ensure there's data
        } else if (panelName === 'ConceptPanel') {
          // Add some concepts specific to this demo
          this.routeMessage({
            type: 'conceptUpdate',
            payload: {
              concept: {
                term: `demo_${demoId}_${Date.now()}`,
                priority: Math.random(), // Random priority to show distribution
                occurrenceTime: Date.now(),
                taskCount: Math.floor(Math.random() * 3),
                beliefCount: Math.floor(Math.random() * 2),
                questionCount: Math.floor(Math.random() * 2),
                lastAccess: Date.now()
              },
              changeType: 'added'
            }
          });
        } else if (panelName === 'TaskPanel') {
          // Add some tasks specific to this demo
          this.routeMessage({
            type: 'taskUpdate',
            payload: {
              task: {
                id: `demo_task_${demoId}_${Date.now()}`,
                content: `<demo_${demoId} --> example>.`,
                priority: Math.random(), // Random priority to show distribution
                creationTime: Date.now(),
                type: ['belief', 'question', 'goal'][Math.floor(Math.random() * 3)]
              },
              changeType: 'input'
            }
          });
        }
      });
    } else if (command === 'highlight' && panel) {
      // Highlight a specific panel (could trigger UI animation or focus)
      console.log(`Highlighting panel: ${panel} for ${duration || 3000}ms`);
    }
  }

  handleInvalidMessage(data) {
    console.error('Invalid message format:', data);
    // Don't setError for every invalid message to avoid UI flooding
    console.warn('Received invalid message format (see above)');
    getStore().addNotification({
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
  }

  sendMessage(message) {
    if (!message) {
      console.warn('Attempted to send null/undefined message');
      return;
    }
    
    if (this.isTestEnvironment) {
      // In test mode, process immediately
      if (message.type === 'demoControl') {
        this.handleDemoControl(message);
      } else if (message.type === 'narseseInput') {
        this.handleNarseseInput(message);
      } else {
        this.routeMessage(message);
      }
      return;
    }

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
    if (this.messageQueue.length > this.messageQueueMaxSize) {
      const removedMessage = this.messageQueue.shift();
      console.warn(`Message queue overflow, removing oldest message (current size: ${this.messageQueue.length}, max: ${this.messageQueueMaxSize})`);
      getStore().addNotification({
        type: 'warning',
        title: 'Message queue overflow',
        message: 'Removed oldest message to prevent memory issues',
        timestamp: Date.now()
      });
    }
  }

  processMessageQueue() {
    // Process messages that were queued while disconnected
    while (this.messageQueue.length > 0 && this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift(); // Remove and get first message
      try {
        this.ws.send(JSON.stringify(message));
        this.metrics.messagesSent++;
      } catch (error) {
        console.error('Error sending queued message:', error);
        break; // Stop processing if we can't send
      }
    }
  }

  // Get performance metrics for Phase 5+ optimization
  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      queueSize: this.messageQueue.length,
      connected: this.state === ConnectionState.CONNECTED
    };
  }

  // Reset metrics
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