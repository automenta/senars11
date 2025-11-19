import { UIElements } from './ui/UIElements.js';
import { WebSocketManager } from './connection/WebSocketManager.js';
import { GraphManager } from './visualization/GraphManager.js';
import { Logger } from './logging/Logger.js';
import { CommandProcessor } from './command/CommandProcessor.js';
import { DemoManager } from './demo/DemoManager.js';
import { UIEventHandlers } from './ui/UIEventHandlers.js';

/**
 * Message Handler class to process different message types
 */
class MessageHandler {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.handlers = this._initializeHandlers();
  }

  /**
   * Initialize message handlers lookup table
   */
  _initializeHandlers() {
    return {
      'narsese.result': this._handleNarseseResult.bind(this),
      'narsese.error': this._handleNarseseError.bind(this),
      'task.added': this._createTaskMessage.bind(this),
      'task.input': this._createTaskMessage.bind(this),
      'concept.created': this._createConceptMessage.bind(this),
      'concept.updated': this._createConceptMessage.bind(this),
      'concept.added': this._createConceptMessage.bind(this),
      'question.answered': this._handleQuestionAnswered.bind(this),
      'reasoning.derivation': this._handleReasoningDerivation.bind(this),
      'reasoning.step': this._handleReasoningStep.bind(this),
      'error': this._createErrorMessage.bind(this),
      'error.message': this._createErrorMessage.bind(this),
      'connection': this._handleConnection.bind(this),
      'memorySnapshot': this._handleMemorySnapshot.bind(this),
      'info': this._handleInfo.bind(this),
      'log': this._handleLog.bind(this),
      'control.result': this._handleControlResult.bind(this)
    };
  }

  /**
   * Process a message and return content, type, and icon
   */
  processMessage(message) {
    const handler = this.handlers[message.type] || this._createDefaultMessage.bind(this);
    return typeof handler === 'function' ? handler(message) : this._createDefaultMessage(message);
  }

  /**
   * Handle narsese result messages
   */
  _handleNarseseResult(msg) {
    const payload = msg.payload || {};
    if (payload.result && payload.result.startsWith('✅')) {
      return { content: payload.result, type: 'success', icon: '✅' };
    } else if (payload.result && payload.result.startsWith('❌')) {
      return { content: payload.result, type: 'error', icon: '❌' };
    } else if (payload.success === true) {
      return {
        content: payload.result || payload.message || 'Command processed',
        type: 'success',
        icon: '✅'
      };
    } else {
      return {
        content: payload.result || payload.message || 'Command processed',
        type: 'info',
        icon: '✅'
      };
    }
  }

  /**
   * Handle narsese error messages
   */
  _handleNarseseError(msg) {
    return {
      content: msg.payload?.error || msg.payload?.message || 'Narsese processing error',
      type: 'error',
      icon: '❌'
    };
  }

  /**
   * Handle question answered messages
   */
  _handleQuestionAnswered(msg) {
    return {
      content: msg.payload?.answer || msg.payload?.question || JSON.stringify(msg.payload),
      type: 'info',
      icon: '❓'
    };
  }

  /**
   * Handle reasoning derivation messages
   */
  _handleReasoningDerivation(msg) {
    return {
      content: msg.payload?.derivation || msg.payload?.step || JSON.stringify(msg.payload),
      type: 'info',
      icon: '🔍'
    };
  }

  /**
   * Handle reasoning step messages
   */
  _handleReasoningStep(msg) {
    return {
      content: msg.payload?.derivation || msg.payload?.step || JSON.stringify(msg.payload),
      type: 'info',
      icon: '🔍'
    };
  }

  /**
   * Handle connection messages
   */
  _handleConnection(msg) {
    return {
      content: msg.payload?.message || msg.data?.message || 'Connected to server',
      type: 'info',
      icon: '🌐'
    };
  }

  /**
   * Handle memory snapshot messages
   */
  _handleMemorySnapshot(msg) {
    this.graphManager.updateFromSnapshot(msg.payload);
    return {
      content: `Memory snapshot received: ${msg.payload?.concepts?.length || 0} concepts`,
      type: 'info',
      icon: '📊'
    };
  }

  /**
   * Handle info messages
   */
  _handleInfo(msg) {
    return {
      content: msg.payload?.message || JSON.stringify(msg.payload),
      type: 'info',
      icon: 'ℹ️'
    };
  }

  /**
   * Handle log messages
   */
  _handleLog(msg) {
    return {
      content: msg.payload?.message || JSON.stringify(msg.payload),
      type: 'info',
      icon: 'ℹ️'
    };
  }

  /**
   * Handle control result messages
   */
  _handleControlResult(msg) {
    return {
      content: msg.payload?.result || msg.payload?.message || 'Control command executed',
      type: 'info',
      icon: '⚙️'
    };
  }

  /**
   * Create a task-related message
   */
  _createTaskMessage(message) {
    return {
      content: message.payload?.task || message.payload?.input || JSON.stringify(message.payload),
      type: 'task',
      icon: '📥'
    };
  }

  /**
   * Create a concept-related message
   */
  _createConceptMessage(message) {
    return {
      content: message.payload?.concept || message.payload?.term || JSON.stringify(message.payload),
      type: 'concept',
      icon: '🧠'
    };
  }

  /**
   * Create an error message
   */
  _createErrorMessage(message) {
    return {
      content: message.payload?.message || message.payload?.error || JSON.stringify(message.payload),
      type: 'error',
      icon: '🚨'
    };
  }

  /**
   * Create a default message for unknown types
   */
  _createDefaultMessage(message) {
    return {
      content: `${message.type}: ${JSON.stringify(message.payload || message.data || message)}`,
      type: 'info',
      icon: '📝'
    };
  }
}

