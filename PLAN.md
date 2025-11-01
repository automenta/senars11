# SeNARS Development Plan (Functional Prototype Focus)

## Executive Summary

This document provides a complete, self-contained, and actionable implementation plan for SeNARS that focuses on delivering a functional prototype with essential features. The approach emphasizes rapid development, working functionality, and practical implementation over perfection.

**Key Principles:**
- **Essentialism**: Focus on core features that deliver maximum user value
- **Simplicity**: Eliminate complexity that doesn't add proportional value
- **Integration**: Leverage existing systems rather than rebuilding
- **Pragmatism**: Prioritize working functionality over theoretical perfection
- **Rapid Prototyping**: Deliver working features quickly for feedback and iteration

---

## Current Status & Architecture Overview

### Completed Core Systems:
- **Reasoning Engine**: NARS implementation with Zod validation and event-driven architecture
- **Observability**: Unified logging, monitoring, and traceability via EventBus
- **Fault Tolerance**: Bounded evaluation, circuit breakers, and recovery strategies
- **Security**: Capability-based model with validation systems
- **Configuration**: Zod-based schema validation in `SystemConfig.js`
- **Testing**: Property-based testing and benchmark suites with Jest and fast-check
- **WebSocket Integration**: Real-time communication via `WebSocketMonitor.js`
- **UI Foundation**: Vite + React + Zustand + FlexLayout stack
- **Language Model Integration**: Configurable providers (OpenAI, Ollama, etc.) implemented

### Integration Status:
- ✅ Core NAR reasoning engine available via `webui.js`
- ✅ WebSocketMonitor.js provides real-time communication bridge
- ✅ UI stack (Vite+React+Zustand+FlexLayout) already implemented
- ✅ Data processing pipeline with DataProcessor class implemented
- ⏳ ConsoleBridge mechanism (browser logs → WebSocket server) needs implementation
- ⏳ Error boundary system with fallback UIs needs implementation
- ⏳ Rich reasoning visualization components need implementation

---

## Development Principles & Technology Stack

### Core Principles:
- **Modular Architecture**: Independent, reusable modules with clear interfaces
- **Configuration-Driven**: Parameterizable behavior via configuration rather than hardcoding
- **Event-Driven**: Asynchronous communication with traceable operations
- **Working Software First**: Prioritize functional implementation over comprehensive testing
- **Iterative Improvement**: Rapid prototyping with continuous refinement based on feedback

### Technology Stack:
- **Build**: Vite (fast dev server) + Node.js ecosystem
- **Frontend**: React + Zustand + FlexLayout (plain JavaScript, no JSX)
- **Validation**: Zod for critical data schemas
- **Testing**: Basic Jest unit tests for core functionality
- **Styling**: CSS Modules with CSS variables
- **Communication**: WebSocket API with structured messaging
- **Event System**: mitt-based EventBus with middleware
- **Code Quality**: ESLint + Prettier (basic configuration)

---

## Implementation Roadmap (Prototype Focus)

### Phase 1: Essential Core Functionality

**Agile Focus**: Establish working communication between UI and core systems with basic error handling.

**Project Structure Reference:**
```
./ui/
├── src/
│   ├── components/          # React components (createElement-based)
│   ├── stores/              # Zustand state management
│   ├── utils/               # Helper utilities (websocket, data processing)
│   ├── schemas/             # Shared Zod validation schemas
│   ├── layouts/             # FlexLayout configurations
│   ├── App.js               # Root component with WebSocket setup
│   └── main.js              # Entry point
├── tests/                   # Basic unit tests
├── index.html               # Vite entry HTML
├── vite.config.js           # Vite build configuration
├── .eslintrc.js             # ESLint configuration
├── .prettierrc              # Prettier formatting rules
├── package.json             # Dependencies and scripts
└── README.md                # Setup instructions
```

**Implementation Steps (Essential First):**

1. **Basic WebSocket Integration** (`ui/src/utils/websocket.js`)
   - Ensure existing WebSocket client can connect to SeNARS core
   - Implement basic message sending/receiving functionality
   - Add simple connection status indicator
   - **Dependencies**: Existing WebSocket implementation
   - **Success Criteria**: UI can connect to core, send/receive basic messages

