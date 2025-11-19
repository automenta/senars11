/**
 * UIEventHandlers module to handle all UI events and connect UI to business logic
 */
export class UIEventHandlers {
  constructor(uiElements, commandProcessor, demoManager, graphManager, webSocketManager) {
    this.uiElements = uiElements;
    this.commandProcessor = commandProcessor;
    this.demoManager = demoManager;
    this.graphManager = graphManager;
    this.webSocketManager = webSocketManager;
    this._eventHandlers = new Map();
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Define event configuration using a declarative approach
    const eventConfig = [
      // Command input events
      { element: 'sendButton', event: 'click', handler: () => this._handleCommandSubmit() },
      { element: 'commandInput', event: 'keypress', handler: (e) => this._handleCommandKeyPress(e) },

      // Quick command events
      { element: 'execQuick', event: 'click', handler: () => this._handleQuickCommand() },

      // History button
      { element: 'showHistory', event: 'click', handler: () => this._showCommandHistory() },

      // Clear logs button
      { element: 'clearLogs', event: 'click', handler: () => this.commandProcessor.processCommand('/clear') },

      // Graph controls
      { element: 'refreshGraph', event: 'click', handler: () => this.commandProcessor.executeRefresh() },
      { element: 'toggleLive', event: 'click', handler: () => this._handleToggleLive() },

      // Demo events
      { element: 'runDemo', event: 'click', handler: () => this._handleRunDemo() }
    ];

    // Apply all event configurations
    eventConfig.forEach(config => {
      this._attachEventHandler(config);
    });
  }

  /**
   * Attach a single event handler based on configuration
   */
  _attachEventHandler({ element, event, handler }) {
    const elementRef = this.uiElements.get(element);
    if (elementRef) {
      elementRef.addEventListener(event, handler);
      // Store reference for potential cleanup
      this._eventHandlers.set(`${element}-${event}`, { element: elementRef, event, handler });
    } else {
      console.warn(`UI element not found: ${element}`);
    }
  }

  /**
   * Remove all attached event handlers
   */
  removeEventListeners() {
    for (const [key, { element: elementRef, event, handler }] of this._eventHandlers) {
      elementRef.removeEventListener(event, handler);
    }
    this._eventHandlers.clear();
  }

  /**
   * Handle command submission
   */
  _handleCommandSubmit() {
    try {
      const command = this.uiElements.get('commandInput')?.value?.trim();
      if (command) {
        this.commandProcessor.processCommand(command);
        this.uiElements.get('commandInput').value = '';
      }
    } catch (error) {
      console.error('Error processing command:', error);
    }
  }

  /**
   * Handle command key press (Enter key)
   */
  _handleCommandKeyPress(e) {
    if (e.key === 'Enter') {
      this._handleCommandSubmit();
    }
  }

  /**
   * Handle quick command execution
   */
  _handleQuickCommand() {
    try {
      const quickCommand = this.uiElements.get('quickCommands')?.value?.trim();
      if (quickCommand) {
        this.uiElements.get('commandInput').value = quickCommand;
        this.commandProcessor.processCommand(quickCommand);
      }
    } catch (error) {
      console.error('Error executing quick command:', error);
    }
  }

  /**
   * Handle toggle live button
   */
  _handleToggleLive() {
    try {
      this.commandProcessor.executeToggleLive();
      // Toggle button text
      const button = this.uiElements.get('toggleLive');
      if (button) {
        button.textContent = button.textContent === 'Pause Live' ? 'Resume Live' : 'Pause Live';
      }
    } catch (error) {
      console.error('Error toggling live mode:', error);
    }
  }

  /**
   * Handle run demo button
   */
  _handleRunDemo() {
    try {
      const demoName = this.uiElements.get('demoSelect')?.value;
      if (demoName) {
        this.demoManager.runDemo(demoName);
      }
    } catch (error) {
      console.error('Error running demo:', error);
    }
  }

  /**
   * Show command history
   */
  _showCommandHistory() {
    const history = this.commandProcessor.getHistory();

    if (history.length === 0) {
      this.commandProcessor.logger.log('No commands in history', 'info', '📋');
      return;
    }

    this.commandProcessor.logger.log(`Command History (${history.length} commands):`, 'info', '📋');

    history.forEach((entry, i) => {
      const status = entry.status === 'error' ? '❌' : '✅';
      this.commandProcessor.logger.log(`${status} [${i + 1}] ${entry.command}`, 'debug', '📜');
    });
  }
}