/**
 * Main SeNARS UI Application class - orchestrator that combines all modules
 */
export class SeNARSUI {
  constructor() {
    this.uiElements = new UIElements();

    // Initialize core modules
    this.logger = new Logger();
    this.webSocketManager = new WebSocketManager();
    this.graphManager = new GraphManager(this.uiElements.getAll());
    this.commandProcessor = new CommandProcessor(this.webSocketManager, this.logger, this.graphManager);
    this.demoManager = new DemoManager(this.commandProcessor, this.logger);
    this.uiEventHandlers = new UIEventHandlers(
      this.uiElements,
      this.commandProcessor,
      this.demoManager,
      this.graphManager,
      this.webSocketManager
    );

    // Initialize message handler
    this.messageHandler = new MessageHandler(this.graphManager);

    // Set logger UI elements
    this.logger.setUIElements(this.uiElements.getAll());

    // Initialize the application
    this.initialize();
  }

  /**
   * Initialize the application
   */
  initialize() {
    // Initialize graph
    this.graphManager.initialize();

    // Setup UI event listeners
    this.uiEventHandlers.setupEventListeners();

    // Setup WebSocket message handlers
    this._setupWebSocketHandlers();

    // Connect to WebSocket
    this.webSocketManager.connect();

    // Add initial log entry
    this.logger.addLogEntry('SeNARS UI2 - Ready', 'info', '🚀');
  }

  /**
   * Setup WebSocket message handlers
   */
  _setupWebSocketHandlers() {
    // Subscribe to general messages
    this.webSocketManager.subscribe('*', (message) => {
      this._handleMessage(message);
    });

    // Subscribe to connection status changes
    this.webSocketManager.subscribe('connection.status', (status) => {
      this._updateStatus(status);
    });
  }

  /**
   * Handle incoming messages
   */
  _handleMessage(message) {
    try {
      // Update message count display
      const messageCountElement = this.uiElements.get('messageCount');
      if (messageCountElement) {
        const currentCount = parseInt(messageCountElement.textContent) || 0;
        messageCountElement.textContent = currentCount + 1;
      }

      // Process message with appropriate handler
      const { content, type, icon } = this.messageHandler.processMessage(message);

      this.logger.addLogEntry(content, type, icon);

      // Update graph for relevant events
      this.graphManager.updateFromMessage(message);
    } catch (error) {
      console.error('Error handling message:', error, message);
    }
  }

  /**
   * Update connection status display
   */
  _updateStatus(status) {
    const connectionStatusElement = this.uiElements.get('connectionStatus');
    if (connectionStatusElement) {
      const statusText = status.charAt(0).toUpperCase() + status.slice(1);
      connectionStatusElement.textContent = statusText;
    }

    // Update indicator class
    const indicator = this.uiElements.get('statusIndicator');
    if (indicator) {
      indicator.className = 'status-indicator';
      indicator.classList.add(`status-${status}`);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SeNARSUI();
});