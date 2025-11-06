/**
 * REPL Core Functionality for SeNARS
 * Handles WebSocket communication and REPL interactions
 */
import WebSocketClient from '../shared/ws.js';
import { addOutputLine, addStructuredOutputLine, getCurrentCellGroup, createCellGroup } from '../src/utils/cellRenderer.js';

class REPLCore {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionManager = window.sessionManager;
    this.websocket = null;
    
    // Get session elements
    const session = this.sessionManager?.getSession(sessionId) ?? null;
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }
    
    this.inputElement = session.input;
    this.outputElement = session.output;
    this.statusElement = session.status;
    
    // History navigation position
    this.historyPosition = -1;
    
    // Initialize WebSocket
    this.initWebSocket();
    
    // Create reasoner controls
    this.createReasonerControls();
    
    // Bind events
    this.bindEvents();
  }
  
  /**
   * Create reasoner control buttons
   */
  createReasonerControls() {
    const session = this.sessionManager?.getSession(this.sessionId);
    if (!session?.element || !session?.input) return;
    
    const controlsContainer = this.createControlsContainer();
    
    // Insert controls before input area
    const inputParent = session.input.parentElement;
    if (session.element.insertBefore && inputParent) {
      session.element.insertBefore(controlsContainer, inputParent);
    } else {
      // Fallback: append to session element
      session.element.appendChild(controlsContainer);
    }
  }
  
  /**
   * Creates the controls container with all buttons
   * @returns {HTMLElement} Controls container
   */
  createControlsContainer() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'reasoner-controls';
    
    const buttons = [
      { className: 'control-btn start-btn', text: 'Start', command: 'start' },
      { className: 'control-btn stop-btn', text: 'Stop', command: 'stop' },
      { className: 'control-btn step-btn', text: 'Step', command: 'step' }
    ];
    
    buttons.forEach(({ className, text, command }) => {
      const button = document.createElement('button');
      button.className = className;
      button.textContent = text;
      button.addEventListener('click', () => this.sendControlCommand(command));
      controlsContainer.appendChild(button);
    });
    
    return controlsContainer;
  }
  
  /**
   * Send control command to server
   * @param {string} command - Control command (start, stop, step)
   */
  sendControlCommand(command) {
    this.websocket?.send({
      sessionId: this.sessionId,
      type: `control/${command}`,
      payload: {}
    });
  }
  
  /**
   * Initialize WebSocket connection
   */
  initWebSocket() {
    // Initialize WebSocket client with session-specific URL
    this.websocket = new WebSocketClient(`ws://localhost:8080/nar?session=${this.sessionId}`, this.sessionId);
    
    // Set up event handlers
    this.websocket.onopen = () => {
      this.setStatus('connected');
      console.log(`WebSocket connected for session ${this.sessionId}`);
    };
    
    this.websocket.onclose = () => {
      this.setStatus('disconnected');
      console.log(`WebSocket disconnected for session ${this.sessionId}`);
    };
    
    this.websocket.onerror = (error) => {
      this.setStatus('error');
      console.error(`WebSocket error for session ${this.sessionId}:`, error);
    };
    
    this.websocket.onmessage = (event) => {
      this.handleMessage(event);
    };
  }
  
  /**
   * Bind UI events
   */
  bindEvents() {
    // Handle input submission
    this.handleInputKeydown = (event) => {
      if (event.key === 'ArrowUp') {
        this.navigateHistory(-1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        this.navigateHistory(1);
        event.preventDefault();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.submitInput();
      }
    };
    this.inputElement.addEventListener('keydown', this.handleInputKeydown);
    
    // Handle submit button click
    const submitButton = this.inputElement.parentElement?.querySelector('.submit-btn');
    if (submitButton) {
      submitButton.addEventListener('click', () => this.submitInput());
    }
  }
  
  /**
   * Submit input to the REPL
   */
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // Check for commands
    if (inputText.startsWith('/')) {
      this.handleCommand(inputText);
      return;
    }
    
    // Clear input
    this.inputElement.value = '';
    
    // Add input line to output
    this.addOutputLine({ type: 'input', text: inputText });
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // Send input to server
    this.websocket.send({
      sessionId: this.sessionId,
      type: 'reason/step',
      payload: { text: inputText }
    });
  }
  
  /**
   * Handle command input
   * @param {string} command - Command string
   */
  handleCommand(command) {
    const [cmd, ...args] = command.substring(1).split(' ');
    
    // Clear input
    this.inputElement.value = '';
    
    const validCommands = ['start', 'stop', 'step'];
    const sessionManager = window.sessionManager;
    
    if (validCommands.includes(cmd)) {
      this.sendControlCommand(cmd);
    } else {
      this.handleSpecialCommand(cmd, sessionManager);
    }
  }
  
  /**
   * Handle special commands that interact with session manager
   * @param {string} cmd - Command to handle
   * @param {Object} sessionManager - Reference to session manager
   */
  handleSpecialCommand(cmd, sessionManager) {
    switch (cmd) {
      case 'agents':
        sessionManager?.createAgentHUD?.();
        break;
      case 'hide-agents':
        sessionManager?.hideAgentHUD?.();
        break;
      default:
        this.addOutputLine({
          type: 'error',
          text: `Unknown command: ${cmd}. Available commands: /start, /stop, /step, /agents`
        });
        break;
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {Event} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Only process messages for this session
      if (message.sessionId !== this.sessionId) return;
      
      this.routeMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  /**
   * Route message to appropriate handler
   * @param {Object} message - Parsed message object
   */
  routeMessage(message) {
    const handlers = {
      'output': (payload) => this.handleOutput(payload),
      'status': (payload) => this.handleStatus(payload),
      'reason/output': (payload) => this.handleReasonOutput(payload)
    };
    
    const handler = handlers[message.type];
    if (handler) {
      handler(message.payload);
    } else {
      console.warn('Unknown message type:', message.type);
    }
  }
  
  /**
   * Handle output messages
   * @param {Object} payload - Output payload
   */
  handleOutput(payload) {
    this.processOutputLines(payload?.lines || []);
  }
  
  /**
   * Handle reasoner output messages
   * @param {Object} payload - Reasoner output payload
   */
  handleReasonOutput(payload) {
    this.processOutputLines(payload?.lines || []);
  }
  
  /**
   * Process an array of output lines
   * @param {Array} lines - Array of output lines
   */
  processOutputLines(lines) {
    if (!Array.isArray(lines)) return;
    
    lines.forEach(line => {
      this.addStructuredOutputLine(line);
      
      // Add output cell to history
      this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    });
  }
  
  /**
   * Handle status messages
   * @param {Object} payload - Status payload
   */
  handleStatus(payload) {
    // Update status display with cycles, memory, etc.
    console.log(`Session ${this.sessionId} status:`, payload);
    
    // Update agent card in HUD if it exists
    const sessionManager = window.sessionManager;
    if (sessionManager?.updateAgentCard) {
      sessionManager.updateAgentCard(this.sessionId, {
        cycles: payload?.cycles ?? 0,
        memory: payload?.memory ?? '0MB',
        state: payload?.state ?? 'idle',
        status: this.getStatusFromPayload(payload)
      });
    }
  }
  
  /**
   * Get status from payload
   * @param {Object} payload - Status payload
   * @returns {string} Status string
   */
  getStatusFromPayload(payload) {
    // Determine status based on payload
    const state = payload?.state;
    switch (state) {
      case 'running':
        return 'processing';
      case 'stopped':
      case 'error':
        return 'disconnected';
      default:
        return 'connected';
    }
  }
  
  /**
   * Add a line to the output display
   * @param {Object} line - Line object with text and optional metadata
   */
  addOutputLine(line) {
    addOutputLine(this.outputElement, this.sessionId, line);
  }
  
  /**
   * Navigate through command history
   * @param {number} direction - Direction to navigate (-1 for up, 1 for down)
   */
  navigateHistory(direction) {
    // Reset position if we're not currently navigating
    if (this.historyPosition === -1) {
      this.historyPosition = this.sessionManager.sessionHistories[this.sessionId]?.length ?? 0;
    }
    
    // Calculate new position
    const newPosition = this.historyPosition + direction;
    
    // Get history for this session
    const history = this.sessionManager.sessionHistories[this.sessionId] || [];
    
    // Check bounds
    if (newPosition >= 0 && newPosition <= history.length) {
      this.historyPosition = newPosition;
      
      // If at the end (new entry position), clear input
      if (this.historyPosition === history.length) {
        this.inputElement.value = '';
      } else {
        // Otherwise, set input to history item
        const cell = history[this.historyPosition];
        if (cell?.type === 'input') {
          this.inputElement.value = cell.content;
        }
      }
    }
  }
  
  /**
   * Add a structured line to the output display
   * @param {Object} line - Line object with text and optional metadata
   */
  addStructuredOutputLine(line) {
    addStructuredOutputLine(this.outputElement, line);
  }
  
  /**
   * Set connection status
   * @param {string} status - Connection status ('connected', 'disconnected', 'error')
   */
  setStatus(status) {
    this.statusElement.setAttribute('data-status', status);
    
    // Update session manager status
    this.sessionManager?.updateSessionStatus?.(this.sessionId, status);
    
    const statusColors = {
      'connected': 'var(--status-connected)',
      'disconnected': 'var(--status-disconnected)',
      'error': 'var(--status-error)',
      'processing': 'var(--status-processing)'
    };
    
    this.statusElement.style.color = statusColors[status] || 'var(--text-secondary)';
  }
  
  getCurrentCellGroup() {
    return getCurrentCellGroup(this.outputElement);
  }
  
  createCellGroup() {
    const cellGroup = createCellGroup();
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
  
  /**
   * Close the REPL session
   */
  close() {
    this.websocket?.close();
    
    // Clean up event listeners
    if (this.inputElement) {
      this.inputElement.removeEventListener('keydown', this.handleInputKeydown);
    }
  }
}

// Initialize REPL cores for existing sessions
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for session manager to initialize
  setTimeout(() => {
    if (window.sessionManager) {
      // Initialize REPL core for main session
      new REPLCore('main');
      
      // Listen for new sessions
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-session-id')) {
              const sessionId = node.getAttribute('data-session-id');
              // Don't re-initialize existing sessions
              const replKey = `repl-${sessionId}`;
              if (!window.sessionManager[replKey]) {
                window.sessionManager[replKey] = new REPLCore(sessionId);
              }
            }
          });
        });
      });
      
      const container = document.getElementById('session-container');
      if (container) {
        observer.observe(container, { childList: true });
      }
    }
  }, 100);
});

export default REPLCore;