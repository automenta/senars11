
### SeNARS Web UI REPL

#### **Shared Foundations Setup**
*(Complete before any phase begins)*
- [x] Create `ui/shared/ws.js` with:
    - Reusable WebSocket class accepting `url` and `sessionId` in constructor
    - Events: `onopen`, `onclose`, `onerror`, `onmessage`
    - Reconnection logic with exponential backoff
- [x] Create `ui/shared/theme.css` with:
    - CSS variables for colors (`--punct-statement: #2ecc71;`), fonts, and spacing
    - Punctuation style classes (`.punct-goal`, `.punct-question`)
- [x] Define protocol schema in `ui/shared/protocol.md`:
  ```markdown
  ## Client → Server
  { sessionId: "main", type: "input", payload: { text: "<a --> b>." } }
  { sessionId: "agent1", type: "control/start", payload: {} }

  ## Server → Client
  { sessionId: "main", type: "output", payload: { lines: [ { text: "...", punctuation: "." } ] } }
  { sessionId: "agent1", type: "status", payload: { cycles: 42, memory: "1.2MB" } }
  ```

---

### **Phase 1: Single-Session REPL Skeleton**
*Goal: Working echo REPL in one session*

#### **Infrastructure**
- [x] Create directory structure:
  ```bash
  ui/repl/
  ├── index.html
  ├── session-manager.js
  ├── repl-core.js
  ├── style.css
  └── README.md
  ```  
- [x] Scaffold `index.html` with:
    - `<div id="session-container">` (holds all REPL sessions)
    - `<div id="session-selector">` (top bar with "New Session" button)

#### **Core Functionality**
- [x] Implement `session-manager.js`:
    - `createSession(id)`: Creates DOM container with `data-session-id` attribute
    - `destroySession(id)`: Removes DOM container and cleans up resources
    - Auto-create "main" session on page load
- [x] Implement `repl-core.js` (for single session):
    - Initialize WebSocket using `shared/ws.js` with `sessionId="main"`
    - Input handler: Submit on `Enter`, ignore `Shift+Enter`
    - Output handler: Append `{ type: "echo" }` messages to DOM as `<div class="output-line">`
- [x] Style `style.css`:
    - Monospace font (`font-family: ui-monospace, monospace`)
    - Session container: `border-left: 3px solid var(--session-main)`
    - Status badge: `.status { position: absolute; top: 8px; right: 8px }`

#### **Validation**
- [x] Manual test: Type "hello" → see `. hello` output in main session
- [x] Simulate disconnect: Kill server → status badge turns red with "Disconnected"

---

### **Phase 2: Multi-Session Architecture**
*Goal: Isolated sessions with independent connections*

#### **Session Management**
- [x] Enhance `session-manager.js`:
    - Maintain `activeSessions = {}` registry (keyed by session ID)
    - "New Session" button: Generates UUID, calls `createSession()`
    - Session selector dropdown: Shows active sessions with status icons (⏹️/▶️)
    - Leverage `ui/src/utils/uuid.js` for generating unique session IDs
- [x] Update `repl-core.js`:
    - Accept `sessionId` parameter in constructor
    - Prefix all WebSocket messages with `sessionId`
    - Scope DOM elements to session container using `data-session-id`

#### **Connection Isolation**
- [x] Modify WebSocket initialization:
    - Each session creates unique connection to `ws://localhost:8080/nar?session={id}`
    - Message routing: Filter incoming messages by `sessionId` field
- [x] Add session controls:
    - Per-session close button (top-right of container)
    - Visual session separation: Unique border color per session (CSS variables)
- [x] Implement session lifecycle management using patterns from `ui/src/utils/messageProcessor.js`:
    - Add middleware for session-specific message processing
    - Implement error handling and recovery mechanisms

#### **Validation**
- [x] Create 2 sessions → type in Session A → verify no echo in Session B
- [x] Close Session A → confirm WebSocket terminates and DOM cleans up
- [x] Reload page → verify only "main" session auto-restores

