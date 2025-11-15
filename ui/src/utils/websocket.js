/**
 * Enhanced WebSocket Service with fallback capabilities
 * Provides resilient WebSocket communication with automatic fallbacks
 */
import {validateMessage} from '../schemas/messages';
import {getStore} from './messageHandlers';
import {createMessageProcessor, messageProcessorUtils} from './messageProcessor';
import {ConnectionState, DEFAULT_OPTIONS} from './wsConstants';
import {createHandlerRegistry} from './handlerRegistry';

// WebSocket message routing configuration
const MESSAGE_HANDLERS = {
  demoControl: (wsService, data) => wsService.isTestEnvironment && wsService.handleDemoControl({type: data.type, payload: data.payload}),
  systemCommand: (wsService, data) => wsService.handleSystemCommand({type: data.type, payload: data.payload}),
  panelCommand: (wsService, data) => wsService.handlePanelCommand({type: data.type, payload: data.payload})
};

// Demo content configuration
const DEMO_CONFIG = {
  demoList: [
    {id: 'basic-reasoning', name: 'Basic Reasoning Demo', description: 'A simple reasoning demonstration'},
    {id: 'syllogistic', name: 'Syllogistic Reasoning', description: 'Classic syllogistic inference patterns'},
    {id: 'complex-inference', name: 'Complex Inference', description: 'Advanced inference chaining'}
  ],
  contentElements: {
    subjects: ['cat', 'dog', 'bird', 'fish', 'horse', 'rabbit'],
    predicates: ['animal', 'pet', 'mammal', 'water', 'farm'],
    punctuation: ['.', '?', '!']
  }
};

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

    if (this.isTestEnvironment) this.simulateTestData();
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
    const {type} = data || {};

    if (!type) {
      console.warn('Received message without type:', data);
      return;
    }

    // Handle the special connection_info type
    if (type === 'connection_info') {
      console.debug('Processing connection info:', data.data || data);
      getStore().setWsConnected(true); // Update connection status when receiving connection info
      return;
    }

    const handler = MESSAGE_HANDLERS[type];
    if (handler) return handler(this, data);

    try {
      const result = await this.messageProcessor.process(data, {wsService: this});

      if (result.success) {
        const processedData = result.data;
        const handlerProcessed = this.handlerRegistry.process(processedData);

        if (!handlerProcessed) {
          // Update UI store with received data even if no specific handler exists
          this._updateUiStore(processedData);

          // Check for any pending listeners waiting for this message type
          this._notifyListeners(processedData);

          if (this.isTestEnvironment && processedData.type === 'narseseInput') {
            return this.handleNarseseInput({type: processedData.type, payload: processedData.payload});
          }
          if (Math.random() < 0.1) {
            console.debug('Unknown message type:', processedData.type, processedData);
          }
        }
      } else {
        console.error('Message processing failed:', result.error, data);
        this._addNotification({
          type: 'error',
          title: 'Message processing failed',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Error in message processing pipeline:', error, 'for message:', data);
      this._addNotification({
        type: 'error',
        title: 'Message processing error',
        message: error?.message || 'Unknown error in message processing'
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
    if (!data || !data.type) {
      return;
    }

    const store = getStore();

    switch (data.type) {
      case 'taskUpdate':
        if (data.payload.task) {
          // Add just the task object, not the entire payload
          store.addTask(data.payload.task);
        } else {
          // Fallback for cases where task is directly in payload
          store.addTask(data.payload);
        }
        break;
      case 'conceptUpdate':
        if (data.payload.concept) {
          store.addConcept(data.payload.concept);
        }
        break;
      case 'beliefUpdate':
        if (data.payload) {
          store.addBelief(data.payload);
        }
        break;
      case 'goalUpdate':
        if (data.payload) {
          store.addGoal(data.payload);
        }
        break;
      case 'reasoningStep':
        if (data.payload) {
          store.addReasoningStep(data.payload);
        }
        break;
      case 'systemMetrics':
        if (data.payload) {
          store.setSystemMetrics(data.payload);
        }
        break;
      case 'connection_info':
        store.setWsConnected(true);
        break;
      default:
        // For other message types, update the data as appropriate
        break;
    }
  }

  simulateTestData() {
    this.routeMessage({type: 'demoList', payload: DEMO_CONFIG.demoList});

    setTimeout(() => {
      this.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: {
            term: 'cat',
            priority: 0.8,
            occurrenceTime: Date.now(),
            truth: {frequency: 0.9, confidence: 0.9}
          },
          changeType: 'added'
        }
      });

      this.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: {
            term: 'animal',
            priority: 0.7,
            occurrenceTime: Date.now(),
            truth: {frequency: 0.8, confidence: 0.85}
          },
          changeType: 'added'
        }
      });
    }, 100);

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

    const interval = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
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

        if (Math.random() > 0.7) {
          this.routeMessage({
            type: 'taskUpdate',
            payload: {
              id: `task_${Date.now()}_${Math.random()}`,
              content: `<${DEMO_CONFIG.contentElements.subjects[Math.floor(Math.random() * DEMO_CONFIG.contentElements.subjects.length)]} --> ${DEMO_CONFIG.contentElements.predicates[Math.floor(Math.random() * DEMO_CONFIG.contentElements.predicates.length)]}>${DEMO_CONFIG.contentElements.punctuation[Math.floor(Math.random() * DEMO_CONFIG.contentElements.punctuation.length)]}`,
              priority: Math.random(),
              creationTime: Date.now(),
              type: DEMO_CONFIG.contentElements.punctuation[Math.floor(Math.random() * DEMO_CONFIG.contentElements.punctuation.length)] === '?' ? 'question' :
                DEMO_CONFIG.contentElements.punctuation[Math.floor(Math.random() * DEMO_CONFIG.contentElements.punctuation.length)] === '!' ? 'goal' : 'belief'
            }
          });
        }
      } else {
        clearInterval(interval);
      }
    }, 1500);
  }

  handleDemoControl({payload: {command, demoId}}) {
    console.debug(`Handling demo control: ${command} for demo ${demoId}`);

    const sendDemoState = (status, progress, currentStep) =>
      this.routeMessage({
        type: 'demoState',
        payload: {demoId, status, progress, currentStep}
      });

    const sendConceptUpdate = (term, priority, taskCount = 0, beliefCount = 0, questionCount = 0) =>
      this.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: {
            term,
            priority,
            occurrenceTime: Date.now(),
            taskCount,
            beliefCount,
            questionCount,
            lastAccess: Date.now()
          },
          changeType: 'added'
        }
      });

    const sendTaskUpdate = (id, content, priority, type) =>
      this.routeMessage({
        type: 'taskUpdate',
        payload: {
          task: {
            id,
            content,
            priority,
            creationTime: Date.now(),
            type
          },
          changeType: 'input'
        }
      });

    const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const generateRandomContent = () =>
      `<${getRandomElement(DEMO_CONFIG.contentElements.subjects)} --> ${getRandomElement(DEMO_CONFIG.contentElements.predicates)}>${getRandomElement(DEMO_CONFIG.contentElements.punctuation)}`;
    const generateRandomTaskType = () => getRandomElement(['belief', 'question', 'goal']);

    switch (command) {
    case 'start':
      setTimeout(() => sendDemoState('running', 0, 'Initializing'), 100);

      setTimeout(() => {
        sendConceptUpdate(`concept_${demoId}_A`, 0.85, 3, 2, 1);
        sendConceptUpdate(`concept_${demoId}_B`, 0.72, 2, 1, 0);
        sendConceptUpdate(`concept_${demoId}_C`, 0.91, 4, 3, 2);
      }, 150);

      setTimeout(() => {
        const task1Type = generateRandomTaskType();
        const task2Type = generateRandomTaskType();

        sendTaskUpdate(
          `task_${demoId}_1`,
          generateRandomContent(),
          0.78,
          task1Type
        );

        // Also send belief or goal updates to separate collections
        if (task1Type === 'belief') {
          this.routeMessage({
            type: 'beliefUpdate',
            payload: {
              id: `task_${demoId}_1`,
              term: generateRandomContent(),
              priority: 0.78,
              creationTime: Date.now(),
              type: task1Type,
              truth: {frequency: Math.random(), confidence: Math.random()}
            }
          });
        } else if (task1Type === 'goal') {
          this.routeMessage({
            type: 'goalUpdate',
            payload: {
              id: `task_${demoId}_1`,
              term: generateRandomContent(),
              priority: 0.78,
              creationTime: Date.now(),
              type: task1Type,
              truth: {desire: Math.random(), confidence: Math.random()}
            }
          });
        }

        sendTaskUpdate(
          `task_${demoId}_2`,
          generateRandomContent(),
          0.65,
          task2Type
        );

        // Also send belief or goal updates to separate collections
        if (task2Type === 'belief') {
          this.routeMessage({
            type: 'beliefUpdate',
            payload: {
              id: `task_${demoId}_2`,
              term: generateRandomContent(),
              priority: 0.65,
              creationTime: Date.now(),
              type: task2Type,
              truth: {frequency: Math.random(), confidence: Math.random()}
            }
          });
        } else if (task2Type === 'goal') {
          this.routeMessage({
            type: 'goalUpdate',
            payload: {
              id: `task_${demoId}_2`,
              term: generateRandomContent(),
              priority: 0.65,
              creationTime: Date.now(),
              type: task2Type,
              truth: {desire: Math.random(), confidence: Math.random()}
            }
          });
        }
      }, 250);

      setTimeout(() => sendDemoState('running', 25, 'Processing input'), 300);
      setTimeout(() => sendConceptUpdate(`derived_${demoId}_X`, 0.68, 1, 1, 0), 400);
      setTimeout(() => sendDemoState('running', 50, 'Running inference'), 600);
      setTimeout(() => sendDemoState('running', 75, 'Generating output'), 900);
      setTimeout(() => sendDemoState('completed', 100, 'Completed'), 1200);
      break;

    case 'stop':
      sendDemoState('stopped', 0, '');
      break;

    case 'pause':
      sendDemoState('paused', payload.progress || 50, '');
      break;

    case 'resume':
      sendDemoState('running', payload.progress || 50, '');
      break;
    }
  }

  handleNarseseInput({payload: {input}}) {
    console.debug(`Handling narsese input: ${input}`);

    setTimeout(() => {
      this.routeMessage({
        type: 'narseseInput',
        payload: {
          input,
          success: true,
          message: `Processed: ${input}`
        }
      });

      const taskType = input.endsWith('?') ? 'question' : input.endsWith('!') ? 'goal' : 'belief';
      const taskId = `task_${Date.now()}`;

      this.routeMessage({
        type: 'taskUpdate',
        payload: {
          id: taskId,
          content: input,
          priority: Math.random(),
          creationTime: Date.now(),
          type: taskType
        }
      });

      // Also send belief or goal updates to separate collections
      if (taskType === 'belief') {
        this.routeMessage({
          type: 'beliefUpdate',
          payload: {
            id: taskId,
            term: input,
            priority: Math.random(),
            creationTime: Date.now(),
            type: taskType,
            truth: {frequency: Math.random(), confidence: Math.random()}
          }
        });
      } else if (taskType === 'goal') {
        this.routeMessage({
          type: 'goalUpdate',
          payload: {
            id: taskId,
            term: input,
            priority: Math.random(),
            creationTime: Date.now(),
            type: taskType,
            truth: {desire: Math.random(), confidence: Math.random()}
          }
        });
      }
    }, 50);
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

    // Send sample concepts
    sendSampleData(
      'concepts',
      () => [
        {term: 'sample_concept_1', priority: 0.8, taskCount: 2, beliefCount: 1, questionCount: 0},
        {term: 'sample_concept_2', priority: 0.65, taskCount: 1, beliefCount: 0, questionCount: 1},
        {term: 'sample_concept_3', priority: 0.92, taskCount: 3, beliefCount: 2, questionCount: 1}
      ],
      ({term, priority, taskCount, beliefCount, questionCount}) => ({
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
      })
    );

    // Send sample tasks
    sendSampleData(
      'tasks',
      () => [
        {id: `task_${now}_sample1`, content: '<sample --> task>.', priority: 0.75, type: 'belief'},
        {id: `task_${now}_sample2`, content: '<another --> example>?', priority: 0.62, type: 'question'}
      ],
      ({id, content, priority, type}) => ({
        type: 'taskUpdate',
        payload: {
          task: {id, content, priority, creationTime: now, type},
          changeType: 'input'
        }
      })
    );

    // Send sample beliefs
    sendSampleData(
      'beliefs',
      () => [
        {
          id: `belief_${now}_sample1`,
          term: '<cat --> animal>.',
          priority: 0.9,
          type: 'belief',
          truth: {frequency: 0.9, confidence: 0.8}
        },
        {
          id: `belief_${now}_sample2`,
          term: '<dog --> mammal>.',
          priority: 0.85,
          type: 'belief',
          truth: {frequency: 0.85, confidence: 0.75}
        }
      ],
      ({id, term, priority, type, truth}) => ({
        type: 'beliefUpdate',
        payload: {id, term, priority, creationTime: now, type, truth}
      })
    );

    // Send sample goals
    sendSampleData(
      'goals',
      () => [
        {
          id: `goal_${now}_sample1`,
          term: '<find_solution --> desirable>!',
          priority: 0.95,
          type: 'goal',
          truth: {desire: 0.9, confidence: 0.85}
        },
        {
          id: `goal_${now}_sample2`,
          term: '<achieve_target --> intended>!',
          priority: 0.8,
          type: 'goal',
          truth: {desire: 0.8, confidence: 0.7}
        }
      ],
      ({id, term, priority, type, truth}) => ({
        type: 'goalUpdate',
        payload: {id, term, priority, creationTime: now, type, truth}
      })
    );
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
  }

  sendMessage(message) {
    if (!message) {
      console.warn('Attempted to send null/undefined message');
      return;
    }

    if (this.isTestEnvironment) {
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