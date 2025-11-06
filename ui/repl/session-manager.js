/**
 * Session Manager for SeNARS REPL
 * Handles creation, destruction, and management of REPL sessions
 */
import { generateId } from '../src/utils/helpers.js';
import { createCellElement, createCellGroup, getCurrentCellGroup, addOutputLine, addStructuredOutputLine } from '../src/utils/cellRenderer.js';
import * as dataProcessor from '../src/utils/dataProcessor.js';
import { groupRelatedItems } from '../src/utils/groupUtils.js';
import { createDataDisplayElement, createDataSummary } from '../src/utils/displayUtils.js';

class SessionManager {
  constructor() {
    this.activeSessions = {};
    this.sessionHistories = {}; // New: Store history per session
    this.container = document.getElementById('session-container');
    this.selector = document.getElementById('session-selector');
    
    // Bind events
    this.bindEvents();
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
    
    // Auto-create main session
    this.createSession('main');
  }
  
  // New: Create cell structure
  createCell(sessionId, type, content) {
    return {
      id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: Date.now(),
      sessionId,
      pinned: false // New: Add pinned property
    };
  }
  
  // New: Add cell to session history
  addCellToHistory(sessionId, type, content) {
    if (!this.sessionHistories[sessionId]) {
      this.sessionHistories[sessionId] = [];
    }
    
    const cell = this.createCell(sessionId, type, content);
    this.sessionHistories[sessionId].push(cell);
    
    // Cap at 500 cells, but keep pinned cells
    if (this.sessionHistories[sessionId].length > 500) {
      // Find the first unpinned cell to remove
      const firstUnpinnedIndex = this.sessionHistories[sessionId].findIndex(cell => !cell.pinned);
      if (firstUnpinnedIndex !== -1) {
        this.sessionHistories[sessionId].splice(firstUnpinnedIndex, 1);
      } else {
        // If all cells are pinned, remove the oldest pinned cell
        this.sessionHistories[sessionId].shift();
      }
    }
    
    // Persist to sessionStorage
    this.persistSessionHistory(sessionId);
  }
  
  // New: Persist session history to sessionStorage
  persistSessionHistory(sessionId) {
    try {
      const history = this.sessionHistories[sessionId] || [];
      sessionStorage.setItem(`nars-history-${sessionId}`, JSON.stringify(history));
    } catch (error) {
      console.warn(`Failed to persist history for session ${sessionId}:`, error);
    }
  }
  
  // New: Load session history from sessionStorage
  loadSessionHistory(sessionId) {
    try {
      const historyStr = sessionStorage.getItem(`nars-history-${sessionId}`);
      if (historyStr) {
        this.sessionHistories[sessionId] = JSON.parse(historyStr);
      } else {
        this.sessionHistories[sessionId] = [];
      }
    } catch (error) {
      console.warn(`Failed to load history for session ${sessionId}:`, error);
      this.sessionHistories[sessionId] = [];
    }
  }
  
  persistAllHistories() {
    Object.keys(this.activeSessions).forEach(sessionId => {
      this.persistSessionHistory(sessionId);
    });
  }
  
  loadAllHistories() {
    // Load histories for existing sessions
    Object.keys(this.activeSessions).forEach(sessionId => {
      this.loadSessionHistory(sessionId);
      this.renderHistory(sessionId);
    });
  }
  
  renderHistory(sessionId) {
    // Render history for a session
    const session = this.activeSessions[sessionId];
    if (!session || !this.sessionHistories[sessionId]) return;
    
    // Clear existing content
    session.output.innerHTML = '';
    
    // Get history for this session
    const history = this.sessionHistories[sessionId];
    
    // For better performance with large histories, implement virtual scrolling
    // Only render what's visible in the viewport plus a buffer
    this.setupVirtualScrolling(sessionId, history);
  }
  
  /**
   * Set up virtual scrolling for a session's history
   * @param {string} sessionId - Session identifier
   * @param {Array} history - History array to render
   */
  setupVirtualScrolling(sessionId, history) {
    const session = this.activeSessions[sessionId];
    if (!session) return;
    
    // Store history reference for this session
    session.history = history;
    session.visibleCells = new Map(); // Track rendered cells
    session.cellCache = new Map(); // Cache for cell elements
    
    // Set up scroll event listener
    session.output.addEventListener('scroll', () => {
      this.handleScroll(sessionId);
    });
    
    // Initial render
    this.handleScroll(sessionId);
  }
  
  /**
   * Clear session history
   * @param {string} sessionId - Session identifier
   */
  clearSessionHistory(sessionId) {
    if (this.sessionHistories[sessionId]) {
      // Keep pinned cells when clearing history
      this.sessionHistories[sessionId] = this.sessionHistories[sessionId].filter(cell => cell.pinned);
      this.persistSessionHistory(sessionId);
      this.renderHistory(sessionId);
    }
  }
  