---

### **Phase 3: Reasoner Integration per Session**
*Goal: Real NARS reasoning with structured output*

#### **Protocol Implementation**
- [x] Update server communication:
    - Input submission: Send `{ sessionId, type: "reason/step", payload: { text } }`
    - Handle `{ type: "reason/output" }` messages with structured data
- [x] Implement command parsing:
    - `/start` → send `{ type: "control/start" }`
    - `/stop` → send `{ type: "control/stop" }`
    - Leverage command parsing utilities from `ui/src/utils/messageHandlers.js`

#### **Session-Scoped Rendering**
- [x] Create output renderer (per session):
    - Punctuation styling: Apply `.punct-statement` class to `.` outputs
    - Truth bars: `<meter value="${truth.frequency}" min="0" max="1">`
    - Priority badges: `<span class="priority">${priority.toFixed(2)}</span>`
    - Utilize formatting functions from `ui/src/utils/formatters.js` for consistent display
- [x] Add reasoner controls:
    - Per-session toolbar with Start/Stop/Step buttons
    - Disable input field during processing (overlay spinner)
- [x] Implement structured output processing using `ui/src/utils/messageProcessor.js`:
    - Add middleware for processing different output types
    - Use handler registry pattern from `ui/src/utils/handlerRegistry.js` for different output handlers

#### **Validation**
- [x] In Session A: Type `<bird --> animal>.` → verify colored punctuation + truth bar
- [x] Run `/start` in Session A → confirm Session B remains idle
- [x] Send invalid Narsese → verify red error message with raw payload

---

### **Phase 4: Per-Session Notebook & History**
*Goal: Persistent cell-based history isolated by session*

#### **Data Model**
- [x] Define cell structure in `session-manager.js`:
  ```js
  {
    id: 'cell-1',
    type: 'input' | 'output',
    content: string | Array<{text, truth?}>,
    timestamp: Date.now(),
    sessionId: 'main',
    pinned: false
  }
  ```  
- [x] Implement history management:
    - Per-session array capped at 500 cells
    - Auto-prune oldest cell on overflow (but keep pinned cells)
    - `sessionStorage` persistence using key `nars-history-${sessionId}`
    - Leverage data processing utilities from `ui/src/utils/dataProcessor.js` for history management
- [x] Implement search and filtering for history using `ui/src/utils/filterUtils.js`:
    - Add text search capability (with regex support)
    - Add type filtering (input/output)
    - Add date range filtering
    - Add combined filters (text + type + date)

#### **UI Interactions**
- [x] Cell grouping:
    - Wrap input/output pairs in `<div class="cell-group">`
    - Click input cell → copy content to active prompt
- [x] Navigation:
    - Up/Down arrows cycle history *only in active session*
    - Session switch → reset history position for that session
- [x] Persistence:
    - `beforeunload` event: Save all session histories to `sessionStorage`
    - Page load: Restore last 50 cells per session from storage
- [x] Implement pagination for large histories using `ui/src/utils/utilityFunctions.js`:
    - Virtual scrolling for better performance with large histories
    - Cell caching for improved scrolling performance
- [x] User Experience Enhancements:
    - Add "clear history" button per session (keeps pinned cells)
    - Implement history favorites/pinning with pin/unpin functionality
    - Add pin buttons to history cells

#### **Validation**
- [x] Type 10 commands in Session A → reload page → verify history restored
- [x] Switch to Session B → press Up arrow → verify only Session B's history appears
- [x] Exceed 500 cells → confirm oldest cells disappear without crash
- [x] Search in history → verify filtered results

#### **Validation**
- [x] Type 10 commands in Session A → reload page → verify history restored
- [x] Switch to Session B → press Up arrow → verify only Session B's history appears
- [x] Exceed 500 cells → confirm oldest cells disappear without crash
- [x] Search in history → verify filtered results

#### **Implementation Approach**

##### **1. Data Model Implementation**