2. **LM Provider Configuration** (`ui/src/components/LMConfigPanel.js`)
   - Create basic panel for managing Language Model providers
   - Implement simple form controls for API keys and model selection
   - Add basic validation for required fields
   - **Dependencies**: `ui/src/stores/uiStore.js` for state management
   - **Success Criteria**: Users can configure and save LM provider settings

3. **Core Data Display** (`ui/src/components/CoreDataPanel.js`)
   - Create basic panel to display incoming reasoning data
   - Implement simple list/table view for reasoning events
   - Add basic filtering capabilities
   - **Dependencies**: WebSocket message subscription
   - **Success Criteria**: Reasoning data visible in UI, basic filtering works

4. **Error Handling Basics** (`ui/src/components/ErrorBoundary.js`)
   - Create simple error boundary to prevent complete crashes
   - Implement basic error display with reload option
   - **Success Criteria**: UI doesn't crash completely on component errors

**Integration Points:**
- **WebUI Bridge**: `/webui.js` - WebSocket connection between NAR and UI
- **WebSocket Client**: `/ui/src/utils/websocket.js` - UI-side WebSocket handling
- **WebSocket Server**: `/src/server/WebSocketMonitor.js` - Server-side monitoring
- **Language Models**: `/src/lm/LM.js` - LM integration and configuration

**Acceptance Criteria:**
- [ ] UI can connect to SeNARS core via WebSocket
- [ ] Users can configure LM providers and settings
- [ ] Basic reasoning data is visible in the UI
- [ ] UI handles basic errors without complete crashes

### Phase 2: Essential Reasoning Visualization

**Agile Focus**: Implement core visualization capabilities to observe and understand actual reasoning activity.

**Implementation Steps (Essential First):**

1. **Reasoning Trace Display** (`ui/src/components/ReasoningTracePanel.js`)
   - Create panel to display basic inference steps and decision-making process
   - Implement real-time updating as reasoning events arrive via WebSocket
   - Add simple filtering for different event types (input, deduction, induction, etc.)
   - **Dependencies**: `ui/src/utils/websocket.js` for event subscription
   - **Success Criteria**: Users can see reasoning process step-by-step, events displayed in order

2. **Task Flow Display** (`ui/src/components/TaskPanel.js`)
   - Create panel to visualize input → processing → output chains
   - Implement basic task lifecycle tracking (created, processed, completed)
   - **Dependencies**: WebSocket event subscription for task events
   - **Success Criteria**: Task flow clearly visible, basic lifecycle tracking works

3. **Concept Display** (`ui/src/components/ConceptPanel.js`)
   - Create panel to show basic concept information and evolution over time
   - Implement simple relationship mapping between related concepts
   - **Dependencies**: Concept event subscription
   - **Success Criteria**: Concept relationships visible, evolution over time trackable

4. **Simple Metrics Display** (`ui/src/components/DashboardPanel.js`)
   - Create basic dashboard with key indicators
   - Implement simple metrics for reasoning speed, task throughput
   - **Dependencies**: Metrics event subscription
   - **Success Criteria**: Key metrics visible in real-time

**Acceptance Criteria:**
- [ ] Basic reasoning process visible step-by-step
- [ ] Task flow visualization shows lifecycle
- [ ] Concept relationships and evolution displayed
- [ ] Key metrics visible in real-time

### Phase 3: Essential Educational Tools

**Agile Focus**: Create basic tools that enable understanding and demonstration of the system.

**Implementation Steps (Essential First):**

1. **Basic Screenshot Capability** (`ui/src/utils/screenshot.js`)
   - Implement simple screenshot capture functionality for demonstrations
   - Add basic export capability for captured images (PNG)
   - **Dependencies**: Browser canvas APIs
   - **Success Criteria**: Users can capture and export basic screenshots

