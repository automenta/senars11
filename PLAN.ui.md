# SeNARS UI Development Plan

## Overview
This plan outlines the iterative enhancement of the SeNARS Web UI, focusing on building robust, shared components that benefit both the REPL and Cognitive IDE. The development will be WebSocket-driven with a focus on reducing code duplication through parameterized components. Given the current dysfunctional state of the UI, this plan emphasizes rapid validation through automated testing and visual feedback.

## Phase 0: Assessment & Validation Foundation (Week 0)

### Goals
- Identify specific broken components
- Establish comprehensive testing infrastructure
- Create visual regression testing system
- Document current vs. desired states

### Tasks
1. **Current State Assessment**
   - Document which UI components are currently broken
   - Identify WebSocket connection issues
   - Catalog all error states and blank screens
   - Create component health matrix

2. **Testing Infrastructure Setup**
   - Configure Playwright for E2E testing
   - Set up visual regression testing pipeline
   - Create screenshot collection system to `/docs/screenshots`
   - Implement component-level snapshot tests
   - Set up automated accessibility testing

3. **Visual Documentation System**
   - Create screenshot collection for each major component/UI
   - Set up automated documentation generation
   - Implement before/after comparison system
   - Establish baseline screenshots for all components

### Deliverables
- Component health assessment report
- Automated testing pipeline with Playwright
- Visual regression testing system
- Baseline screenshots in `/docs/screenshots`
- Documentation system for UI states

## Phase 1: Foundation & Core Components (Week 1-2)

### Goals
- Establish reliable WebSocket communication patterns
- Create shared component architecture
- Ensure REPL functionality works end-to-end
- Implement error handling and fallbacks
- Achieve visual proof of functionality through screenshots

### Tasks
1. **Refactor WebSocket Service**
   - Create WebSocketService as a standalone module with proper connection lifecycle
   - Implement connection state management with reconnect logic
   - Add request-response pattern for specific backend operations
   - Create connection status component with Playwright tests
   - Generate screenshots showing connection states (disconnected, connecting, connected)

2. **Shared Component Base**
   - Create `BaseComponent` with common loading/error states
   - Implement `DataDisplay` component for showing various data types (tasks, concepts, beliefs)
   - Create `InputComponent` for Narsese input with validation
   - Build `StatusIndicator` for WebSocket and system status
   - Add Playwright tests with visual screenshots for each component state
   - Generate documentation screenshots for `/docs/screenshots`

3. **Message Handling System**
   - Implement message routing with type validation
   - Create message handlers for different data types
   - Add message queuing for offline scenarios
   - Add visual indicators for message processing with screenshots

### Deliverables
- Working REPL with basic functionality
- Shared component library with screenshots
- Robust WebSocket connection with visual confirmation
- Error boundary system with visual tests
- Screenshot documentation in `/docs/screenshots` (1+ per component)

## Phase 2: REPL Enhancement (Week 3-4)

### Goals
- Improve REPL user experience
- Add command history and autocomplete
- Implement task visualization
- Enhance input validation and feedback
- Maintain visual validation for all enhancements

### Tasks
1. **Enhanced REPL Interface**
   - Add command history with up/down arrow navigation
   - Implement syntax highlighting for Narsese input with screenshot validation
   - Create task display with configurable filtering
   - Add ability to interact with individual tasks
   - Generate before/after screenshots for each enhancement

2. **Visualization Components**
   - Task timeline visualization with screenshot documentation
   - Concept relationship diagrams with visual tests
   - Priority and confidence indicators with visual feedback
   - Real-time updates for incoming tasks with visual confirmation

3. **Input Enhancement**
   - Input validation with helpful error messages and screenshots
   - Command autocomplete and suggestions with visual states
   - Batch input processing
   - Command history with search and visual feedback

### Deliverables
- Enhanced REPL with rich interactions and visual proof
- Visual representations of tasks and concepts with documentation
- Improved input experience with visual feedback
- Real-time data updates with visual confirmation
- Updated screenshots in `/docs/screenshots`

## Phase 3: Cognitive IDE Foundation (Week 5-6)

