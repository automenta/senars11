import { UIElements } from './ui/UIElements.js';
import { WebSocketManager } from './connection/WebSocketManager.js';
import { GraphManager } from './visualization/GraphManager.js';
import { Logger } from './logging/Logger.js';
import { CommandProcessor } from './command/CommandProcessor.js';
import { DemoManager } from './demo/DemoManager.js';
import { UIEventHandlers } from './ui/UIEventHandlers.js';

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
    // Update message count display
    if (this.uiElements.get('messageCount')) {
      const currentCount = parseInt(this.uiElements.get('messageCount').textContent) || 0;
      this.uiElements.get('messageCount').textContent = currentCount + 1;
    }

    // Process message with appropriate handler
    const { content, type, icon } = this._getMessageInfo(message);

    this.logger.addLogEntry(content, type, icon);

    // Update graph for relevant events
    this.graphManager.updateFromMessage(message);
  }

  /**
   * Get message content, type, and icon based on message type
   */
  _getMessageInfo(message) {
    // Define message handlers in a lookup table for better organization
    const messageHandlers = {
      'narsese.result': (msg) => {
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
      },
      'narsese.error': (msg) => ({
        content: msg.payload?.error || msg.payload?.message || 'Narsese processing error',
        type: 'error',
        icon: '❌'
      }),
      'task.added': (msg) => this._createTaskMessage(msg),
      'task.input': (msg) => this._createTaskMessage(msg),
      'concept.created': (msg) => this._createConceptMessage(msg),
      'concept.updated': (msg) => this._createConceptMessage(msg),
      'concept.added': (msg) => this._createConceptMessage(msg),
      'question.answered': (msg) => ({
        content: msg.payload?.answer || msg.payload?.question || JSON.stringify(msg.payload),
        type: 'info',
        icon: '❓'
      }),
      'reasoning.derivation': (msg) => ({
        content: msg.payload?.derivation || msg.payload?.step || JSON.stringify(msg.payload),
        type: 'info',
        icon: '🔍'
      }),
      'reasoning.step': (msg) => ({
        content: msg.payload?.derivation || msg.payload?.step || JSON.stringify(msg.payload),
        type: 'info',
        icon: '🔍'
      }),
      'error': (msg) => this._createErrorMessage(msg),
      'error.message': (msg) => this._createErrorMessage(msg),
      'connection': (msg) => ({
        content: msg.payload?.message || msg.data?.message || 'Connected to server',
        type: 'info',
        icon: '🌐'
      }),
      'memorySnapshot': (msg) => {
        this.graphManager.updateFromSnapshot(msg.payload);
        return {
          content: `Memory snapshot received: ${msg.payload?.concepts?.length || 0} concepts`,
          type: 'info',
          icon: '📊'
        };
      },
      'info': (msg) => ({
        content: msg.payload?.message || JSON.stringify(msg.payload),
        type: 'info',
        icon: 'ℹ️'
      }),
      'log': (msg) => ({
        content: msg.payload?.message || JSON.stringify(msg.payload),
        type: 'info',
        icon: 'ℹ️'
      }),
      'control.result': (msg) => ({
        content: msg.payload?.result || msg.payload?.message || 'Control command executed',
        type: 'info',
        icon: '⚙️'
      })
    };

    // Get handler for message type or use default
    const handler = messageHandlers[message.type] || this._createDefaultMessage;

    if (typeof handler === 'function') {
      return handler(message);
    } else {
      return this._createDefaultMessage(message);
    }
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

  /**
   * Update connection status display
   */
  _updateStatus(status) {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    if (this.uiElements.get('connectionStatus')) {
      this.uiElements.get('connectionStatus').textContent = statusText;
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