2. **Simple Demonstration Mode** (`ui/src/components/DemoModePanel.js`)
   - Create basic demonstration mode showing step-by-step reasoning
   - Add simple controls for play/pause/step through reasoning
   - **Dependencies**: Existing reasoning trace display
   - **Success Criteria**: Basic demonstration mode works with play/pause controls

3. **Basic Help System** (`ui/src/components/HelpPanel.js`)
   - Create simple help panel with basic usage instructions
   - Add links to key documentation
   - **Dependencies**: Markdown rendering utilities
   - **Success Criteria**: Users can access basic help information

**Acceptance Criteria:**
- [ ] Basic screenshots can be captured and exported
- [ ] Simple demonstration mode works
- [ ] Basic help system available

### Phase 4: Basic Quality Assurance (Defer Performance)

**Agile Focus**: Establish basic testing and quality assurance systems, deferring performance optimization to later phases.

**Implementation Steps (Essential First):**

1. **Basic Unit Testing** (`ui/src/__tests__/`)
   - Implement basic unit tests for core UI components and utilities
   - Create simple tests for critical functions
   - **Dependencies**: Jest testing framework
   - **Success Criteria**: Core functionality has basic test coverage

2. **Basic Integration Testing** (`ui/tests/`)
   - Create basic integration tests for UI ↔ Core communication via WebSocket
   - Add simple tests for critical workflows
   - **Dependencies**: Jest testing framework
   - **Success Criteria**: Basic integration functionality tested

3. **Manual Quality Assurance**
   - Perform manual testing of core functionality
   - Create basic test scripts for key user workflows
   - Document known issues and limitations
   - **Success Criteria**: Core functionality works as expected, issues documented

**Note on Performance**: Performance optimization, accessibility compliance, and advanced testing will be deferred to later phases when the prototype is functioning and feedback has been gathered.

**Acceptance Criteria:**
- [ ] Core functionality has basic unit test coverage
- [ ] Critical integration paths tested
- [ ] Manual testing confirms basic functionality works
- [ ] Known issues and limitations documented

---

## Key Implementation Details & References

### Core File References:
- **WebUI Bridge**: `/webui.js` - Main entry point connecting NAR to UI via WebSocket
- **WebSocket Client**: `/ui/src/utils/websocket.js` - UI-side WebSocket handling and event processing
- **WebSocket Server**: `/src/server/WebSocketMonitor.js` - Server-side monitoring and message routing
- **Language Models**: `/src/lm/LM.js` - LM integration, configuration, and provider management
- **Configuration**: `/src/config/SystemConfig.js` - Zod-validated system configuration
- **Event System**: `/src/util/EventBus.js` - mitt-based event bus for communication
- **Data Processing**: `/ui/src/utils/dataProcessor.js` - Transform raw events into displayable data

### Component Architecture Pattern:
```javascript
// Example component structure
import React from 'react';
import { useUiStore } from '../stores/uiStore.js';

const ExamplePanel = ({ title }) => {
  const data = useUiStore(state => state.exampleData);
  
  return React.createElement('div', { className: 'panel' },
    React.createElement('h2', null, title),
    React.createElement('div', { className: 'content' },
      // Render data or components here
    )
  );
};

export default ExamplePanel;
```

### State Management Pattern:
```javascript
// Example store slice
import { create } from 'zustand';

const useUiStore = create((set, get) => ({
  // State
  exampleData: [],
  
  // Actions
  setExampleData: (data) => set({ exampleData: data }),
  updateExampleItem: (id, updates) => set(state => ({
    exampleData: state.exampleData.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  })),
  
  // Selectors
  getExampleById: (id) => get().exampleData.find(item => item.id === id)
}));
```

### WebSocket Message Handling Pattern:
```javascript
// Example message handler
const handleMessage = (message) => {
  const { type, payload } = message;
  
  switch (type) {
    case 'reasoning.step':
      // Process reasoning step
      break;
    case 'task.created':
      // Process task creation
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};
```

---

## Optimization Strategy & Best Practices