### Goals
- Leverage shared components from REPL
- Create flexible IDE layout system
- Implement multi-panel interface
- Add workspace management
- Validate all components visually

### Tasks
1. **Layout System**
   - Implement drag-and-drop panel layout with visual tests
   - Create configurable workspace presets with screenshots
   - Add panel resizing and docking with visual feedback
   - Implement layout persistence with before/after states

2. **IDE-Specific Components**
   - Concept explorer panel with visual validation
   - Reasoning trace visualization with screenshots
   - Demo runner interface with visual states
   - System configuration panel with documentation images

3. **Workspace Management**
   - Save/load workspace layouts with visual confirmation
   - Session persistence with visual feedback
   - Multiple workspace support with screenshots
   - Import/export functionality with visual validation

### Deliverables
- Flexible layout system with visual proof
- IDE-specific panels using shared components (with screenshots)
- Workspace management features with visual validation
- Consistent look and feel with REPL (validated visually)
- Updated documentation in `/docs/screenshots`

## Phase 4: Advanced Features & Optimization (Week 7-8)

### Goals
- Add advanced visualization capabilities
- Optimize performance and bundle size
- Enhance accessibility
- Add advanced interaction modes
- Maintain comprehensive visual validation

### Tasks
1. **Visualization Enhancements**
   - Graph-based relationship visualization with screenshots
   - Time-series data visualization with visual tests
   - Concept hierarchy display with documentation images
   - Interactive reasoning chain tracing with visual feedback

2. **Performance Optimization**
   - Virtual scrolling for large datasets with performance screenshots
   - Memoization for expensive computations with validation
   - Code splitting for bundle optimization with metrics
   - Web worker for heavy computations with performance validation

3. **Advanced Features**
   - Keyboard shortcut system with visual reference
   - Export functionality with preview screenshots
   - Advanced filtering and search with visual feedback
   - Customizable themes with before/after screenshots

### Deliverables
- Advanced visualization tools with screenshots
- Optimized performance with metrics and visuals
- Comprehensive feature set with visual validation
- Enhanced user experience with documentation

## Technical Approach for Guaranteed Success

### Guaranteed Success Strategies
1. **Visual-First Development**
   - Every component change must have a corresponding screenshot
   - Visual regression tests ensure no visual breaking changes
   - Screenshot-based documentation provides immediate visual feedback

2. **Automated Testing Pipeline**
   - Unit tests for business logic
   - Component tests for UI logic
   - Integration tests for WebSocket connections
   - E2E tests with Playwright for full user flows
   - Visual regression tests for visual consistency

3. **Progressive Enhancement**
   - Start with minimal working functionality
   - Add features incrementally with visual validation
   - Always maintain a working baseline
   - Visual feedback at each step

### Shared Component Architecture
- **Parameterized Components**: Create components that accept configuration objects instead of multiple specific variants
- **Component Factories**: Generate specialized components from common base
- **Hooks Architecture**: Shared logic through custom React hooks
- **Design System**: Consistent styling and component behavior
- **Visual Validation**: Every component change produces a screenshot

### WebSocket Communication
- **Message Types**: Standardize message types across all components
- **Request-Response**: Implement proper request-response pattern for commands
- **Event Streaming**: Handle real-time updates through event streams
- **Connection Fallbacks**: Implement graceful degradation when connection is lost
- **Visual Feedback**: Connection states visible and tested with screenshots

### Code Size Reduction
- **Component Composition**: Build complex components from simple, reusable parts
- **Conditional Rendering**: Use props to determine component behavior instead of creating multiple variants
- **Shared Utilities**: Centralize common functions and utilities
- **Tree Shaking**: Ensure unused code is properly eliminated

### Error Handling & Resilience
- **Global Error Boundary**: Catch errors that bubble up
- **Local Error Handling**: Component-specific error states
- **Connection Graceful Degradation**: Function without WebSocket when necessary
- **Data Fallbacks**: Use sample data when real data is unavailable
- **Visual Error States**: All error states documented with screenshots

## Visual Testing & Documentation Strategy

### Playwright Screenshot System
1. **Component Screenshot Tests**:
   ```javascript
   // For each component, capture different states:
   // - Loading state
   // - Error state
   // - Empty state
   // - Normal state
   // - Interaction states (hover, focus, etc.)
   ```