  /**
   * Handle scroll events and update visible cells
   * @param {string} sessionId - Session identifier
   */
  handleScroll(sessionId) {
    const session = this.activeSessions[sessionId];
    if (!session || !session.history) return;
    
    const outputElement = session.output;
    const history = session.history;
    
    // Get viewport dimensions
    const scrollTop = outputElement.scrollTop;
    const viewportHeight = outputElement.clientHeight;
    const rowHeight = 24; // Approximate height of a cell row
    
    // Calculate visible range with buffer
    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 10);
    const endIdx = Math.min(
      history.length - 1,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + 10
    );
    
    // Update visible cells
    this.updateVisibleCells(sessionId, startIdx, endIdx);
  }
  
  /**
   * Update visible cells in the viewport
   * @param {string} sessionId - Session identifier
   * @param {number} startIdx - Start index of visible range
   * @param {number} endIdx - End index of visible range
   */
  updateVisibleCells(sessionId, startIdx, endIdx) {
    const session = this.activeSessions[sessionId];
    if (!session || !session.history) return;
    
    const history = session.history;
    const visibleCells = session.visibleCells;
    const cellCache = session.cellCache;
    
    // Create a set of indices that should be visible
    const shouldBeVisible = new Set();
    for (let i = startIdx; i <= endIdx; i++) {
      shouldBeVisible.add(i);
    }
    
    // Remove cells that are no longer visible
    for (const [index, cellElement] of visibleCells.entries()) {
      if (!shouldBeVisible.has(index)) {
        cellElement.remove();
        visibleCells.delete(index);
      }
    }
    
    // Add new cells that should be visible
    for (let i = startIdx; i <= endIdx; i++) {
      if (!visibleCells.has(i) && history[i]) {
        // Check if cell is already in cache
        let cellElement = cellCache.get(i);
        if (!cellElement) {
          // Create new cell element if not in cache
          cellElement = this.createCellElement(sessionId, history[i]);
          cellCache.set(i, cellElement);
        }
        cellElement.style.position = 'absolute';
        cellElement.style.top = `${i * 24}px`; // Approximate row height
        session.output.appendChild(cellElement);
        visibleCells.set(i, cellElement);
      }
    }
  }
  
  /**
   * Pin a cell in the history
   * @param {string} sessionId - Session identifier
   * @param {string} cellId - Cell identifier
   */
  pinCell(sessionId, cellId) {
    const history = this.sessionHistories[sessionId];
    if (!history) return;
    
    const cellIndex = history.findIndex(cell => cell.id === cellId);
    if (cellIndex !== -1) {
      history[cellIndex].pinned = true;
      this.persistSessionHistory(sessionId);
    }
  }
  
  /**
   * Unpin a cell in the history
   * @param {string} sessionId - Session identifier
   * @param {string} cellId - Cell identifier
   */
  unpinCell(sessionId, cellId) {
    const history = this.sessionHistories[sessionId];
    if (!history) return;
    
    const cellIndex = history.findIndex(cell => cell.id === cellId);
    if (cellIndex !== -1) {
      history[cellIndex].pinned = false;
      this.persistSessionHistory(sessionId);
    }
  }
  
  renderCell(sessionId, cell) {
    // Render a single cell
    const session = this.activeSessions[sessionId];
    if (!session) return;
    
    // Create cell group if it doesn't exist
    let cellGroup = getCurrentCellGroup(session.output);
    if (!cellGroup) {
      cellGroup = createCellGroup();
      session.output.appendChild(cellGroup);
    }
    
    // For input cells, we still need the custom rendering with pin button
    if (cell.type === 'input') {
      // Create line element based on cell type
      const lineElement = document.createElement('div');
      lineElement.className = 'output-line';
      lineElement.classList.add('input-line');
      lineElement.textContent = `${sessionId}> ${cell.content}`;
      
      cellGroup.appendChild(lineElement);
    } else {
      // For output cells, we can use the shared function
      // But we need to adapt the cell format
      const adaptedCell = {
        text: cell.content.text || '',
        punctuation: cell.content.punctuation,
        truth: cell.content.truth,
        priority: cell.content.priority
      };
      addStructuredOutputLine(session.output, adaptedCell);
    }
  }
  
  /**
   * Create a "Send to session" menu for an output line
   * @param {string} sourceSessionId - Source session identifier
   * @param {Object} lineContent - Content to send
   * @returns {HTMLElement} Menu element
   */
  createSendToSessionMenu(sourceSessionId, lineContent) {
    const menu = document.createElement('div');
    menu.className = 'send-to-menu';
    menu.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      padding: 4px 0;
      min-width: 150px;
    `;
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'Send to...';
    title.style.cssText = `
      padding: 4px 12px;
      font-weight: bold;
      border-bottom: 1px solid var(--border-color);
    `;
    menu.appendChild(title);
    
    // Check if there are any target sessions
    const targetSessions = Object.keys(this.activeSessions).filter(id => id !== sourceSessionId);
    
    if (targetSessions.length === 0) {
      const noSessions = document.createElement('div');
      noSessions.textContent = 'No other sessions';
      noSessions.style.cssText = `
        padding: 6px 12px;
        color: var(--text-secondary);
        font-style: italic;
      `;
      menu.appendChild(noSessions);
    } else {
      // Add session options
      targetSessions.forEach(sessionId => {
        const option = document.createElement('div');
        option.textContent = sessionId;
        option.style.cssText = `
          padding: 6px 12px;
          cursor: pointer;
        `;
        
        // Add hover effect
        option.addEventListener('mouseenter', () => {
          option.style.backgroundColor = 'var(--background-secondary)';
        });
        option.addEventListener('mouseleave', () => {
          option.style.backgroundColor = 'white';
        });
        
        option.addEventListener('click', () => {
          this.sendContentToSession(sessionId, lineContent);
          menu.remove();
        });
        
        menu.appendChild(option);
      });
    }
    
    // Close menu when clicking outside
    const closeMenu = (event) => {
      if (!menu.contains(event.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
    
    return menu;
  }
  
  /**
   * Send content to a specific session
   * @param {string} targetSessionId - Target session identifier
   * @param {Object} content - Content to send
   */
  sendContentToSession(targetSessionId, content) {
    const session = this.activeSessions[targetSessionId];
    if (!session || !session.input) return;
    
    // Set the content in the target session's input field
    session.input.value = content.text || content;
    
    // Focus the input field
    session.input.focus();
  }
  
  /**
   * Filter session history by text search
   * @param {string} sessionId - Session identifier
   * @param {string} searchText - Text to search for
   * @param {boolean} useRegex - Whether to treat searchText as regex
   * @returns {Array} Filtered history
   */
  filterHistoryByText(sessionId, searchText, useRegex = false) {
    if (!searchText.trim()) {
      return this.sessionHistories[sessionId] || [];
    }
    
    const history = this.sessionHistories[sessionId] || [];
    
    if (useRegex) {
      try {
        const regex = new RegExp(searchText, 'i'); // Case insensitive
        return history.filter(cell => {
          if (cell.type === 'input') {
            return regex.test(cell.content);
          } else {
            // For output cells, search in text content
            const textContent = cell.content.text || '';
            return regex.test(textContent);
          }
        });
      } catch (e) {
        // If regex is invalid, fall back to simple text search
        console.warn('Invalid regex, falling back to text search:', e);
        const lowerSearchText = searchText.toLowerCase();
        return this.filterHistoryByContent(history, lowerSearchText, false);
      }
    } else {
      const lowerSearchText = searchText.toLowerCase();
      return this.filterHistoryByContent(history, lowerSearchText, false);
    }
  }
  
  /**
   * Filter history by content (internal helper)
   * @param {Array} history - History array to filter
   * @param {string} searchText - Text to search for
   * @param {boolean} useRegex - Whether to treat searchText as regex
   * @returns {Array} Filtered history
   */
  filterHistoryByContent(history, searchText, useRegex = false) {
    return history.filter(cell => {
      if (cell.type === 'input') {
        return useRegex ? 
          new RegExp(searchText, 'i').test(cell.content) : 
          cell.content.toLowerCase().includes(searchText);
      } else {
        // For output cells, search in text content
        const textContent = cell.content.text || '';
        return useRegex ? 
          new RegExp(searchText, 'i').test(textContent) : 
          textContent.toLowerCase().includes(searchText);
      }
    });
  }
  
  /**
   * Filter session history by type
   * @param {string} sessionId - Session identifier
   * @param {string} type - Type to filter by ('input', 'output', or 'all')
   * @returns {Array} Filtered history
   */
  filterHistoryByType(sessionId, type) {
    if (type === 'all') {
      return this.sessionHistories[sessionId] || [];
    }
    
    const history = this.sessionHistories[sessionId] || [];
    return history.filter(cell => cell.type === type);
  }
  
  /**
   * Filter session history by date range
   * @param {string} sessionId - Session identifier
   * @param {number} startDate - Start timestamp (milliseconds since epoch)
   * @param {number} endDate - End timestamp (milliseconds since epoch)
   * @returns {Array} Filtered history
   */
  filterHistoryByDateRange(sessionId, startDate, endDate) {
    const history = this.sessionHistories[sessionId] || [];
    return history.filter(cell => cell.timestamp >= startDate && cell.timestamp <= endDate);
  }
  
  /**
   * Apply combined filters to session history
   * @param {string} sessionId - Session identifier
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered history
   */
  filterHistoryCombined(sessionId, filters) {
    let history = this.sessionHistories[sessionId] || [];
    
    // Apply text filter
    if (filters.text) {
      history = this.filterHistoryByText(sessionId, filters.text, filters.useRegex);
    }
    
    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      history = history.filter(cell => cell.type === filters.type);
    }
    
    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      const startDate = filters.startDate || 0;
      const endDate = filters.endDate || Date.now();
      history = history.filter(cell => cell.timestamp >= startDate && cell.timestamp <= endDate);
    }
    
    return history;
  }
  
  /**
   * Paginate session history
   * @param {string} sessionId - Session identifier
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Number of items per page
   * @returns {Object} Paginated history with metadata
   */
  paginateHistory(sessionId, page = 1, pageSize = 50) {
    const history = this.sessionHistories[sessionId] || [];
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = history.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      page,
      pageSize,
      total: history.length,
      totalPages: Math.ceil(history.length / pageSize),
      hasNext: endIndex < history.length,
      hasPrev: startIndex > 0
    };
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
    
    // Update session dropdown
    this.updateSessionDropdown();
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
    const inputArea = this.createInputAreaElement();
    
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
   * Create input area element
   * @returns {HTMLElement} Input area element
   */
  createInputAreaElement() {
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
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
    
    // Update session dropdown
    this.updateSessionDropdown();
  }
  
  /**
   * Bind UI events
   */
  bindEvents() {
    this.setupNewSessionButton();
    // Create session selector dropdown
    this.createSessionSelector();
  }
  
  /**
   * Setup new session button
   */
  setupNewSessionButton() {
    const newSessionBtn = document.getElementById('new-session-btn');
    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', () => {
        // Generate a UUID for the new session
        const id = generateId();
        this.createSession(id);
      });
    }
  }
  
  /**
   * Create session selector dropdown
   */
  createSessionSelector() {
    const selectorContainer = this.createSelectorContainer();
    
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Sessions:';
    selectorLabel.htmlFor = 'session-dropdown';
    
    this.sessionDropdown = document.createElement('select');
    this.sessionDropdown.id = 'session-dropdown';
    
    selectorContainer.appendChild(selectorLabel);
    selectorContainer.appendChild(this.sessionDropdown);
    this.selector.appendChild(selectorContainer);
    
    // Update dropdown when sessions change
    this.updateSessionDropdown();
  }
  
  /**
   * Create selector container element
   * @returns {HTMLElement} Selector container element
   */
  createSelectorContainer() {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'session-selector-container';
    return selectorContainer;
  }
  
  /**
   * Update session dropdown with active sessions
   */
  updateSessionDropdown() {
    if (!this.sessionDropdown) return;
    
    // Clear existing options
    this.sessionDropdown.innerHTML = '';
    
    // Add options for each active session
    Object.keys(this.activeSessions).forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${id} ${this.getSessionStatusIcon(id)}`;
      this.sessionDropdown.appendChild(option);
    });
  }
  
  /**
   * Get status icon for session
   * @param {string} id - Session identifier
   * @returns {string} Status icon
   */
  getSessionStatusIcon(id) {
    const session = this.activeSessions[id];
    if (!session || !session.status) return '⏹️';
    
    const status = session.status.getAttribute('data-status');
    const statusIcons = {
      'connected': '▶️',
      'disconnected': '⏹️',
      'error': '❌'
    };
    return statusIcons[status] ?? '⏹️';
  }
  
  /**
   * Update session status
   * @param {string} id - Session identifier
   * @param {string} status - New status
   */
  updateSessionStatus(id, status) {
    const session = this.activeSessions[id];
    if (session && session.status) {
      session.status.setAttribute('data-status', status);
      // Update dropdown to reflect status change
      this.updateSessionDropdown();
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
  
  /**
   * Create agent status HUD
   */
  createAgentHUD() {
    // Remove existing HUD if present
    const existingHUD = document.querySelector('.agent-hud');
    if (existingHUD) {
      existingHUD.remove();
    }
    
    // Create HUD container
    const hud = this.createHUDContainer();
    
    // Create header
    const header = this.createHUDHeader();
    
    // Create grid for agents
    const grid = this.createAgentGrid();
    
    // Add agent cards
    Object.keys(this.activeSessions).forEach(sessionId => {
      const card = this.createAgentCard(sessionId);
      grid.appendChild(card);
    });
    
    // Create button container with action buttons
    const buttonContainer = this.createHUDButtonContainer();
    
    // Assemble HUD
    hud.appendChild(header);
    hud.appendChild(grid);
    hud.appendChild(buttonContainer);
    
    // Add to document
    document.body.appendChild(hud);
    
    // Store reference to HUD for updates
    this.agentHUD = hud;
  }
  
  /**
   * Create HUD container element
   * @returns {HTMLElement} HUD container
   */
  createHUDContainer() {
    const hud = document.createElement('div');
    hud.className = 'agent-hud';
    hud.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--background-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 500px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      padding: 20px;
      font-family: ui-monospace, monospace;
    `;
    return hud;
  }
  
  /**
   * Create HUD header element
   * @returns {HTMLElement} Header element
   */
  createHUDHeader() {
    const header = document.createElement('div');
    header.className = 'agent-hud-header';
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    `;
    
    const title = document.createElement('div');
    title.className = 'agent-hud-title';
    title.textContent = 'Agent Status Dashboard';
    title.style.cssText = `
      font-size: 1.4em;
      font-weight: bold;
      color: var(--text-primary);
    `;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'agent-hud-close';
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 1.8em;
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = 'var(--background-secondary)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent';
    });
    closeButton.addEventListener('click', () => {
      this.agentHUD?.remove();
      this.agentHUD = null;
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    return header;
  }
  
  /**
   * Create agent grid element
   * @returns {HTMLElement} Grid element
   */
  createAgentGrid() {
    const grid = document.createElement('div');
    grid.className = 'agent-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    `;
    return grid;
  }
  
  /**
   * Create HUD button container with action buttons
   * @returns {HTMLElement} Button container
   */
  createHUDButtonContainer() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    `;
    
    const networkToggle = this.createNetworkViewButton();
    const refreshButton = this.createRefreshButton();
    
    buttonContainer.appendChild(networkToggle);
    buttonContainer.appendChild(refreshButton);
    
    return buttonContainer;
  }
  
  /**
   * Create network view button
   * @returns {HTMLElement} Network view button
   */
  createNetworkViewButton() {
    const networkToggle = document.createElement('button');
    networkToggle.textContent = '🌐 Network View';
    networkToggle.className = 'network-view-toggle';
    networkToggle.style.cssText = `
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--session-main), #2980b9);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1em;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    networkToggle.addEventListener('mouseenter', () => {
      networkToggle.style.transform = 'translateY(-2px)';
      networkToggle.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    });
    networkToggle.addEventListener('mouseleave', () => {
      networkToggle.style.transform = 'translateY(0)';
      networkToggle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    networkToggle.addEventListener('click', () => this.showNetworkView());
    
    return networkToggle;
  }
  
  /**
   * Create refresh button
   * @returns {HTMLElement} Refresh button
   */
  createRefreshButton() {
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '🔄 Refresh';
    refreshButton.className = 'refresh-btn';
    refreshButton.style.cssText = `
      margin-left: 12px;
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--session-agent1), #c0392b);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1em;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    refreshButton.addEventListener('mouseenter', () => {
      refreshButton.style.transform = 'translateY(-2px)';
      refreshButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    });
    refreshButton.addEventListener('mouseleave', () => {
      refreshButton.style.transform = 'translateY(0)';
      refreshButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    refreshButton.addEventListener('click', () => this.refreshAgentHUD());
    
    return refreshButton;
  }
  
  /**
   * Create agent card for HUD
   * @param {string} sessionId - Session identifier
   * @returns {HTMLElement} Card element
   */
  createAgentCard(sessionId) {
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.setAttribute('data-session-id', sessionId);
    card.style.cssText = `
      background: var(--background-primary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;
    
    // Get session status
    const session = this.activeSessions[sessionId];
    const status = session && session.status ? session.status.getAttribute('data-status') : 'disconnected';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'agent-card-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    `;
    
    // Status indicator
    const indicator = this.createStatusIndicator(status);
    
    // Session ID
    const idElement = document.createElement('div');
    idElement.textContent = sessionId;
    idElement.className = 'agent-card-id';
    idElement.style.cssText = `
      font-weight: bold;
      flex-grow: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    
    header.appendChild(indicator);
    header.appendChild(idElement);
    
    // Stats container
    const stats = this.createStatsContainer(status);
    
    // Add border color matching session container
    const sessionColorClass = this.getSessionColorClass(sessionId);
    if (sessionColorClass) {
      card.style.borderLeft = `3px solid var(${sessionColorClass})`;
    }
    
    card.appendChild(header);
    card.appendChild(stats);
    
    return card;
  }
  
  /**
   * Create status indicator element
   * @param {string} status - Status string
   * @returns {HTMLElement} Status indicator element
   */
  createStatusIndicator(status) {
    const indicator = document.createElement('div');
    indicator.className = `agent-status-indicator ${status}`;
    indicator.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
      background-color: ${
        status === 'connected' ? '#2ecc71' :
        status === 'disconnected' ? '#e74c3c' :
        status === 'error' ? '#f39c12' : '#95a5a6'
      };
    `;
    return indicator;
  }
  
  /**
   * Create stats container element
   * @param {string} status - Status string
   * @returns {HTMLElement} Stats container element
   */
  createStatsContainer(status) {
    const stats = document.createElement('div');
    stats.className = 'agent-stats';
    stats.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;
    
    // Add placeholder stats - these would be updated with real data
    const cyclesElement = document.createElement('div');
    cyclesElement.className = 'agent-stat-item';
    cyclesElement.innerHTML = '<strong>Cycles:</strong> <span class="cycles-value">0</span>';
    cyclesElement.style.cssText = `
      font-size: 0.9em;
    `;
    
    const memoryElement = document.createElement('div');
    memoryElement.className = 'agent-stat-item';
    memoryElement.innerHTML = '<strong>Memory:</strong> <span class="memory-value">0MB</span>';
    memoryElement.style.cssText = `
      font-size: 0.9em;
    `;
    
    const stateElement = document.createElement('div');
    stateElement.className = 'agent-stat-item';
    stateElement.innerHTML = '<strong>State:</strong> <span class="state-value">' + (status || 'unknown') + '</span>';
    stateElement.style.cssText = `
      font-size: 0.9em;
      grid-column: span 2;
    `;
    
    stats.appendChild(cyclesElement);
    stats.appendChild(memoryElement);
    stats.appendChild(stateElement);
    
    return stats;
  }
  
  /**
   * Get CSS variable for session color
   * @param {string} sessionId - Session identifier
   * @returns {string} CSS variable name
   */
  getSessionColorClass(sessionId) {
    if (sessionId === 'main') {
      return '--session-main';
    }
    
    // Generate consistent color for session IDs
    const sessionColors = [
      '--session-agent1',
      '--session-agent2',
      '--session-agent3',
      '--session-agent4',
      '--session-agent5',
      '--session-agent6'
    ];
    
    // Hash the session ID to get a consistent color
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % sessionColors.length;
    return sessionColors[index];
  }
  
  /**
   * Update agent card with status information
   * @param {string} sessionId - Session identifier
   * @param {Object} statusData - Status data
   */
  updateAgentCard(sessionId, statusData) {
    const card = document.querySelector(`.agent-card[data-session-id="${sessionId}"]`);
    if (!card) return;
    
    // Update cycles
    const cyclesElement = card.querySelector('.cycles-value');
    if (cyclesElement && statusData.cycles !== undefined) {
      cyclesElement.textContent = statusData.cycles;
    }
    
    // Update memory
    const memoryElement = card.querySelector('.memory-value');
    if (memoryElement && statusData.memory !== undefined) {
      memoryElement.textContent = statusData.memory;
    }
    
    // Update state
    const stateElement = card.querySelector('.state-value');
    if (stateElement && statusData.state !== undefined) {
      stateElement.textContent = statusData.state;
    }
    
    // Update status indicator
    const indicator = card.querySelector('.agent-status-indicator');
    if (indicator && statusData.status !== undefined) {
      indicator.className = `agent-status-indicator ${statusData.status}`;
    }
  }
  
  /**
   * Refresh agent HUD with current session data
   */
  refreshAgentHUD() {
    if (!this.agentHUD) return;
    
    const grid = this.agentHUD.querySelector('.agent-grid');
    if (!grid) return;
    
    // Clear existing cards
    grid.innerHTML = '';
    
    // Add updated cards
    Object.keys(this.activeSessions).forEach(sessionId => {
      const card = this.createAgentCard(sessionId);
      grid.appendChild(card);
    });
  }
  
  /**
   * Hide agent HUD
   */
  hideAgentHUD() {
    if (this.agentHUD) {
      this.agentHUD.remove();
      this.agentHUD = null;
    }
  }
  
  /**
   * Show network view
   */
  showNetworkView() {
    // Remove existing network view if present
    const existingView = document.querySelector('.network-view');
    if (existingView) {
      existingView.remove();
    }
    
    // Create network view container
    const view = document.createElement('div');
    view.className = 'network-view';
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'network-view-content';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'network-view-header';
    
    const title = document.createElement('div');
    title.className = 'network-view-title';
    title.textContent = 'Inter-Session Belief Network';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'network-view-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => view.remove());
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create graph container
    const graph = document.createElement('div');
    graph.className = 'network-graph';
    graph.style.cssText = `
      width: 100%;
      height: calc(100% - 50px);
      position: relative;
    `;
    
    // Create network visualization
    const networkData = this.createNetworkVisualizationData();
    
    // Process data using dataProcessor utilities
    const processedData = this.processVisualizationData(networkData, {
      groupingStrategy: 'relationship'
    });
    
    this.renderNetworkGraph(graph, processedData);
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'network-refresh';
    refreshButton.textContent = '↻ Refresh';
    refreshButton.addEventListener('click', () => {
      // Clear existing graph
      graph.innerHTML = '';
      // Recreate network visualization
      const newData = this.createNetworkVisualizationData();
      const newProcessedData = this.processVisualizationData(newData, {
        groupingStrategy: 'relationship'
      });
      this.renderNetworkGraph(graph, newProcessedData);
    });
    
    header.appendChild(refreshButton);
    
    // Assemble view
    content.appendChild(header);
    content.appendChild(graph);
    view.appendChild(content);
    
    // Add to document
    document.body.appendChild(view);
  }
  
  /**
   * Hide network view
   */
  hideNetworkView() {
    const networkView = document.querySelector('.network-view');
    if (networkView) {
      networkView.remove();
    }
  }
  
  /**
   * Render network graph
   * @param {HTMLElement} container - Container element
   * @param {Object} data - Network data
   */
  renderNetworkGraph(container, data) {
    // Clear container
    container.innerHTML = '';
    
    // Create a more sophisticated network visualization with force-directed layout
    const graphContainer = this.createGraphContainer();
    
    // Create canvas for drawing
    const canvas = this.createCanvas(container);
    graphContainer.appendChild(canvas);
    
    // Draw network on canvas with force-directed layout
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Initialize node positions with physics
      const nodes = this.initializeNodePositions(data.nodes, canvas);
      
      // Animate with physics
      this.animateNetworkGraph(ctx, nodes, data.edges, canvas);
    }
    
    // Add legend
    const legend = this.createNetworkLegend();
    graphContainer.appendChild(legend);
    container.appendChild(graphContainer);
  }
  
  /**
   * Create graph container element
   * @returns {HTMLElement} Graph container
   */
  createGraphContainer() {
    const graphContainer = document.createElement('div');
    graphContainer.className = 'network-graph-container';
    graphContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background-color: var(--background-secondary);
      border-radius: 4px;
      overflow: hidden;
    `;
    return graphContainer;
  }
  
  /**
   * Create canvas element for network graph
   * @param {HTMLElement} container - Container element
   * @returns {HTMLCanvasElement} Canvas element
   */
  createCanvas(container) {
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth || 600;
    canvas.height = container.clientHeight || 400;
    return canvas;
  }
  
  /**
   * Initialize node positions with physics
   * @param {Array} nodes - Array of node objects
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @returns {Array} Initialized node positions
   */
  initializeNodePositions(nodes, canvas) {
    return nodes.map(node => ({
      ...node,
      x: node.x || Math.random() * canvas.width,
      y: node.y || Math.random() * canvas.height,
      vx: 0,
      vy: 0
    }));
  }
  
  /**
   * Animate the network graph with physics simulation
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  animateNetworkGraph(ctx, nodes, edges, canvas) {
    // Animation variables
    let animationId = null;
    const nodeRadius = 25;
    
    // Physics simulation parameters
    const repulsion = 1500; // Increased repulsion force between nodes
    const attraction = 0.02; // Increased attraction force along edges
    const damping = 0.85; // Velocity damping factor
    const centerForce = 0.002; // Force toward center
    
    // Physics simulation
    const simulatePhysics = () => {
      // Reset forces
      nodes.forEach(node => {
        node.vx = 0;
        node.vy = 0;
      });
      
      // Calculate repulsive forces between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Minimum distance to prevent extreme forces
          const minDistance = 20;
          if (distance > minDistance) {
            const force = repulsion / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            nodeA.vx += fx;
            nodeA.vy += fy;
            nodeB.vx -= fx;
            nodeB.vy -= fy;
          }
        }
      }
      
      // Calculate attractive forces along edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = attraction * distance;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            sourceNode.vx += fx;
            sourceNode.vy += fy;
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        }
      });
      
      // Apply center force
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * centerForce;
        node.vy += dy * centerForce;
      });
      
      // Update positions
      nodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        
        // Boundary constraints with padding
        const padding = nodeRadius + 10;
        node.x = Math.max(padding, Math.min(canvas.width - padding, node.x));
        node.y = Math.max(padding, Math.min(canvas.height - padding, node.y));
      });
    };
    
    // Render function
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw edges with gradient based on strength
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const gradient = ctx.createLinearGradient(
            sourceNode.x, sourceNode.y,
            targetNode.x, targetNode.y
          );
          
          // Color based on edge strength
          const strength = edge.size || 1;
          if (strength > 2) {
            gradient.addColorStop(0, '#2ecc71'); // Strong connection
            gradient.addColorStop(1, '#3498db');
          } else if (strength > 1) {
            gradient.addColorStop(0, '#f39c12'); // Medium connection
            gradient.addColorStop(1, '#e67e22');
          } else {
            gradient.addColorStop(0, '#e74c3c'); // Weak connection
            gradient.addColorStop(1, '#c0392b');
          }
          
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = Math.max(1, strength);
          ctx.stroke();
        }
      });
      
      // Draw nodes with hover effect
      nodes.forEach(node => {
        // Draw outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius + 3, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, nodeRadius,
          node.x, node.y, nodeRadius + 3
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Draw main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#666';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label with background
        const label = node.label || '';
        ctx.font = 'bold 12px Arial';
        const textWidth = ctx.measureText(label).width;
        
        // Background for label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          node.x - textWidth/2 - 4,
          node.y - nodeRadius - 16,
          textWidth + 8,
          16
        );
        
        // Label text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y - nodeRadius - 8);
        
        // Draw additional info if available
        if (node.beliefs || node.cycles) {
          const info = `${node.beliefs || 0} beliefs`;
          ctx.font = '10px Arial';
          const infoWidth = ctx.measureText(info).width;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(
            node.x - infoWidth/2 - 4,
            node.y + nodeRadius + 2,
            infoWidth + 8,
            14
          );
          
          ctx.fillStyle = '#fff';
          ctx.fillText(info, node.x, node.y + nodeRadius + 9);
        }
      });
    };
    
    // Animation loop
    const animate = () => {
      simulatePhysics();
      render();
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Clean up on container removal
    const cleanup = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
    
    // Set up cleanup when container is removed
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node === graph?.parentElement || node.contains?.(graph)) {
            cleanup();
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  /**
   * Create network legend element
   * @returns {HTMLElement} Legend element
   */
  createNetworkLegend() {
    const legend = document.createElement('div');
    legend.className = 'network-legend';
    legend.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 4px;
      padding: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      font-size: 12px;
    `;
    
    legend.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Legend</div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 20px; height: 3px; background: linear-gradient(to right, #2ecc71, #3498db); margin-right: 5px;"></div>
        <span>Strong connection</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 20px; height: 2px; background: linear-gradient(to right, #f39c12, #e67e22); margin-right: 5px;"></div>
        <span>Medium connection</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 20px; height: 1px; background: linear-gradient(to right, #e74c3c, #c0392b); margin-right: 5px;"></div>
        <span>Weak connection</span>
      </div>
    `;
    
    return legend;
  }
  
  /**
   * Process data for visualization using dataProcessor utilities
   * @param {Array} data - Data to process
   * @param {Object} options - Processing options
   * @returns {Array} Processed data
   */
  processVisualizationData(data, options = {}) {
    // Use dataProcessor utilities if available
    try {
      // Apply filters if provided and dataProcessor is available
      if (dataProcessor.processDataWithFilters && options.filters) {
        data = dataProcessor.processDataWithFilters(data, options.filters);
      }
      
      // Group related items if requested and dataProcessor is available
      if (groupRelatedItems && options.groupingStrategy) {
        data = groupRelatedItems(data, options.groupingStrategy);
      }
    } catch (error) {
      console.warn('Could not process visualization data with dataProcessor, using fallback:', error);
      // Fallback to local implementation
      if (options.groupingStrategy) {
        data = this.groupRelatedItems(data, options.groupingStrategy);
      }
    }
    
    return data;
  }
  
  /**
   * Group related items using groupUtils
   * @param {Array} items - Items to group
   * @param {string} groupingStrategy - Grouping strategy
   * @returns {Array} Grouped items
   */
  groupRelatedItems(items, groupingStrategy = 'timestamp') {
    const groupingStrategies = {
      timestamp: (items) => {
        const groupedByTime = new Map();
        items.forEach(item => {
          const timestamp = item.timestamp || item.creationTime || Date.now();
          const interval = Math.floor(timestamp / 10000);
          if (!groupedByTime.has(interval)) {
            groupedByTime.set(interval, []);
          }
          groupedByTime.get(interval).push(item);
        });
        return Array.from(groupedByTime.values()).flat();
      },
      type: (items) => {
        const groupedByType = new Map();
        items.forEach(item => {
          const type = item.type || 'unknown';
          if (!groupedByType.has(type)) {
            groupedByType.set(type, []);
          }
          groupedByType.get(type).push(item);
        });
        return Array.from(groupedByType.values()).flat();
      },
      relationship: (items) => items
    };
    
    return groupingStrategies[groupingStrategy]?.(items) ?? items;
  }
  
  /**
   * Create network visualization data
   * @returns {Object} Network data with nodes and edges
   */
  createNetworkVisualizationData() {
    const nodes = [];
    const edges = [];
    
    // Create nodes for each session
    const sessionIds = Object.keys(this.activeSessions);
    const centerX = 300;
    const centerY = 200;
    const radius = 150;
    
    sessionIds.forEach((sessionId, index) => {
      // Position nodes in a circle
      const angle = (index / sessionIds.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      nodes.push({
        id: sessionId,
        label: sessionId,
        color: this.getSessionColor(sessionId),
        size: 20,
        x: x,
        y: y
      });
    });
    
    // Create edges based on belief propagation
    // In a real implementation, this would be based on actual belief relationships
    // For now, we'll create a more structured set of connections
    for (let i = 0; i < sessionIds.length; i++) {
      for (let j = i + 1; j < sessionIds.length; j++) {
        // Create edges with varying strengths
        const strength = Math.random();
        if (strength > 0.3) { // 70% chance of connection
          edges.push({
            id: `edge-${sessionIds[i]}-${sessionIds[j]}`,
            source: sessionIds[i],
            target: sessionIds[j],
            label: 'belief propagation',
            size: strength * 3 + 1
          });
        }
      }
    }
    
    // Process data using dataProcessor utilities
    const processedData = this.processVisualizationData({ nodes, edges }, {
      groupingStrategy: 'relationship'
    });
    
    return processedData;
  }
  
  /**
   * Get session color based on session ID
   * @param {string} sessionId - Session identifier
   * @returns {string} Color string
   */
  getSessionColor(sessionId) {
    if (sessionId === 'main') {
      return '#3498db'; // --session-main
    }
    
    // Generate consistent color for session IDs
    const sessionColors = [
      '#e74c3c', // --session-agent1
      '#9b59b6', // --session-agent2
      '#1abc9c', // --session-agent3
      '#f39c12', // --session-agent4
      '#34495e', // --session-agent5
      '#2ecc71'  // --session-agent6
    ];
    
    // Hash the session ID to get a consistent color
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % sessionColors.length;
    return sessionColors[index];
  }
}

// Initialize session manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.sessionManager = new SessionManager();
});

export default SessionManager;