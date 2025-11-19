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
    this.commandProcessor = new CommandProcessor(this.webSocketManager, this.logger);
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

    // Determine message type and format accordingly
    let content, type, icon;

    switch (message.type) {
      case 'narsese.result':
        if (message.payload?.result && message.payload.result.startsWith('✅')) {
          content = message.payload.result;
          type = 'success';
          icon = '✅';
        } else if (message.payload?.result && message.payload.result.startsWith('❌')) {
          content = message.payload.result;
          type = 'error';
          icon = '❌';
        } else if (message.payload?.success === true) {
          content = message.payload.result || message.payload.message || 'Command processed';
          type = 'success';
          icon = '✅';
        } else {
          content = message.payload?.result || message.payload?.message || 'Command processed';
          type = 'info';
          icon = '✅';
        }
        break;
      case 'narsese.error':
        content = message.payload?.error || message.payload?.message || 'Narsese processing error';
        type = 'error';
        icon = '❌';
        break;
      case 'task.added':
      case 'task.input':
        content = message.payload?.task || message.payload?.input || JSON.stringify(message.payload);
        type = 'task';
        icon = '📥';
        break;
      case 'concept.created':
      case 'concept.updated':
      case 'concept.added':
        content = message.payload?.concept || message.payload?.term || JSON.stringify(message.payload);
        type = 'concept';
        icon = '🧠';
        break;
      case 'question.answered':
        content = message.payload?.answer || message.payload?.question || JSON.stringify(message.payload);
        type = 'info';
        icon = '❓';
        break;
      case 'reasoning.derivation':
      case 'reasoning.step':
        content = message.payload?.derivation || message.payload?.step || JSON.stringify(message.payload);
        type = 'info';
        icon = '🔍';
        break;
      case 'error':
      case 'error.message':
        content = message.payload?.message || message.payload?.error || JSON.stringify(message.payload);
        type = 'error';
        icon = '🚨';
        break;
      case 'connection':
        content = message.payload?.message || message.data?.message || 'Connected to server';
        type = 'info';
        icon = '🌐';
        break;
      case 'memorySnapshot':
        this.graphManager.updateFromSnapshot(message.payload);
        content = `Memory snapshot received: ${message.payload?.concepts?.length || 0} concepts`;
        type = 'info';
        icon = '📊';
        break;
      case 'info':
      case 'log':
        content = message.payload?.message || JSON.stringify(message.payload);
        type = 'info';
        icon = 'ℹ️';
        break;
      case 'control.result':
        content = message.payload?.result || message.payload?.message || 'Control command executed';
        type = 'info';
        icon = '⚙️';
        break;
      default:
        content = `${message.type}: ${JSON.stringify(message.payload || message.data || message)}`;
        type = 'info';
        icon = '📝';
    }

    this.logger.addLogEntry(content, type, icon);

    // Update graph for relevant events
    this.graphManager.updateFromMessage(message);
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