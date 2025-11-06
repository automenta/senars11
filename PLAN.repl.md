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
- [ ] Enhance `session-manager.js`:
    - Maintain `activeSessions = {}` registry (keyed by session ID)
    - "New Session" button: Generates UUID, calls `createSession()`
    - Session selector dropdown: Shows active sessions with status icons (⏹️/▶️)
    - Leverage `ui/src/utils/uuid.js` for generating unique session IDs
- [ ] Update `repl-core.js`:
    - Accept `sessionId` parameter in constructor
    - Prefix all WebSocket messages with `sessionId`
    - Scope DOM elements to session container using `data-session-id`

#### **Connection Isolation**
- [ ] Modify WebSocket initialization:
    - Each session creates unique connection to `ws://localhost:8080/nar?session={id}`
    - Message routing: Filter incoming messages by `sessionId` field
- [ ] Add session controls:
    - Per-session close button (top-right of container)
    - Visual session separation: Unique border color per session (CSS variables)
- [ ] Implement session lifecycle management using patterns from `ui/src/utils/messageProcessor.js`:
    - Add middleware for session-specific message processing
    - Implement error handling and recovery mechanisms

#### **Validation**
- [ ] Create 2 sessions → type in Session A → verify no echo in Session B
- [ ] Close Session A → confirm WebSocket terminates and DOM cleans up
- [ ] Reload page → verify only "main" session auto-restores

---

### **Phase 3: Reasoner Integration per Session**
*Goal: Real NARS reasoning with structured output*

#### **Protocol Implementation**
- [ ] Update server communication:
    - Input submission: Send `{ sessionId, type: "reason/step", payload: { text } }`
    - Handle `{ type: "reason/output" }` messages with structured data
- [ ] Implement command parsing:
    - `/start` → send `{ type: "control/start" }`
    - `/stop` → send `{ type: "control/stop" }`
    - Leverage command parsing utilities from `ui/src/utils/messageHandlers.js`

#### **Session-Scoped Rendering**
- [ ] Create output renderer (per session):
    - Punctuation styling: Apply `.punct-statement` class to `.` outputs
    - Truth bars: `<meter value="${truth.frequency}" min="0" max="1">`
    - Priority badges: `<span class="priority">${priority.toFixed(2)}</span>`
    - Utilize formatting functions from `ui/src/utils/formatters.js` for consistent display
- [ ] Add reasoner controls:
    - Per-session toolbar with Start/Stop/Step buttons
    - Disable input field during processing (overlay spinner)
- [ ] Implement structured output processing using `ui/src/utils/messageProcessor.js`:
    - Add middleware for processing different output types
    - Use handler registry pattern from `ui/src/utils/handlerRegistry.js` for different output handlers

#### **Validation**
- [ ] In Session A: Type `<bird --> animal>.` → verify colored punctuation + truth bar
- [ ] Run `/start` in Session A → confirm Session B remains idle
- [ ] Send invalid Narsese → verify red error message with raw payload

---

### **Phase 4: Per-Session Notebook & History**
*Goal: Persistent cell-based history isolated by session*

#### **Data Model**
- [ ] Define cell structure in `session-manager.js`:
  ```js
  {
    id: 'cell-1',
    type: 'input' | 'output',
    content: string | Array<{text, truth?}>,
    timestamp: Date.now(),
    sessionId: 'main'
  }
  ```  
- [ ] Implement history management:
    - Per-session array capped at 500 cells
    - Auto-prune oldest cell on overflow
    - `sessionStorage` persistence using key `nars-history-${sessionId}`
    - Leverage data processing utilities from `ui/src/utils/dataProcessor.js` for history management
- [ ] Implement search and filtering for history using `ui/src/utils/filterUtils.js`:
    - Add text search capability
    - Add type filtering (input/output)

#### **UI Interactions**
- [ ] Cell grouping:
    - Wrap input/output pairs in `<div class="cell-group">`
    - Click input cell → copy content to active prompt
- [ ] Navigation:
    - Up/Down arrows cycle history *only in active session*
    - Session switch → reset history position for that session
- [ ] Persistence:
    - `beforeunload` event: Save all session histories to `sessionStorage`
    - Page load: Restore last 50 cells per session from storage
- [ ] Implement pagination for large histories using `ui/src/utils/utilityFunctions.js`:
    - Virtual scrolling for better performance with large histories

#### **Validation**
- [ ] Type 10 commands in Session A → reload page → verify history restored
- [ ] Switch to Session B → press Up arrow → verify only Session B's history appears
- [ ] Exceed 500 cells → confirm oldest cells disappear without crash
- [ ] Search in history → verify filtered results

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