###### **Cell Structure**
Extend the SessionManager to include history management capabilities:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    this.activeSessions = {};
    this.sessionHistories = {}; // New: Store history per session
    // ... existing code
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
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

##### **6. Advanced Search and Filtering**

Enhance history filtering capabilities:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
        return history.filter(cell => {
          if (cell.type === 'input') {
            return cell.content.toLowerCase().includes(lowerSearchText);
          } else {
            // For output cells, search in text content
            const textContent = cell.content.text || '';
            return textContent.toLowerCase().includes(lowerSearchText);
          }
        });
      }
    } else {
      const lowerSearchText = searchText.toLowerCase();
      return history.filter(cell => {
        if (cell.type === 'input') {
          return cell.content.toLowerCase().includes(lowerSearchText);
        } else {
          // For output cells, search in text content
          const textContent = cell.content.text || '';
          return textContent.toLowerCase().includes(lowerSearchText);
        }
      });
    }
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
    return history.filter(cell => {
      return cell.timestamp >= startDate && cell.timestamp <= endDate;
    });
  }
  
  /**
   * Apply combined filters to session history
   * @param {string} sessionId - Session identifier
   * @param {Object} filters - Filter criteria
   * @param {string} filters.text - Text to search for
   * @param {boolean} filters.useRegex - Whether to treat text as regex
   * @param {string} filters.type - Type to filter by ('input', 'output', or 'all')
   * @param {number} filters.startDate - Start timestamp (milliseconds since epoch)
   * @param {number} filters.endDate - End timestamp (milliseconds since epoch)
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
      history = history.filter(cell => {
        return cell.timestamp >= startDate && cell.timestamp <= endDate;
      });
    }
    
    return history;
  }
}
```

##### **7. Performance Optimizations**

Improve virtual scrolling with caching:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
}
```

##### **8. User Experience Enhancements**

Add clear history and pinning functionality:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
    
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to N update/sec (default N=4)
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console

}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console


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
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

##### **6. Advanced Search and Filtering**

Enhance history filtering capabilities:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
        return history.filter(cell => {
          if (cell.type === 'input') {
            return cell.content.toLowerCase().includes(lowerSearchText);
          } else {
            // For output cells, search in text content
            const textContent = cell.content.text || '';
            return textContent.toLowerCase().includes(lowerSearchText);
          }
        });
      }
    } else {
      const lowerSearchText = searchText.toLowerCase();
      return history.filter(cell => {
        if (cell.type === 'input') {
          return cell.content.toLowerCase().includes(lowerSearchText);
        } else {
          // For output cells, search in text content
          const textContent = cell.content.text || '';
          return textContent.toLowerCase().includes(lowerSearchText);
        }
      });
    }
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
    return history.filter(cell => {
      return cell.timestamp >= startDate && cell.timestamp <= endDate;
    });
  }
  
  /**
   * Apply combined filters to session history
   * @param {string} sessionId - Session identifier
   * @param {Object} filters - Filter criteria
   * @param {string} filters.text - Text to search for
   * @param {boolean} filters.useRegex - Whether to treat text as regex
   * @param {string} filters.type - Type to filter by ('input', 'output', or 'all')
   * @param {number} filters.startDate - Start timestamp (milliseconds since epoch)
   * @param {number} filters.endDate - End timestamp (milliseconds since epoch)
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
      history = history.filter(cell => {
        return cell.timestamp >= startDate && cell.timestamp <= endDate;
      });
    }
    
    return history;
  }
}
```

##### **7. Performance Optimizations**

Improve virtual scrolling with caching:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
}
```

##### **8. User Experience Enhancements**

Add clear history and pinning functionality:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
    
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console

}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console



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
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

##### **6. Advanced Search and Filtering**

Enhance history filtering capabilities:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
        return history.filter(cell => {
          if (cell.type === 'input') {
            return cell.content.toLowerCase().includes(lowerSearchText);
          } else {
            // For output cells, search in text content
            const textContent = cell.content.text || '';
            return textContent.toLowerCase().includes(lowerSearchText);
          }
        });
      }
    } else {
      const lowerSearchText = searchText.toLowerCase();
      return history.filter(cell => {
        if (cell.type === 'input') {
          return cell.content.toLowerCase().includes(lowerSearchText);
        } else {
          // For output cells, search in text content
          const textContent = cell.content.text || '';
          return textContent.toLowerCase().includes(lowerSearchText);
        }
      });
    }
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
    return history.filter(cell => {
      return cell.timestamp >= startDate && cell.timestamp <= endDate;
    });
  }
  
  /**
   * Apply combined filters to session history
   * @param {string} sessionId - Session identifier
   * @param {Object} filters - Filter criteria
   * @param {string} filters.text - Text to search for
   * @param {boolean} filters.useRegex - Whether to treat text as regex
   * @param {string} filters.type - Type to filter by ('input', 'output', or 'all')
   * @param {number} filters.startDate - Start timestamp (milliseconds since epoch)
   * @param {number} filters.endDate - End timestamp (milliseconds since epoch)
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
      history = history.filter(cell => {
        return cell.timestamp >= startDate && cell.timestamp <= endDate;
      });
    }
    
    return history;
  }
}
```

##### **7. Performance Optimizations**

Improve virtual scrolling with caching:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
}
```

##### **8. User Experience Enhancements**

Add clear history and pinning functionality:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
  
  /**
   * Create a DOM element for a cell
   * @param {string} sessionId - Session identifier
   * @param {Object} cell - Cell data
   * @returns {HTMLElement} Cell element
   */
  createCellElement(sessionId, cell) {
    // Create a container for the cell
    const cellContainer = document.createElement('div');
    cellContainer.className = 'history-cell';
    cellContainer.style.width = '100%';
    cellContainer.dataset.cellId = cell.id; // Store cell ID for later reference
    
    // Create line element based on cell type
    const lineElement = document.createElement('div');
    lineElement.className = 'output-line';
    
    if (cell.type === 'input') {
      lineElement.classList.add('input-line');
      lineElement.textContent = `${sessionId}> ${cell.content}`;
    } else {
      lineElement.textContent = cell.content.text || '';
      
      // Apply punctuation styling if available
      if (cell.content.punctuation) {
        const punctClass = this.getPunctuationClass(cell.content.punctuation);
        lineElement.classList.add(punctClass);
      }
      
      // Add truth bar if available
      if (cell.content.truth) {
        const truthBar = document.createElement('meter');
        truthBar.className = 'truth-bar';
        truthBar.min = 0;
        truthBar.max = 1;
        truthBar.value = cell.content.truth.frequency || 0;
        truthBar.title = `Frequency: ${(cell.content.truth.frequency * 100).toFixed(1)}%, Confidence: ${(cell.content.truth.confidence * 100).toFixed(1)}%`;
        lineElement.appendChild(truthBar);
      }
      
      // Add priority badge if available
      if (typeof cell.content.priority === 'number') {
        const priorityBadge = document.createElement('span');
        priorityBadge.className = 'priority-badge';
        priorityBadge.textContent = cell.content.priority.toFixed(2);
        lineElement.appendChild(priorityBadge);
      }
    }
    
    // Add pin button for cells
    const pinButton = document.createElement('button');
    pinButton.className = 'pin-button';
    pinButton.textContent = cell.pinned ? '📌' : '📍';
    pinButton.title = cell.pinned ? 'Unpin cell' : 'Pin cell';
    pinButton.addEventListener('click', () => {
      if (cell.pinned) {
        this.unpinCell(sessionId, cell.id);
        pinButton.textContent = '📍';
        pinButton.title = 'Pin cell';
      } else {
        this.pinCell(sessionId, cell.id);
        pinButton.textContent = '📌';
        pinButton.title = 'Unpin cell';
      }
    });
    
    cellContainer.appendChild(pinButton);
    cellContainer.appendChild(lineElement);
    return cellContainer;
  }
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling and caching
8. Add clear history and pinning functionality

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works
- Verify pinning functionality works
- Verify clear history functionality works (preserving pinned cells)

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
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
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

