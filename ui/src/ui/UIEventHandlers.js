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
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Command input events
    this._setupCommandInputEvents();
    
    // Quick command events
    this._setupQuickCommandEvents();
    
    // History button
    this._setupHistoryEvents();
    
    // Clear logs button
    this._setupClearLogsEvents();
    
    // Graph controls
    this._setupGraphControlEvents();
    
    // Demo events
    this._setupDemoEvents();
  }

  /**
   * Setup command input events
   */
  _setupCommandInputEvents() {
    this.uiElements.get('sendButton').addEventListener('click', () => {
      const command = this.uiElements.get('commandInput').value;
      this.commandProcessor.processCommand(command);
      this.uiElements.get('commandInput').value = '';
    });

    this.uiElements.get('commandInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const command = this.uiElements.get('commandInput').value;
        this.commandProcessor.processCommand(command);
        this.uiElements.get('commandInput').value = '';
      }
    });
  }

  /**
   * Setup quick command events
   */
  _setupQuickCommandEvents() {
    this.uiElements.get('execQuick').addEventListener('click', () => {
      const quickCommand = this.uiElements.get('quickCommands').value;
      if (quickCommand) {
        this.uiElements.get('commandInput').value = quickCommand;
        this.commandProcessor.processCommand(quickCommand);
      }
    });
  }

  /**
   * Setup history events
   */
  _setupHistoryEvents() {
    this.uiElements.get('showHistory').addEventListener('click', () => {
      this._showCommandHistory();
    });
  }

  /**
   * Setup clear logs events
   */
  _setupClearLogsEvents() {
    this.uiElements.get('clearLogs').addEventListener('click', () => {
      this.commandProcessor.processCommand('/clear');
    });
  }

  /**
   * Setup graph control events
   */
  _setupGraphControlEvents() {
    this.uiElements.get('refreshGraph').addEventListener('click', () => {
      this.commandProcessor.executeRefresh();
    });

    this.uiElements.get('toggleLive').addEventListener('click', () => {
      this.commandProcessor.executeToggleLive();
      // Toggle button text
      const button = this.uiElements.get('toggleLive');
      button.textContent = button.textContent === 'Pause Live' ? 'Resume Live' : 'Pause Live';
    });
  }

  /**
   * Setup demo events
   */
  _setupDemoEvents() {
    this.uiElements.get('runDemo').addEventListener('click', () => {
      const demoName = this.uiElements.get('demoSelect').value;
      this.demoManager.runDemo(demoName);
    });
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