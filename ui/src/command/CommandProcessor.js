import { Config } from '../config/Config.js';

/**
 * CommandProcessor handles command sending and history management
 */
export class CommandProcessor {
  constructor(webSocketManager, logger, graphManager = null) {
    this.webSocketManager = webSocketManager;
    this.logger = logger;
    this.graphManager = graphManager;
    this.history = [];
    this.maxHistorySize = Config.getConstants().MAX_HISTORY_SIZE;
  }

  /**
   * Process and send a command
   */
  processCommand(command, isDebug = false) {
    const trimmedCommand = command?.trim();
    if (!trimmedCommand) return false;

    // Add to history
    this._addToHistory(trimmedCommand);

    // Log the command
    this.logger.log(`> ${trimmedCommand}`, 'input', '⌨️');

    // Handle debug commands locally if they start with /
    if (trimmedCommand.startsWith('/')) {
      this._processDebugCommand(trimmedCommand);
      return true;
    }

    // Send via WebSocket
    if (this.webSocketManager.isConnected()) {
      this.webSocketManager.sendMessage('narseseInput', { input: trimmedCommand });
      return true;
    } else {
      this.logger.log(`Cannot send: Not connected`, 'error', '❌');
      return false;
    }
  }

  /**
   * Process a debug command
   */
  _processDebugCommand(command) {
    const cmd = command.toLowerCase();

    // Define command handlers in a lookup table
    const debugCommands = {
      '/help': () => this._showHelp(),
      '/state': () => this._showState(),
      '/nodes': () => this._listNodes(),
      '/tasks': () => this._listTasks(),
      '/concepts': () => this._listConcepts(),
      '/refresh': () => this._requestRefresh(),
      '/clear': () => this.logger.clearLogs()
    };

    // Execute the command or show unknown command message
    const handler = debugCommands[cmd];
    handler
      ? handler()
      : this.logger.log(`Unknown debug command: ${command}. Type /help for available commands.`, 'warning', '⚠️');
  }

  /**
   * Helper method for refreshing graph
   */
  _requestRefresh() {
    this.webSocketManager.sendMessage('control/refresh', {});
    this.logger.log('Graph refresh requested', 'info', '🔄');
  }

  /**
   * Show help information
   */
  _showHelp() {
    this.logger.log('Available debug commands:', 'info', '💡');
    this.logger.log('/help - Show this help', 'info', 'ℹ️');
    this.logger.log('/state - Show connection and state info', 'info', 'ℹ️');
    this.logger.log('/nodes - List all nodes in graph', 'info', 'ℹ️');
    this.logger.log('/tasks - Show task nodes', 'info', 'ℹ️');
    this.logger.log('/concepts - Show concept nodes', 'info', 'ℹ️');
    this.logger.log('/refresh - Request graph refresh', 'info', 'ℹ️');
    this.logger.log('/clear - Clear log messages', 'info', 'ℹ️');
  }

  /**
   * Show state information
   */
  _showState() {
    this.logger.log(`Connection: ${this.webSocketManager.getConnectionStatus()}`, 'info', '📡');
    this.logger.log(`Command History: ${this.history.length} commands`, 'info', '📜');
  }

  /**
   * List all nodes
   */
  _listNodes() {
    if (!this._validateGraphManager()) return;

    const nodeCount = this.graphManager.getNodeCount();
    this.logger.log(`Graph has ${nodeCount} nodes`, 'info', '🌐');

    const allNodes = this.graphManager.cy.nodes();
    allNodes.forEach(node => {
      try {
        const label = node.data('label') || 'unnamed';
        const id = node.id() || 'no-id';
        this.logger.log(`Node: ${label} (ID: ${id})`, 'info', '📍');
      } catch (error) {
        this.logger.log(`Error getting node data: ${error.message}`, 'error', '❌');
      }
    });
  }

  /**
   * List task nodes
   */
  _listTasks() {
    if (!this._validateGraphManager()) return;

    try {
      const taskNodes = this.graphManager.getTaskNodes();
      this.logger.log(`Found ${taskNodes?.length || 0} task nodes`, 'info', '📋');

      taskNodes?.forEach(node => {
        try {
          const label = node.data('label') || 'unnamed task';
          this.logger.log(`Task: ${label}`, 'task', '📋');
        } catch (error) {
          this.logger.log(`Error getting task node data: ${error.message}`, 'error', '❌');
        }
      });
    } catch (error) {
      this.logger.log(`Error listing task nodes: ${error.message}`, 'error', '❌');
    }
  }

  /**
   * List concept nodes
   */
  _listConcepts() {
    if (!this._validateGraphManager()) return;

    try {
      const conceptNodes = this.graphManager.getConceptNodes();
      this.logger.log(`Found ${conceptNodes?.length || 0} concept nodes`, 'info', '🧠');

      conceptNodes?.forEach(node => {
        try {
          const label = node.data('label') || 'unnamed concept';
          this.logger.log(`Concept: ${label}`, 'concept', '🧠');
        } catch (error) {
          this.logger.log(`Error getting concept node data: ${error.message}`, 'error', '❌');
        }
      });
    } catch (error) {
      this.logger.log(`Error listing concept nodes: ${error.message}`, 'error', '❌');
    }
  }

  /**
   * Validate that graph manager and cy are available
   */
  _validateGraphManager() {
    if (!this.graphManager || !this.graphManager.cy) {
      this.logger.log('Graph not initialized', 'error', '❌');
      return false;
    }
    return true;
  }

  /**
   * Add command to history
   */
  _addToHistory(command) {
    const entry = {
      command: command,
      timestamp: new Date(),
      status: 'sent'
    };

    this.history.push(entry);

    // Maintain max history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get command history
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Execute a control command
   */
  executeControlCommand(type, payload = {}) {
    this.webSocketManager.sendMessage(type, payload);
  }

  /**
   * Execute a refresh command
   */
  executeRefresh() {
    this.executeControlCommand('control/refresh', {});
    this.logger.log('Graph refresh requested', 'info', '🔄');
  }

  /**
   * Execute a toggle live command
   */
  executeToggleLive() {
    this.executeControlCommand('control/toggleLive', {});
  }
}