##### **6. Advanced Search and Filtering**

Enhance history filtering capabilities:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
        return history.filter(cell => {
          if (cell.type === 'input') {
            return cell.content.toLowerCase().includes(lowerSearchText);
          } else {
            // For output cells, search in text content
            const textContent = cell.content.text || '';
            return textContent.toLowerCase().includes(lowerSearchText);
          }
        });
      }
    } else {
      const lowerSearchText = searchText.toLowerCase();
      return history.filter(cell => {
        if (cell.type === 'input') {
          return cell.content.toLowerCase().includes(lowerSearchText);
        } else {
          // For output cells, search in text content
          const textContent = cell.content.text || '';
          return textContent.toLowerCase().includes(lowerSearchText);
        }
      });
    }
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
    return history.filter(cell => {
      return cell.timestamp >= startDate && cell.timestamp <= endDate;
    });
  }
  
  /**
   * Apply combined filters to session history
   * @param {string} sessionId - Session identifier
   * @param {Object} filters - Filter criteria
   * @param {string} filters.text - Text to search for
   * @param {boolean} filters.useRegex - Whether to treat text as regex
   * @param {string} filters.type - Type to filter by ('input', 'output', or 'all')
   * @param {number} filters.startDate - Start timestamp (milliseconds since epoch)
   * @param {number} filters.endDate - End timestamp (milliseconds since epoch)
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
      history = history.filter(cell => {
        return cell.timestamp >= startDate && cell.timestamp <= endDate;
      });
    }
    
    return history;
  }
}
```

##### **7. Performance Optimizations**

Improve virtual scrolling with caching:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
}
```

##### **8. User Experience Enhancements**

Add clear history and pinning functionality:

```javascript
// In session-manager.js
class SessionManager {
  // ... existing code
  
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
  
  /**
   * Create a DOM element for a cell
   * @param {string} sessionId - Session identifier
   * @param {Object} cell - Cell data
   * @returns {HTMLElement} Cell element
   */
  createCellElement(sessionId, cell) {
    // Create a container for the cell
    const cellContainer = document.createElement('div');
    cellContainer.className = 'history-cell';
    cellContainer.style.width = '100%';
    cellContainer.dataset.cellId = cell.id; // Store cell ID for later reference
    
    // Create line element based on cell type
    const lineElement = document.createElement('div');
    lineElement.className = 'output-line';
    
    if (cell.type === 'input') {
      lineElement.classList.add('input-line');
      lineElement.textContent = `${sessionId}> ${cell.content}`;
    } else {
      lineElement.textContent = cell.content.text || '';
      
      // Apply punctuation styling if available
      if (cell.content.punctuation) {
        const punctClass = this.getPunctuationClass(cell.content.punctuation);
        lineElement.classList.add(punctClass);
      }
      
      // Add truth bar if available
      if (cell.content.truth) {
        const truthBar = document.createElement('meter');
        truthBar.className = 'truth-bar';
        truthBar.min = 0;
        truthBar.max = 1;
        truthBar.value = cell.content.truth.frequency || 0;
        truthBar.title = `Frequency: ${(cell.content.truth.frequency * 100).toFixed(1)}%, Confidence: ${(cell.content.truth.confidence * 100).toFixed(1)}%`;
        lineElement.appendChild(truthBar);
      }
      
      // Add priority badge if available
      if (typeof cell.content.priority === 'number') {
        const priorityBadge = document.createElement('span');
        priorityBadge.className = 'priority-badge';
        priorityBadge.textContent = cell.content.priority.toFixed(2);
        lineElement.appendChild(priorityBadge);
      }
    }
    
    // Add pin button for cells
    const pinButton = document.createElement('button');
    pinButton.className = 'pin-button';
    pinButton.textContent = cell.pinned ? '📌' : '📍';
    pinButton.title = cell.pinned ? 'Unpin cell' : 'Pin cell';
    pinButton.addEventListener('click', () => {
      if (cell.pinned) {
        this.unpinCell(sessionId, cell.id);
        pinButton.textContent = '📍';
        pinButton.title = 'Pin cell';
      } else {
        this.pinCell(sessionId, cell.id);
        pinButton.textContent = '📌';
        pinButton.title = 'Unpin cell';
      }
    });
    
    cellContainer.appendChild(pinButton);
    cellContainer.appendChild(lineElement);
    return cellContainer;
  }
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling and caching
8. Add clear history and pinning functionality

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works
- Verify pinning functionality works
- Verify clear history functionality works (preserving pinned cells)

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console
}
```

##### **2. Integration with REPL Core**

###### **Adding Cells to History**
Modify the REPLCore to add input/output cells to the session history:

```javascript
// In repl-core.js
class REPLCore {
  submitInput() {
    const inputText = this.inputElement.value.trim();
    if (!inputText) return;
    
    // ... existing code
    
    // Add input cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);
    
    // ... existing code
  }
  
