/**
 * Session Manager for SeNARS REPL
 * Handles creation, destruction, and management of REPL sessions
 */
class SessionManager {
  constructor() {
    this.activeSessions = {};
    this.container = document.getElementById('session-container');
    this.selector = document.getElementById('session-selector');
    
    // Bind events
    this.bindEvents();
    
    // Auto-create main session
    this.createSession('main');
  }
  
  /**
   * Create a new session with the given ID
   * @param {string} id - Session identifier
   */
  createSession(id) {
    // Check if session already exists
    if (this.activeSessions[id]) {
      console.warn(`Session ${id} already exists`);
      return;
    }
    
    // Create session container
    const sessionElement = document.createElement('div');
    sessionElement.className = 'session';
    sessionElement.setAttribute('data-session-id', id);
    
    // Add session header with close button
    const header = this.createSessionHeader(id);
    
    // Add input area
    const inputArea = this.createInputArea(id);
    
    // Add output area
    const output = document.createElement('div');
    output.className = 'output-area';
    
    // Add status indicator
    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = '●';
    
    // Assemble session element
    sessionElement.appendChild(header);
    sessionElement.appendChild(inputArea);
    sessionElement.appendChild(output);
    sessionElement.appendChild(status);
    
    // Add to container
    this.container.appendChild(sessionElement);
    
    // Register session
    this.activeSessions[id] = {
      element: sessionElement,
      input: inputArea.querySelector('.repl-input'),
      output: output,
      status: status
    };
    
    console.log(`Created session: ${id}`);
  }
  
  /**
   * Create session header with title and close button
   * @param {string} id - Session identifier
   * @returns {HTMLElement} Header element
   */
  createSessionHeader(id) {
    const header = document.createElement('div');
    header.className = 'session-header';
    
    const title = document.createElement('span');
    title.className = 'session-title';
    title.textContent = id;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-session-btn';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', `Close session ${id}`);
    closeButton.addEventListener('click', () => this.destroySession(id));
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    return header;
  }
  
  /**
   * Create input area with textarea and submit button
   * @param {string} id - Session identifier
   * @returns {HTMLElement} Input area element
   */
  createInputArea(id) {
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    
    const input = document.createElement('textarea');
    input.className = 'repl-input';
    input.placeholder = `${id}> `;
    input.rows = 1;
    
    const submitButton = document.createElement('button');
    submitButton.className = 'submit-btn';
    submitButton.textContent = 'Submit';
    
    inputArea.appendChild(input);
    inputArea.appendChild(submitButton);
    
    return inputArea;
  }
  
  /**
   * Destroy a session with the given ID
   * @param {string} id - Session identifier
   */
  destroySession(id) {
    // Skip if session doesn't exist
    if (!this.activeSessions[id]) {
      console.warn(`Session ${id} does not exist`);
      return;
    }
    
    // Remove from DOM
    const sessionElement = this.activeSessions[id].element;
    sessionElement.remove();
    
    // Clean up resources
    delete this.activeSessions[id];
    
    console.log(`Destroyed session: ${id}`);
  }
  
  /**
   * Bind UI events
   */
  bindEvents() {
    const newSessionBtn = document.getElementById('new-session-btn');
    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', () => {
        // Generate a simple session ID (in a real app, use UUID)
        const id = `session-${Date.now()}`;
        this.createSession(id);
      });
    }
  }
  
  /**
   * Get session by ID
   * @param {string} id - Session identifier
   * @returns {Object|null} Session object or null if not found
   */
  getSession(id) {
    return this.activeSessions[id] || null;
  }
}

// Initialize session manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.sessionManager = new SessionManager();
});

export default SessionManager;