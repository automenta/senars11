# TUI REPL

Provide full observability and control of the system state through editing the active set of Input Tasks

Usable by local and remote console

Fully utilize component-based Text UI capabilities
Emulate the equivalent GUI through the limits of a console

Keyboard shortcuts

Emojis, color-coding (with gradients), animation

----

## Components

### Tasks Editor: (scrollable) list of (user-entered "Input") Tasks

New task input text field (at bottom)

Task Context menu (when clicked):
- Delete (with confirm)
- Edit (with confirm, deletes it AND all derived tasks, and recreates)
- Priority adjustment (with multiple modes: propagate to dependents, affect only this task, custom override)

### Log: (scrollable) colorized, filterable, max scrollback capacity

### Statusbar
- Connection state
- Memory stats
- Alerts (# queued)
- Pulldown Menu
	- Load
	- Save
	- ...
	- Exit

----

## Views (full-screen layout, with 1-line statusbar on bottom)

### Vertical split: Task Editor (left), Log (right)
(default)

### Log-only

### Dynamic Grouping View: (tasks organized by relationships, time, priority, or other criteria)

----

## Phased Implementation Plan

### Phase 1: Foundation & Architecture
- [ ] **Refactor TUI Components**
  - [ ] Create abstract BaseComponent class for blessed UI components with consistent interface
  - [ ] Implement TaskEditorComponent extending BaseComponent
  - [ ] Implement LogViewerComponent extending BaseComponent  
  - [ ] Implement StatusBarComponent extending BaseComponent
  - [ ] Create ViewManager to handle different layouts with proper event delegation
  - [ ] Establish component communication patterns (events, state management)

- [ ] **Input Management System**
  - [ ] Modify ReplEngine to create Input objects for each user input with UUID using crypto.randomUUID()
  - [ ] Create InputManager (input.js) to handle the editable and reprioritizable set of user Input tasks
  - [ ] Implement Input class that manages metadata and references to derived tasks in the system
  - [ ] Add method getTaskDependencies(inputId) to retrieve derivation tree
  - [ ] Add method deleteInputWithDependencies(inputId) to remove Input and all derived tasks
  - [ ] Add method editInputWithRecreate(inputId, newInput) to update and regenerate derived tasks
  - [ ] Implement priority propagation modes: direct (only this Input), cascade (to derived tasks), custom (selective propagation)
  - [ ] Add method updateInputPriority(inputId, newPriority, mode="direct") to enable control over system attention
  - [ ] Implement session persistence for active Inputs and their derivation trees

- [ ] **Current TUI Analysis for Complete Replacement**
  - [ ] Locate existing TUIRepl.js at src/repl/TUIRepl.js to understand current implementation
  - [ ] Identify current layout configuration in ELEMENT_CONFIGS constant for reference architecture
  - [ ] Map current event listeners to determine which need to be reimplemented in new architecture
  - [ ] Identify which blessed elements (input, output, memoryDisplay, statusBar) will be completely replaced

### Phase 2: Core UI Components
- [ ] **Input Editor Component**
  - [ ] Create scrollable blessed List element for displaying Inputs (user input surface layer)
  - [ ] Style Input items with color coding: blue for active, green for processed, red for errors
  - [ ] Implement "New Input" input field at bottom as blessed Textarea with proper focus cycling
  - [ ] Add keyboard navigation: arrows for selection, enter for context menu
  - [ ] Implement visual indicators for Input states (priority level, processing status)
  - [ ] Add highlighting for currently selected Input
  - [ ] Support multi-line Input display with priority indicators

- [ ] **Context Menu System**
  - [ ] Create ContextMenu class as reusable blessed Box component
  - [ ] Implement menu positioning relative to selected Input
  - [ ] Add "Delete" operation with confirmation dialog using blessed Prompt
  - [ ] Add "Edit" operation with confirmation that shows input field pre-filled with original Input
  - [ ] Add "Priority" submenu with modes: "Direct Only", "Cascade to Derived Tasks", "Custom Override"
  - [ ] Implement proper key bindings and mouse click handling for menu items

- [ ] **Priority Management System**
  - [ ] Implement visual priority indicators (gradient bars, numeric values)
  - [ ] Add direct priority adjustment via mouse/slider
  - [ ] Create priority mode selector (default to "Direct Only")
  - [ ] Show affected derived task count when using cascade mode

### Phase 3: Enhanced Features
- [ ] **Enhanced Log Component**
  - [ ] Replace current output box with enhanced LogViewerComponent
  - [ ] Implement message type colorization: red for errors, green for success, yellow for warnings, cyan for info
  - [ ] Add dynamic filtering controls: type filter (all, error, warn, info), keyword search, time range
  - [ ] Implement scrollback capacity management with configurable limits
  - [ ] Add "Follow" mode that automatically scrolls to newest entries
  - [ ] Implement log level controls accessible via right-click or shortcut

- [ ] **Layout System**
  - [ ] Implement ViewManager with layout switching capabilities
  - [ ] Create VerticalSplitLayout showing TaskEditor (left 40%) and LogViewer (right 60%)
  - [ ] Create LogOnlyLayout showing full-screen LogViewer
  - [ ] Create DynamicGroupingLayout showing tasks organized by relationships, time, priority, or other criteria
  - [ ] Add keyboard shortcuts for layout switching: Ctrl+L for log-only, Ctrl+T for split view, Ctrl+G for grouping view
  - [ ] Implement proper resizing behavior when terminal is resized
  - [ ] Add visual indicators showing current view mode in status bar

### Phase 4: Advanced Features
- [ ] **Status Bar Enhancement**
  - [ ] Extend current statusBar with connection state indicator (local/remote)
  - [ ] Add memory stats display: concept count, Input count, focus set size
  - [ ] Implement alert system showing queued Inputs count with visual indicator
  - [ ] Create pulldown menu accessible via F1 or right-click with Load/Save/Exit options
  - [ ] Add performance indicators: CPU usage, memory usage, cycles per second
  - [ ] Implement animated status indicators using spinning emoji

- [ ] **Task Relationship Visualization**
  - [ ] Add visual indicators for task relationships without hierarchical navigation
  - [ ] Create grouping filters: by time, priority, similarity, derivations
  - [ ] Implement multi-Input selection using Shift+click or Ctrl+click
  - [ ] Add "Group By" functionality for different organizational criteria
  - [ ] Add "Expand All" and "Collapse All" functionality for grouped views

### Phase 5: Polish & Integration
- [ ] **Full Integration & Testing**
  - [ ] Replace existing TUIRepl.js implementation with new component-based architecture
  - [ ] Connect all new components with ReplEngine events
  - [ ] Add comprehensive keyboard shortcuts: navigation (arrows, pgUp/pgDn), operations (DEL, E to edit), view switching (Ctrl+L/T/G)
  - [ ] Polish UI with consistent emojis, color-coding, and subtle animations
  - [ ] Implement remote console capabilities via WebSocket integration with existing event system

- [ ] **User Experience Refinements**
  - [ ] Add visual feedback animations for all operations (fade in/out, color transitions)
  - [ ] Implement undo/redo functionality for task edit operations
  - [ ] Add search functionality within task editor and logs with highlighting
  - [ ] Create help system accessible via F1 showing all key bindings and commands
  - [ ] Add progress indicators for long-running operations (save, load, processing)

- [ ] **Performance & Reliability**
  - [ ] Add virtual scrolling for large task lists (>1000 items) to optimize rendering
  - [ ] Implement proper error boundaries and graceful degradation
  - [ ] Add memory management for long-running sessions with periodic cleanup
  - [ ] Create backup/restore functionality for current UI state including task lists
  - [ ] Add proper logging of UI errors for debugging

- [ ] **New Integration Points**
  - [ ] Create new ReplEngine event handling system optimized for component-based architecture
  - [ ] Implement new command system with enhanced functionality
  - [ ] Extend formatting utilities (FormattingUtils.js) with new features for task relationships
  - [ ] Replace current animation loop with enhanced status indicators

### Phase 6: Advanced Capabilities
- [ ] **Advanced Visualization**
  - [ ] Add gradient color schemes for priority visualization (red→green based on priority value)
  - [ ] Implement smooth animations for task state transitions using blessed animation capabilities
  - [ ] Add progress indicators for long operations (animated progress bars)
  - [ ] Create priority-based background gradients for task items
- [ ] **Dynamic Grouping System**
  - [ ] Implement relationship-based grouping (tasks derived from same input)
  - [ ] Add time-based grouping (tasks within same time window)
  - [ ] Create priority-based grouping (tasks within priority ranges)
  - [ ] Add similarity-based grouping (tasks with similar terms or structures)
  - [ ] Implement interactive grouping controls allowing users to switch criteria on-the-fly
  
- [ ] **Remote Console Enhancement**
  - [ ] Add authentication layer for remote connections
  - [ ] Implement secure WebSocket communication using existing infrastructure
  - [ ] Add session management and persistence for remote clients
  - [ ] Create connection quality indicators showing latency and stability

### Phase 7: Verification & Quality Assurance
- [ ] **Implementation Verification**
  - [ ] Test all keyboard shortcuts work consistently across all components
  - [ ] Verify Input relationship tracking works correctly with NAR derivations
  - [ ] Validate context menu operations handle edge cases (empty Inputs, invalid inputs)
  - [ ] Confirm layout switching maintains component state properly
  - [ ] Test memory management prevents leaks during long sessions
  - [ ] Verify priority propagation modes work correctly with different propagation strategies
  - [ ] Test Dynamic Grouping View functions properly with various grouping criteria

- [ ] **Functionality Verification**
  - [ ] Ensure new TUI works with existing NAR configuration options
  - [ ] Verify all new ReplEngine commands function properly in the new architecture
  - [ ] Test integration with existing persistence and command systems
  - [ ] Update or replace existing tests for new architecture
