/**
 * REPL Core Functionality for SeNARS
 * Handles WebSocket communication and REPL interactions
 */
import WebSocketClient from '../shared/ws.js';

class REPLCore {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionManager = window.sessionManager;
    this.websocket = null;
    
    // Get session elements
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }
    
    this.inputElement = session.input;
    this.outputElement = session.output;
    this.statusElement = session.status;
    
    // Initialize WebSocket
    this.initWebSocket();
    
    // Bind events
    this.bindEvents();
  }
  
  /**
   * Initialize WebSocket connection
   */
  initWebSocket() {
    // Initialize WebSocket client
    this.websocket = new WebSocketClient('ws://localhost:8080/nar', this.sessionId);
    
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
    this.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.submitInput();
      }
    });
    
    // Handle submit button click
    const submitButton = this.inputElement.parentElement.querySelector('.submit-btn');
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
    
    // Clear input
    this.inputElement.value = '';
    
    // Add input line to output
    this.addOutputLine({ type: 'input', text: inputText });
    
    // Send input to server
    this.websocket.send({
      sessionId: this.sessionId,
      type: 'input',
      payload: { text: inputText }
    });
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
      
      switch (message.type) {
        case 'output':
          this.handleOutput(message.payload);
          break;
        case 'status':
          this.handleStatus(message.payload);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  /**
   * Handle output messages
   * @param {Object} payload - Output payload
   */
  handleOutput(payload) {
    if (payload.lines && Array.isArray(payload.lines)) {
      payload.lines.forEach(line => {
        this.addOutputLine(line);
      });
    }
  }
  
  /**
   * Handle status messages
   * @param {Object} payload - Status payload
   */
  handleStatus(payload) {
    // Update status display with cycles, memory, etc.
    console.log(`Session ${this.sessionId} status:`, payload);
  }
  
  /**
   * Add a line to the output display
   * @param {Object} line - Line object with text and optional metadata
   */
  addOutputLine(line) {
    const lineElement = document.createElement('div');
    lineElement.className = 'output-line';
    
    if (line.type === 'input') {
      lineElement.classList.add('input-line');
      lineElement.textContent = `${this.sessionId}> ${line.text}`;
    } else {
      // Apply punctuation styling if available
      if (line.punctuation) {
        const punctClass = this.getPunctuationClass(line.punctuation);
        lineElement.classList.add(punctClass);
      }
      lineElement.textContent = line.text || '';
    }
    
    this.outputElement.appendChild(lineElement);
    
    // Scroll to bottom
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }
  
  /**
   * Get CSS class for punctuation type
   * @param {string} punctuation - Punctuation character
   * @returns {string} CSS class name
   */
  getPunctuationClass(punctuation) {
    const punctMap = {
      '.': 'punct-statement',
      '?': 'punct-question',
      '!': 'punct-goal',
      '@': 'punct-achievement'
    };
    
    return punctMap[punctuation] || 'punct-achievement';
  }
  
  /**
   * Set connection status
   * @param {string} status - Connection status ('connected', 'disconnected', 'error')
   */
  setStatus(status) {
    this.statusElement.setAttribute('data-status', status);
    
    const statusColors = {
      'connected': 'var(--status-connected)',
      'disconnected': 'var(--status-disconnected)',
      'processing': 'var(--status-processing)'
    };
    
    this.statusElement.style.color = statusColors[status] || 'var(--text-secondary)';
  }
  
  /**
   * Close the REPL session
   */
  close() {
    if (this.websocket) {
      this.websocket.close();
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
              if (!window.sessionManager[`repl-${sessionId}`]) {
                window.sessionManager[`repl-${sessionId}`] = new REPLCore(sessionId);
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