### Doing More with Less:
1. **Leverage Existing Systems**: Use current WebSocket infrastructure rather than building new communication layers
2. **Component Reuse**: Build generic visualization components that can display different data types
3. **Configuration Over Code**: Use configuration files to customize behavior rather than writing new code
4. **Progressive Enhancement**: Start with basic functionality and add sophistication incrementally

### Eliminating Redundancy:
1. **Single Source of Truth**: Centralize configuration and state management in Zustand stores
2. **Unified Patterns**: Use consistent component and data patterns throughout (`React.createElement` approach)
3. **Shared Utilities**: Create reusable utility functions rather than duplicating code
4. **Modular Design**: Build independent modules that can be combined in different ways

### Feature Completeness Without Bloat:
1. **Essential Features First**: Implement core functionality before advanced options
2. **Configurable Behavior**: Allow customization through parameters rather than separate implementations
3. **Plugin Architecture**: Enable extension through plugins rather than bloating core code
4. **Graceful Degradation**: Ensure basic functionality works even when advanced features are unavailable

---

## Success Metrics (Prototype Focus)

### Essential Technical Metrics:
- **Basic Functionality**: Core features work as expected
- **Stability**: UI doesn't crash completely during normal usage
- **Basic Test Coverage**: Key functionality has some test coverage
- **Connectivity**: WebSocket connection to core system works reliably

### Basic User Experience Metrics:
- **Usability**: Users can accomplish basic tasks with the system
- **Response Time**: UI interactions are reasonably responsive
- **Error Handling**: Errors are displayed to users rather than causing crashes

### Development Metrics:
- **Build Process**: Code compiles and runs without major errors
- **Documentation**: Key features are documented for developers
- **Code Quality**: Code follows basic style guidelines

---

## Risk Mitigation (Prototype Focus)

### Key Risks:
1. **WebSocket Integration Issues**
   - *Approach*: Focus on basic connectivity first, add advanced features later
   - *Monitoring*: Manual testing during development
   - *Contingency*: Use simple mock data for development when needed

2. **LM Provider Integration Problems**
   - *Approach*: Start with one working provider, expand later
   - *Monitoring*: Test with sample data during development
   - *Contingency*: Fall back to basic NARS reasoning when providers fail

3. **Core Functionality Not Working**
   - *Approach*: Implement and test core features incrementally
   - *Monitoring*: Regular manual testing during development
   - *Contingency*: Simplify features to ensure basics work

### Prototype Approach:
Since this is a prototype, extensive risk mitigation is not required. Focus on:
- Getting basic functionality working first
- Addressing issues as they arise through iterative development
- Keeping the scope focused on essential features
- Using simple solutions rather than complex risk mitigation systems

---

## Development Approach (No Fixed Timeline)

Since this is a prototype focused on essential functionality, rigid timelines are not appropriate. Instead, development will proceed iteratively:

### Iterative Development Approach:
1. **Implement core functionality first** - Get basic UI ↔ Core communication working
2. **Add essential visualization** - Display reasoning process in a basic way
3. **Create simple educational tools** - Enable basic demonstration and explanation
4. **Ensure basic quality** - Add simple tests and documentation
5. **Gather feedback and iterate** - Use the working prototype to guide further development

### Prototype Focus:
- Deliver working features quickly rather than perfect features slowly
- Keep scope focused on essential functionality
- Defer performance optimization, extensive testing, and advanced features
- Use feedback from the working prototype to guide future development

---

## Conclusion

This prototype-focused implementation plan provides a clear roadmap for developing the SeNARS system with focus on essential features and rapid delivery. By following this approach:

1. **Essential functionality** is prioritized and delivered first
2. **Working software** is emphasized over comprehensive documentation
3. **Simple solutions** are preferred over complex architectures
4. **Basic quality** ensures the prototype is usable and reliable
5. **Feedback-driven development** uses the working prototype to guide future improvements
6. **Scope focus** keeps development concentrated on core value

The approach ensures that the SeNARS system becomes a functional prototype that demonstrates core capabilities while maintaining flexibility for future enhancement. Each phase includes specific implementation steps, file references, and clear acceptance criteria to guide development toward a working prototype that can be used for feedback and further development.