2. **UI Flow Screenshots**:
   - Complete user workflows with screenshots at each step
   - Before/after comparison for changes
   - Error states and recovery paths documented visually

3. **Documentation Screenshots**:
   - Place all screenshots in `/docs/screenshots`
   - Organize by component/feature
   - Link to relevant code and tests

### Automated Visual Validation
- Run visual regression tests on every commit
- Compare current UI against baseline screenshots
- Generate visual diff reports
- Block deployments if visual regressions detected

## Implementation Guidelines

### Component Design
1. **Props Over State**: Minimize internal state, prefer props-driven components
2. **Configuration Over Specialization**: Use configuration objects to customize behavior
3. **Composition Over Inheritance**: Build complex UIs by composing simple components
4. **Consistent Interfaces**: Standardize prop names and patterns across components
5. **Visual Validation Required**: Every component change must include visual tests

### Communication Patterns
1. **Message Contracts**: Define clear contracts for WebSocket message types
2. **Request IDs**: Implement request-response correlation for complex interactions
3. **Error Responses**: Ensure all requests can receive error responses
4. **Progress Updates**: Send progress updates for long-running operations
5. **Visual Feedback**: All communication states visually represented

### Performance Considerations
1. **Virtualization**: Use virtual scrolling for large lists
2. **Memoization**: Cache expensive computations
3. **Lazy Loading**: Load components and data only when needed
4. **Efficient Updates**: Batch state updates and minimize re-renders
5. **Visual Performance**: Performance metrics captured visually

## Success Metrics with Visual Validation

### Technical Metrics
- Bundle size stays under 2MB
- Component reuse rate >70% between REPL and IDE
- WebSocket connection success rate >95%
- Error boundary catch rate <1% of sessions
- Visual regression test pass rate: 100%

### Visual & User Experience Metrics
- Time from load to first visual element <2 seconds
- All components have baseline screenshots in `/docs/screenshots`
- No visual regressions in automated tests
- Command response time <500ms when connected
- No blank screen states during normal usage (validated visually)
- Intuitive navigation between features (validated through user flows)

## Risk Management with Visual Safety Nets

### Technical Risks
- **WebSocket Connection Issues**: Implement comprehensive fallback strategies with visual indicators
- **Performance Degradation**: Monitor and optimize with visual performance metrics
- **Code Complexity**: Maintain code organization with visual component maps
- **Browser Compatibility**: Test across browsers with visual regression tests

### Visual Risk Mitigation
- Visual regression testing on every commit
- Screenshot-based documentation prevents visual degradation
- Component health snapshots provide immediate feedback
- Visual workflow validation ensures functionality

### Mitigation Strategies
- Maintain comprehensive test coverage (unit + component + E2E + visual)
- Implement gradual feature rollout with visual validation
- Use feature flags for experimental functionality with visual testing
- Monitor real user interactions and visual performance
- Visual documentation prevents knowledge loss

## Iteration Process with Visual Validation

### Weekly Cycles with Visual Checkpoints
1. **Planning**: Review progress with visual baselines, adjust priorities
2. **Development**: Implement highest priority items with visual tests
3. **Testing**: Verify functionality, performance, and visual consistency
4. **Screenshot Review**: Validate all visual changes with documentation
5. **Demo**: Show visual progress to stakeholders
6. **Retrospective**: Identify visual and functional improvements for next cycle

### Continuous Integration Pipeline
- Automated unit testing on every commit
- Component screenshot testing
- Visual regression testing
- E2E testing with Playwright
- Performance monitoring with visual metrics
- Code quality checks

## Visual Documentation System (`/docs/screenshots`)

### Organization
- `/docs/screenshots/components/` - Individual component states
- `/docs/screenshots/flows/` - Complete user workflows
- `/docs/screenshots/states/` - Error/loading/empty states
- `/docs/screenshots/before-after/` - Feature comparisons

### Automated Generation
- Scripts to generate screenshots automatically
- Integration with testing pipeline
- Version control for baseline screenshots
- Diff generation for changes