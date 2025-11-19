/**
 * UIElements module to initialize and store DOM element references
 */
export class UIElements {
  constructor() {
    this.elements = this._initializeElements();
  }

  /**
   * Initialize all DOM elements
   */
  _initializeElements() {
    return {
      statusIndicator: document.getElementById('status-indicator'),
      connectionStatus: document.getElementById('connection-status'),
      messageCount: document.getElementById('message-count'),
      logsContainer: document.getElementById('logs-container'),
      commandInput: document.getElementById('command-input'),
      sendButton: document.getElementById('send-button'),
      quickCommands: document.getElementById('quick-commands'),
      execQuick: document.getElementById('exec-quick'),
      showHistory: document.getElementById('show-history'),
      clearLogs: document.getElementById('clear-logs'),
      refreshGraph: document.getElementById('refresh-graph'),
      toggleLive: document.getElementById('toggle-live'),
      demoSelect: document.getElementById('demo-select'),
      runDemo: document.getElementById('run-demo'),
      graphDetails: document.getElementById('graph-details'),
      graphContainer: document.getElementById('graph-container'),
      notificationContainer: document.getElementById('notification-container')
    };
  }

  /**
   * Get a specific element by key
   */
  get(key) {
    return this.elements[key] || null;
  }

  /**
   * Get all elements
   */
  getAll() {
    return this.elements;
  }

  /**
   * Check if all required elements are present
   */
  isValid() {
    const requiredElements = [
      'statusIndicator', 'connectionStatus', 'messageCount', 'logsContainer',
      'commandInput', 'sendButton', 'graphContainer'
    ];
    
    return requiredElements.every(key => this.elements[key] !== null);
  }
}