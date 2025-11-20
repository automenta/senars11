/**
 * UIElements module to initialize and store DOM element references
 */
export class UIElements {
  constructor(elementIds = null) {
    this.elements = this._initializeElements(elementIds);
  }

  /**
   * Initialize all DOM elements
   */
  _initializeElements(elementIds = null) {
    // Default element IDs if none provided
    const defaultIds = {
      statusIndicator: 'status-indicator',
      connectionStatus: 'connection-status',
      messageCount: 'message-count',
      logsContainer: 'logs-container',
      commandInput: 'command-input',
      sendButton: 'send-button',
      quickCommands: 'quick-commands',
      execQuick: 'exec-quick',
      showHistory: 'show-history',
      clearLogs: 'clear-logs',
      refreshGraph: 'refresh-graph',
      toggleLive: 'toggle-live',
      demoSelect: 'demo-select',
      runDemo: 'run-demo',
      graphDetails: 'graph-details',
      graphContainer: 'graph-container',
      notificationContainer: 'notification-container'
    };

    const ids = elementIds ?? defaultIds;

    // Use Object.fromEntries and map for cleaner transformation
    return Object.fromEntries(
      Object.entries(ids).map(([key, id]) => [key, document.getElementById(id)])
    );
  }

  /**
   * Get a specific element by key
   */
  get(key) {
    return this.elements[key] ?? null;
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
  isValid(requiredKeys = null) {
    const requiredElements = requiredKeys ?? [
      'statusIndicator', 'connectionStatus', 'messageCount', 'logsContainer',
      'commandInput', 'sendButton', 'graphContainer'
    ];

    return requiredElements.every(key => this.elements[key] !== null);
  }

  /**
   * Bulk get multiple elements by keys
   */
  getMultiple(keys) {
    return keys.reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {});
  }
}