  addOutputLine(line) {
    // ... existing code
    
    // Add output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
  
  addStructuredOutputLine(line) {
    // ... existing code
    
    // Add structured output cell to history
    this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
    
    // ... existing code
  }
}
```

##### **3. UI Components for History Display**

###### **Cell Grouping**
Modify the output rendering to group input/output pairs:

```javascript
// In repl-core.js
class REPLCore {
  addOutputLine(line) {
    // Create cell group if it doesn't exist
    let cellGroup = this.getCurrentCellGroup();
    if (!cellGroup) {
      cellGroup = this.createCellGroup();
    }
    
    // ... existing code for creating line element
    
    cellGroup.appendChild(lineElement);
    
    // ... existing code
  }
  
  createCellGroup() {
    const cellGroup = document.createElement('div');
    cellGroup.className = 'cell-group';
    this.outputElement.appendChild(cellGroup);
    return cellGroup;
  }
}
```

##### **4. History Navigation**

###### **Arrow Key Handling**
Add keyboard navigation for history:

```javascript
// In repl-core.js
class REPLCore {
  bindEvents() {
    // ... existing code
    
    // Handle history navigation
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
  }
  
  navigateHistory(direction) {
    // Implementation for navigating through history
    // This will depend on maintaining a history position per session
  }
}
```

##### **5. Persistence Handling**

###### **Page Load/Unload Events**
Add event listeners for persistence:

```javascript
// In session-manager.js
class SessionManager {
  constructor() {
    // ... existing code
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', () => {
      this.persistAllHistories();
    });
    
