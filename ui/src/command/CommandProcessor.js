import { Config } from '../config/Config.js';

/**
 * CommandProcessor handles command sending and history management
 */
export class CommandProcessor {
  constructor(webSocketManager, logger) {
    this.webSocketManager = webSocketManager;
    this.logger = logger;
    this.history = [];
    this.maxHistorySize = Config.getConstants().MAX_HISTORY_SIZE;
  }

  /**
   * Process and send a command
   */
  processCommand(command, isDebug = false) {
    if (!command?.trim()) return false;

    command = command.trim();

    // Add to history
    this._addToHistory(command);

    // Log the command
    this.logger.log(`> ${command}`, 'input', '⌨️');

    // Handle debug commands locally if they start with /
    if (command.startsWith('/')) {
      this._processDebugCommand(command);
      return true;
    }

    // Send via WebSocket
    if (this.webSocketManager.isConnected()) {
      this.webSocketManager.sendMessage('narseseInput', { input: command });
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

    switch(cmd) {
      case '/help':
        this._showHelp();
        break;
      case '/state':
        this._showState();
        break;
      case '/nodes':
        this._listNodes();
        break;
      case '/tasks':
        this._listTasks();
        break;
      case '/concepts':
        this._listConcepts();
        break;
      case '/refresh':
        this.webSocketManager.sendMessage('control/refresh', {});
        this.logger.log('Graph refresh requested', 'info', '🔄');
        break;
      case '/clear':
        this.logger.clearLogs();
        break;
      default:
        this.logger.log(`Unknown debug command: ${command}. Type /help for available commands.`, 'warning', '⚠️');
    }
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
  _listNodes(graphManager) {
    if (!graphManager || !graphManager.cy) {
      this.logger.log('Graph not initialized', 'error', '❌');
      return;
    }

    const nodeCount = graphManager.getNodeCount();
    this.logger.log(`Graph has ${nodeCount} nodes`, 'info', '🌐');
    
    const allNodes = graphManager.cy.nodes();
    allNodes.forEach(node => {
      this.logger.log(`Node: ${node.data('label')} (ID: ${node.id()})`, 'info', '📍');
    });
  }

  /**
   * List task nodes
   */
  _listTasks(graphManager) {
    if (!graphManager || !graphManager.cy) {
      this.logger.log('Graph not initialized', 'error', '❌');
      return;
    }

    const taskNodes = graphManager.getTaskNodes();
    this.logger.log(`Found ${taskNodes?.length || 0} task nodes`, 'info', '📋');
    
    taskNodes?.forEach(node => {
      this.logger.log(`Task: ${node.data('label')}`, 'task', '📋');
    });
  }

  /**
   * List concept nodes
   */
  _listConcepts(graphManager) {
    if (!graphManager || !graphManager.cy) {
      this.logger.log('Graph not initialized', 'error', '❌');
      return;
    }

    const conceptNodes = graphManager.getConceptNodes();
    this.logger.log(`Found ${conceptNodes?.length || 0} concept nodes`, 'info', '🧠');
    
    conceptNodes?.forEach(node => {
      this.logger.log(`Concept: ${node.data('label')}`, 'concept', '🧠');
    });
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