    // Load histories on initialization
    this.loadAllHistories();
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
}
```

#### **Dependencies on Existing Utilities**

##### **From `ui/src/utils/dataProcessor.js`:**
- Will use for advanced history data processing if needed

##### **From `ui/src/utils/filterUtils.js`:**
- Will implement text search and type filtering for history

##### **From `ui/src/utils/utilityFunctions.js`:**
- Will use `paginateData` for handling large histories
- May use other utility functions as needed

#### **Implementation Order**

1. Extend SessionManager with history management capabilities
2. Modify REPLCore to add cells to history
3. Implement UI components for cell grouping
4. Add history navigation functionality
5. Implement persistence handling
6. Add search and filtering capabilities
7. Optimize for performance with virtual scrolling if needed

#### **Testing Approach**

Since we're minimizing mocks, we'll test the actual history functionality:
- Verify cells are added to history correctly
- Verify history persistence works
- Verify history loading works
- Verify history navigation works
- Verify search and filtering works

#### **Future Considerations**

- Virtual scrolling for large histories
- Advanced search capabilities
- Export/import history functionality
- History sharing between sessions

---

### **Phase 5: Agent-Aware Features**
*Goal: Cross-session interaction and visualization*

#### **Session Communication**
- [ ] Implement "Send to session" widget:
    - Per-output-line `⋯` menu with "Send to..." option
    - Dropdown shows active sessions (excluding self)
    - Injects selected output into target session's input field
- [ ] Create agent status HUD:
    - Toggle via `/agents` command
    - Grid view showing all sessions' status (cycles, memory, state)
    - Color-coded borders matching session containers
    - Use display utilities from `ui/src/utils/displayUtils.js` for consistent rendering

#### **Multi-Agent Visualization**
- [ ] Session-scoped visualizers:
    - Truth chart: Toggle per output line (Chart.js loaded on-demand)
    - Derivation popup: Shows session-specific derivation tree on click
    - Leverage existing non-React visualization components where possible
- [ ] Cross-session network view:
    - Toggle in agent HUD → shows force-directed graph of inter-session beliefs
    - Nodes colored by session ID; edges show belief propagation
    - Use grouping utilities from `ui/src/utils/groupUtils.js` to organize related beliefs
- [ ] Implement visualization data processing using `ui/src/utils/dataProcessor.js`:
    - Transform output data for visualization
    - Group related items for network views

#### **Validation**
- [ ] In Session A: Run inference → use "Send to Session B" → verify input appears in Session B
- [ ] Open `/agents` → confirm all sessions show live status updates
- [ ] Toggle network view → verify edges only connect related sessions
- [ ] Truth chart toggle → verify chart displays correctly

---

### **Phase 6: Optimization & Polish**
*Goal: Performance and edge-case hardening*

#### **Resource Management**
- [ ] Implement session resource limits:
    - Background sessions throttle to 1 update/sec
    - Auto-close sessions inactive >1 hour
    - Use debouncing from `ui/src/utils/utilityFunctions.js` for throttling updates
- [ ] Optimize rendering:
    - Virtualize scrollback buffer (only render visible cells)
    - Debounce history saves to `sessionStorage`
    - Use memoization from `ui/src/utils/utilityFunctions.js` for expensive computations

#### **Responsiveness**
- [ ] Mobile adaptations:
    - Session selector → swipeable tabs on mobile
    - Input field expands to full width on focus
    - Touch targets ≥48px for all controls
- [ ] Accessibility:
    - ARIA labels for session controls (`aria-label="Close session main"`)
    - Reduced-motion preference: Disable animations if `prefers-reduced-motion`

#### **Stress Testing**
- [ ] 10-session load test:
    - All sessions reasoning concurrently → verify <100ms input lag
    - Memory leak check: 1hr runtime → heap size growth <5%
- [ ] Failure recovery:
    - Simulate server crash → verify only affected sessions show errors
    - Network flakiness test: 50% packet loss → connections recover within 10s

---

### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
### **Final Validation Checklist**
- [ ] **Session isolation**:
    - History/state never leaks between sessions
    - Closing session terminates all associated resources (timers, listeners)
- [ ] **Protocol compliance**:
    - All messages contain valid `sessionId` (audit with Wireshark)
    - Server handles 5+ concurrent sessions without message mixing
- [ ] **Zero shared UI breaks**:
    - Existing UI at `ui/` functions identically after integration
    - No modifications to `ui/shared/` beyond initial setup
- [ ] **Documentation**:
    - `ui/repl/README.md` covers setup, session management, and extension guide
    - JSDoc comments for all public functions in `session-manager.js` and `repl-core.js`
- [ ] **Cross-environment test**:
    - Chrome/Firefox/Safari (latest)
    - iOS Safari and Android Chrome (touch interactions)
    - 320px viewport width (mobile layout)

> **Execution Rules**
> 1. **Strict phase gating**: No Phase 2 tasks until Phase 1 passes all validation checks
> 2. **Session context first**: Every new feature (e.g., visualizations) must work in single-session mode before multi-session
> 3. **Optimization ban**: Phase 6 work forbidden until Phase 5 validation complete
> 4. **Debugging hooks**:
     >    - `?debug=true` URL param enables raw WebSocket logging
>    - `window.NARS_SESSIONS` exposes session registry to console
>    - `window.NARS_SESSIONS` exposes session registry to console


