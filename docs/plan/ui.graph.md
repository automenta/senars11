# SeNARS Graph Visualizer Specifications

## Purpose
- Demonstrate reasoning examples and neural-symbolic integration
- For: education, demonstration, development, and analysis of NAL+LM reasoning
- Visualize the hybrid neuro-symbolic reasoning process in real-time
- Enable understanding of concept formation, task processing, and knowledge evolution
- Serve as foundation for advanced analysis and debugging tools
- Provide insight into the interplay between symbolic and neural reasoning

## Usability
- Exists as a separate entry-point `npm run web:graph:dev`
- Keep existing `npm run web:dev` entry-point intact, mounting this at a separate URL, ex: `/graph`
- Share components with `ui/` UI's. Enable embedding as a component in other UI's
- Intuitive UI with minimal cognitive overhead for users
- Progressive disclosure of complexity (simple view by default, detailed view on demand)
- Consistent with existing SeNARS UI patterns and controls
- Keyboard navigation and accessibility support for diverse user needs
- Context-aware tooltips and documentation for learning curve reduction

## Aesthetics
- Impressive and informative visualizations that reflect the sophistication of the underlying system
- Adhere to 'Form-Follows-Function' principles to ensure visual elements convey meaningful information
- Animations that highlight reasoning processes and temporal relationships
- Color coding that follows consistent semantic patterns (blue: concepts, green: tasks, orange: beliefs, red: goals, purple: questions)
- Emojis and visual mnemonics that align with SeNARS semantic patterns
- Visual hierarchy that emphasizes important reasoning elements and relationships
- Responsive design that works well on various device sizes and screen real estate
- Dark/light mode support for extended use and preference accommodation

## Dependencies

### Frontend Dependencies
- **React 18+**: UI framework
- **D3.js**: Graph visualization and layout algorithms
- **react-force-graph**: Force-directed graph rendering with 2D canvas
- **dagre**: Hierarchical layout algorithms
- **react-use**: React hooks utilities
- **@emotion/styled** or **styled-components**: CSS-in-JS styling (consistent with existing UI)
- **react-icons**: Icon components
- **uuid**: Unique identifier generation
- **immer**: Immutable state updates
- **zustand**: Lightweight state management (consistent with existing architecture)
- **socket.io-client**: WebSocket communication client (consistent with existing architecture)
- **react-virtual**: Virtual scrolling for performance with large datasets
- **recharts** or **nivo**: Advanced charting for metrics and analytics

### Backend Dependencies
- **ws**: WebSocket server implementation (consistent with existing architecture)
- **express**: Web server framework (consistent with existing architecture)
- **cors**: Cross-origin resource sharing middleware
- **compression**: HTTP response compression
- **eventemitter3**: Enhanced event management for observer patterns

## WebSocket Protocol Integration

### Protocol Overview
The graph visualizer leverages the existing SeNARS WebSocket infrastructure with extensions for graph observability. The protocol is designed to be consistent with existing SeNARS messaging patterns and easily extensible for optional pathway features.

### Message Format
Messages follow the existing SeNARS format with optional graph-specific extensions:

```
{
  id: string,           // Unique message identifier for tracking
  type: string,         // Message type (see below) - consistent with existing SeNARS patterns
  timestamp: number,    // Client/server timestamp
  payload: any          // Message-specific data
}
```

### Core Messages (Required for PATH 1A & 1B)
```
// NAR Control Commands (reuse existing patterns)
{type: "nar/control", payload: {command: "start|stop|step|reset|pause"}}
{type: "nar/status", payload: {running: boolean, clock: number, cycle: number}}

// Basic Graph Data Updates
{type: "graph/node/add", payload: {id: string, term: string, type: "concept|task", priority: number}}
{type: "graph/node/remove", payload: {id: string}}
{type: "graph/edge/add", payload: {id: string, source: string, target: string, type: "taskConcept"}}
```

### Extended Messages (Optional pathways as needed)
```
// PATH 2A/2B: Enhanced Node Types & Relationships
{type: "graph/node/add", payload: {id: string, term: string, type: "concept|task|belief|goal|question", priority: number, frequency: number, confidence: number}}

// PATH 2B: Enhanced Relationships
{type: "graph/edge/add", payload: {id: string, source: string, target: string, type: "taskConcept|embedding|subterm|inference", strength: number}}

// PATH 3A: Basic Interaction
{type: "graph/node/highlight", payload: {id: string, highlight: boolean}}
{type: "graph/state", payload: {selectedNode: string}}

// PATH 3B: Layout Options
{type: "graph/layout/change", payload: {type: "force-directed|hierarchical|circular"}}

// PATH 4B: Filtering & Search
{type: "graph/filter", payload: {nodeTypes: string[], minPriority: number}}
{type: "graph/search", payload: {query: string}}

// PATH 6A: Analysis Tools
{type: "system/metrics", payload: {performance: {fps: number, renderTime: number}}}
```

### Basic Graph Data Structure (PATH 1A minimum)
```javascript
// Core Node Structure
{
  id: string,
  term: string,                       // Narsese representation
  type: "concept|task",               // Node type for basic visualization
  priority: number,                   // For sizing/positioning
  createdAt: number                   // Timestamp
}

// Core Edge Structure
{
  id: string,
  source: string,                     // Source node ID
  target: string,                     // Target node ID
  type: "taskConcept",                // Basic relationship type
  createdAt: number                   // Timestamp
}
```

### Extended Graph Data Structure (Optional pathways - PATH 2A, 2B, etc.)
```javascript
// Enhanced Node Structure
{
  id: string,
  term: string,                       // Narsese representation
  type: "concept|task|belief|goal|question",  // Full SeNARS types
  priority: number,                   // For sizing
  frequency: number,                  // Truth frequency (for beliefs/goals)
  confidence: number,                 // Truth confidence
  x: number, y: number,               // Position for layout
  createdAt: number,
  metadata?: {                        // Optional for advanced pathways
    activationLevel?: number,
    provenance?: string[]
  }
}

// Enhanced Edge Structure
{
  id: string,
  source: string,
  target: string,
  type: "taskConcept|embedding|subterm|inference|temporal", // Rich relationship types
  strength: number,                   // Relationship strength
  createdAt: number,
  metadata?: {                        // Optional for advanced pathways
    weight?: number,
    provenance?: string[]
  }
}
```

### Connection Management (consistent with existing implementation)
- **Session ID**: Each client gets a unique session ID for tracking (consistent with existing WebSocket implementation)
- **Reconnection**: Automatic reconnection with exponential backoff (consistent with existing WebSocket implementation)
- **Heartbeat**: Periodic ping/pong to detect connection issues (consistent with existing WebSocket implementation)
- **Message Queuing**: Queue messages when connection is temporarily down (consistent with existing WebSocket implementation)
- **State Recovery**: Resend recent graph state when reconnected (consistent with existing WebSocket implementation)
- **Partial Updates**: Send only relevant data during reconnection to reduce bandwidth

## Server Functionality Integration

### Graph Observer Architecture (Pathway-Based)
The graph visualization functionality should be implemented as extensions to the existing SeNARS monitoring capabilities. This approach allows for progressive enhancement with pathway-specific features.

#### Core Integration Points (PATH 1A & 1B - Essential)
```
src/server/
├── WebSocketMonitor.js           # Extend existing WebSocket monitoring with basic graph events
└── GraphObserver.js              # New: Observes NAR events for graph data (basic concepts/tasks only)

ui/src/services/
├── WebSocketService.js           # Extend with basic graph message handling

ui/src/stores/
└── uiStore.js                    # Extend with basic graph state (nodes, edges, layout)

ui/src/components/
└── Graph/                        # New graph components (minimal: basic canvas, nodes, edges)
```

#### Extended Integration Points (Optional pathways as needed)
```
src/server/
├── GraphObserver.js              # Enhanced with pathway-specific events (2A, 2B, etc.)
└── protocols/
    └── GraphProtocol.js          # Optional: Advanced protocol handling (for PATH 4B, 6A, etc.)

ui/src/
├── hooks/                        # Additional pathway-specific hooks
├── utils/                        # Graph transformation utilities (enhanced as needed)
└── providers/                    # Optional additional context providers
```

#### Basic Event Integration (PATH 1A & 1B)
The GraphObserver subscribes to essential NAR events for basic visualization:

1. **Core Concept/Task Events**:
   - `task.input` - New tasks from NARS input
   - `task.processed` - Processed tasks that may create new concepts
   - `concept.created` - New concepts in memory

#### Extended Event Integration (Optional pathways)
1. **PATH 2A**: Additional node types
   - `belief.added` - Belief creation and updates
   - `question.answered` - Question processing results
   - `goal.created` - Goal creation events

2. **PATH 2B**: Relationship discovery
   - `embedding.relationship.added` - Semantic similarity events
   - `term.relationship.added` - Structural relationships
   - `reasoning.step` - Inference derivation events

#### Basic Server-Side Implementation
The existing infrastructure is extended minimally for the essential pathways:

```javascript
// In WebSocketMonitor.js - Basic extension
class WebSocketMonitor {
  constructor(options = {}) {
    // ... existing constructor code ...

    // Minimal graph state for PATH 1A
    this.graphState = {
      nodeCount: 0,
      edgeCount: 0,
      config: {
        enabled: true,
        maxNodes: 200,  // Conservative default for MVP
        maxEdges: 500
      }
    };
  }

  // Basic NAR event subscription for core visualization
  listenToNAR(nar) {
    if (!nar || !nar.on) {
      throw new Error('NAR instance must have an on() method');
    }

    this._nar = nar;

    // Core events needed for PATH 1A & 1B
    const CORE_EVENTS = [
      'task.input',
      'task.processed',
      'concept.created',
      'concept.updated',
      'system.started',
      'system.stopped'
    ];

    CORE_EVENTS.forEach(eventName => {
      nar.on(eventName, (data, metadata) => {
        // Transform to basic graph events and broadcast
        this._transformAndBroadcast(eventName, data, metadata);
      });
    });

    console.log('WebSocket monitor extended for basic graph visualization (PATH 1A & 1B)');
  }

  _transformAndBroadcast(eventName, data, metadata) {
    let graphEvent;

    switch(eventName) {
      case 'task.input':
      case 'task.processed':
        // Transform task to basic node
        graphEvent = {
          type: 'graph/node/add',
          payload: {
            id: `task-${data.id || Date.now()}`,
            term: data.term?.toString() || 'unknown',
            type: data.type || 'task',
            priority: data.priority || 0
          }
        };
        break;
      case 'concept.created':
        // Transform concept to basic node
        graphEvent = {
          type: 'graph/node/add',
          payload: {
            id: `concept-${data.term || Date.now()}`,
            term: data.term?.toString() || 'unknown',
            type: 'concept',
            priority: data.priority || 0
          }
        };
        break;
      case 'system.started':
      case 'system.stopped':
        // Pass through system events for controls
        graphEvent = { type: 'nar/status', payload: { running: eventName === 'system.started' } };
        break;
      default:
        return; // Ignore other events for basic pathway
    }

    if (graphEvent) {
      this.broadcastEvent(graphEvent.type, {
        data: graphEvent.payload,
        metadata: metadata || {},
        timestamp: Date.now()
      });
    }
  }

  _routeMessage(client, message) {
    // ... existing routing logic ...

    // Basic graph routing for PATH 1B
    if (message.type === 'graph/state' || message.type === 'graph/layout') {
      // Handle basic interaction/state messages
      this.broadcastEvent(message.type, message.payload);
      return;
    }

    // ... rest of existing routing ...
  }
}
```

#### UI Store Extension (Pathway-Progressive)
```javascript
// Minimal extension for PATH 1A & 1B
const INITIAL_STATE = Object.freeze({
  // ... existing state properties ...

  // Basic graph state
  graphNodes: [],
  graphEdges: [],
  graphLayout: 'force-directed',
  graphSelection: {
    selectedNode: null
  }
});

// Basic graph actions (PATH 1A & 1B)
const createActions = (set, get) => {
  return {
    // ... existing actions ...

    // Essential graph actions
    addGraphNode: (node) => set(state => ({ graphNodes: [...state.graphNodes, node] })),
    removeGraphNode: (id) => set(state => ({
      graphNodes: state.graphNodes.filter(n => n.id !== id)
    })),
    clearGraphNodes: () => set({ graphNodes: [] }),
    addGraphEdge: (edge) => set(state => ({ graphEdges: [...state.graphEdges, edge] })),
    setGraphLayout: (layout) => set({ graphLayout: layout }),
    setGraphSelection: (selection) => set({ graphSelection: { selectedNode: selection } })
  };
};
```

#### Configuration Options (Progressive Enhancement)
- `graph.enabled`: Whether graph visualization is enabled (default: true)
- `graph.maxNodes`: Maximum nodes for basic visualization (default: 200 for PATH 1A)
- `graph.observabilityEnabled`: Whether to broadcast graph events (default: true)
- `graph.layoutAlgorithm`: Default layout (default: "force-directed")

#### Performance Considerations (Deferred until needed)
- **Throttling**: Basic update rate limiting (conservative, only when needed)
- **Delta Updates**: Send only changes to minimize traffic
- **Node Limiting**: Conservative defaults that can be increased as needed
- **Priority Filtering**: Basic implementation for performance (only if performance issues arise)

## UI/UX Design Principles

### User Interface Guidelines
- **Consistent Navigation**: Use the same controls and patterns as existing SeNARS UIs (following existing button layouts, keyboard shortcuts, and interaction patterns)
- **Progressive Disclosure**: Show essential information by default, with options to reveal more detail (maintaining consistency with existing Panel.js patterns)
- **Intuitive Controls**: Use familiar patterns (zoom, pan, selection) with clear affordances (consistent with existing ReasonerControls.js)
- **Visual Hierarchy**: Emphasize important elements using size, color, and positioning (following existing UI store patterns)
- **Responsive Design**: Work well on different screen sizes and devices (consistent with existing LayoutManager.js)
- **Accessibility**: Support keyboard navigation, screen readers, and color-blind accessibility (following existing accessibility patterns in BasePanel.js)
- **Contextual Help**: Provide tooltips and contextual information for complex concepts (consistent with existing EnhancedInputInterface.js patterns)

### Visual Encoding Strategy
- **Node Types**: Color-coded by SeNARS type (blue: concept, green: task, orange: belief, red: goal, purple: question) - consistent with existing GraphUI.js and TaskRelationshipGraph.js
- **Node Size**: Proportional to priority/frequency values (higher values = larger nodes) - following existing TaskPanel.js patterns
- **Node Border**: Thickness indicates confidence level (higher confidence = thicker border) - consistent with existing visualization in GraphUI.js
- **Node Opacity**: Indicates recency/activation (fresher nodes more opaque) - extending existing visual patterns
- **Edge Types**: Different line styles for relationship types (solid: direct assignment, dashed: similarity, dotted: inference) - consistent with existing TaskRelationshipGraph.js
- **Edge Thickness**: Proportional to relationship strength - following existing visualization conventions
- **Animations**: Subtle animations to show reasoning process (pulsing for active processing, transitions for new elements) - consistent with existing UI animation patterns
- **Highlighting**: Visual emphasis for selected/related elements during interaction - following existing selection patterns in existing components

### Interaction Design
- **Selection**: Click to select nodes/edges with visual feedback and detailed information display (consistent with existing TaskPanel.js selection patterns)
- **Hover Details**: Show term content and key metrics on hover with brief delay (maintaining consistency with existing DataItem.js patterns)
- **Right-click Menu**: Context-sensitive actions for selected elements (inspect, focus, filter) - maintaining consistency with existing UI interaction patterns
- **Keyboard Shortcuts**: Common actions accessible via keyboard (consistent with existing UI shortcuts) - following existing application patterns
- **Search**: Find specific terms or concepts in the graph with fuzzy matching (integrating with existing search patterns in ExplorerPanel.js)
- **Filtering**: Toggle visibility of different node/edge types via clear controls with visual indicators (consistent with existing filtering in GenericPanel.js)
- **Zoom/pan**: Intuitive navigation with mouse wheel and drag controls (consistent with existing visualization components)
- **Focus Mode**: Center view on specific nodes with related elements highlighted (maintaining consistency with existing focus patterns)

## Modularity and Component Reusability

### Shared Components Architecture (Extends Existing Patterns)
The graph visualizer should be built with modularity in mind to enable reuse across different UIs while maintaining consistency with existing architecture:

```
ui/
├── components/                          # Follows existing component organization
│   ├── Graph/                          # New graph-specific components (integrated with existing structure)
│   │   ├── GraphCore/                  # Reusable core graph components
│   │   │   ├── GraphCanvas.js          # Core canvas rendering (extends existing visualization patterns)
│   │   │   ├── Node.js                 # Node rendering component (consistent with existing DataItem.js)
│   │   │   ├── Edge.js                 # Edge rendering component (follows existing patterns)
│   │   │   ├── GraphControls.js        # Standard graph controls (extends existing ReasonerControls.js)
│   │   │   └── GraphLayoutManager.js   # Layout management (integrated with existing LayoutManager.js)
│   │   ├── GraphVisualizer/            # Full visualizer UI (consistent with existing panel patterns)
│   │   │   ├── GraphView.js            # Top-level graph view (follows BasePanel.js patterns)
│   │   │   ├── GraphSidebar.js         # Sidebar with controls/inspector (consistent with existing panels)
│   │   │   └── GraphToolbar.js         # Toolbar with actions (extends existing toolbar patterns)
│   │   ├── GraphInspection/            # Inspection tools (integrated with existing trace patterns)
│   │   │   ├── NodeInspector.js        # Node detail inspector (consistent with TraceInspector.js)
│   │   │   ├── EdgeInspector.js        # Edge detail inspector (follows existing inspection patterns)
│   │   │   └── GraphMetrics.js         # Graph metrics display (consistent with SystemStatusPanel.js)
│   │   └── GraphFilters/               # Filtering components (follows existing filtering patterns)
│   │       ├── NodeTypeFilter.js       # Node type filtering (extends existing filtering logic)
│   │       ├── EdgeTypeFilter.js       # Edge type filtering (consistent with existing patterns)
│   │       └── PriorityFilter.js       # Priority/range filtering (follows existing priority patterns)
├── hooks/                              # Extends existing hook patterns
│   ├── useGraphData.js                 # Graph data management (follows existing hook patterns)
│   ├── useGraphLayout.js               # Layout algorithms (consistent with existing use patterns)
│   ├── useGraphFiltering.js            # Filtering logic (extends existing filtering hooks)
│   └── useGraphSelection.js            # Selection management (consistent with existing selection patterns)
├── providers/                          # Extends existing provider patterns
│   ├── GraphDataProvider.js            # Graph data context (integrates with existing uiStore.js)
│   ├── GraphLayoutProvider.js          # Layout preferences context (consistent with existing context patterns)
│   └── GraphThemeProvider.js           # Theming context (extends existing theme patterns)
└── utils/                              # Extends existing utility patterns
    ├── graph/                          # Graph-specific utilities (following existing utility structure)
    │   ├── layout.js                   # Layout algorithms (consistent with existing utils/)
    │   ├── filtering.js                # Filtering algorithms (extends existing patterns)
    │   ├── metrics.js                  # Graph metrics (follows existing metric patterns)
    │   └── transformers.js             # Data transformation utilities (integrates with existing patterns)
    └── visualization/                  # Visualization utilities (extends existing patterns)
        ├── nodes.js                    # Node visualization utilities (consistent with existing patterns)
        └── edges.js                    # Edge visualization utilities (follows existing patterns)
```

### Integration with Existing Components
Since the system already has `GraphUI.js` and `TaskRelationshipGraph.js`, the new components should extend and enhance these existing patterns:

```jsx
// Example integration with existing GraphUI.js patterns
// ui/src/components/Graph/GraphCore/GraphCanvas.js
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { addEdge, Background, Controls, MarkerType, MiniMap, ReactFlow, useEdgesState, useNodesState } from 'reactflow';
import useUiStore from '../../stores/uiStore.js';
import { getTaskColor } from '../../utils/taskUtils.js';
import { themeUtils } from '../../utils/themeUtils.js';
import { useGraphData } from '../../hooks/useGraphData.js';
import { useGraphLayout } from '../../hooks/useGraphLayout.js';
import { useGraphFiltering } from '../../hooks/useGraphFiltering.js';

// Reuse existing node component patterns from GraphUI.js
const ConceptNode = memo(({ data }) => {
  // ... similar implementation to existing GraphUI.js but with enhanced capabilities ...
  return React.createElement('div', {
    style: {
      padding: '10px',
      borderRadius: '8px',
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      border: `2px solid ${data.isSelected ? '#007bff' : '#666'}`,
      textAlign: 'center',
      minWidth: '120px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
  },
  React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '5px' } }, data.label),
  React.createElement('div', { style: { fontSize: '0.8em' } }, `Priority: ${(data.priority || 0).toFixed(2)}`)
  );
});

// Enhanced data processing that extends existing patterns
const EnhancedGraphCanvas = () => {
  // Use extended graph data from uiStore (with graph-specific state)
  const graphNodes = useUiStore(state => state.graphNodes);
  const graphEdges = useUiStore(state => state.graphEdges);
  const graphFilters = useUiStore(state => state.graphFilters);
  const graphLayout = useUiStore(state => state.graphLayout);

  // Reuse existing concepts/tasks from store alongside new graph data
  const concepts = useUiStore(state => state.concepts);
  const tasks = useUiStore(state => state.tasks);
  const beliefs = useUiStore(state => state.beliefs);
  const goals = useUiStore(state => state.goals);

  // ... implementation that extends existing GraphUI.js patterns ...
};

export default EnhancedGraphCanvas;
```

## Development Paths (Decomposed & Prioritized)

### PATH 1A: Basic Graph Visualization (Essential MVP)
**Goal**: Minimal viable graph visualization with core functionality

#### Essential Components
- **Basic Graph Canvas**
  - Simple force-directed visualization (using `react-force-graph`)
  - Node representation for concepts and tasks (basic circles/rectangles)
  - Basic zoom and pan controls (using existing UI patterns)
- **Core Data Pipeline**
  - Connect to existing WebSocket service
  - Receive and display concept/task nodes from NAR
  - Basic relationship edges (task → concept associations)

#### MVP Features List
- [ ] Basic graph canvas with zoom/pan functionality
- [ ] Simple node rendering (concepts and tasks)
- [ ] Basic color coding (blue for concepts, green for tasks)
- [ ] Connect to WebSocket service and receive NAR data
- [ ] Render basic task → concept relationships
- [ ] Development server with `npm run web:graph:dev`
- [ ] Basic UI integration with existing app structure

#### Technical Requirements
```
ui/
├── components/
│   ├── Graph/
│   │   ├── GraphView.js              # Basic canvas component
│   │   ├── BaseNode.js               # Basic node rendering
│   │   └── BaseEdge.js               # Basic edge rendering
│   ├── hooks/
│   │   └── useGraphData.js           # Basic data fetching
```

### PATH 1B: Essential Controls (Essential MVP)
**Goal**: Basic system controls for demonstration and development

#### Essential Components
- **System Controls** (reuse existing `ReasonerControls.js` patterns)
  - Pause/Resume/Step buttons
  - NAR status display (running, clock time)
  - Basic error/status reporting
- **Minimal UI Framework** (extending existing patterns)
  - Basic panel layout
  - Error boundary protection

#### MVP Features List
- [ ] Pause/Resume/Step controls (reusing existing patterns)
- [ ] Basic NAR status display (clock, running state)
- [ ] Error boundary implementation
- [ ] Basic layout with controls panel
- [ ] Integration with existing theme system

### PATH 2A: Enhanced Node Types (Optional - Deferred)
**Goal**: Support for additional SeNARS node types (Beliefs, Goals, Questions)

#### Enhanced Components
- **Extended Node Types**
  - Belief nodes (orange) with frequency/confidence display
  - Goal nodes (red) with desire/confidence display
  - Question nodes (purple) with priority display

#### Features List
- [ ] Support for belief nodes with visual indicators for frequency/confidence
- [ ] Support for goal nodes with visual indicators for desire/confidence
- [ ] Support for question nodes with priority indicators
- [ ] Different visual encodings for each node type

### PATH 2B: Enhanced Relationships (Optional - Deferred)
**Goal**: Visualize additional relationship types beyond basic task→concept

#### Enhanced Components
- **Advanced Relationships**
  - Concept → concept embedding relationships
  - Concept → concept subterm relationships
  - Task → task inference relationships

#### Features List
- [ ] Concept embedding relationship visualization
- [ ] Concept subterm relationship visualization
- [ ] Task inference relationship visualization
- [ ] Different edge styles for different relationship types

### PATH 3A: Basic Interaction (Optional - Deferred)
**Goal**: Enable basic user interaction with the graph

#### Interaction Components
- **Node Selection**
  - Click to select nodes
  - Visual indication of selection
- **Hover Information**
  - Show node details on hover
  - Tooltips with term content

#### Features List
- [ ] Node selection functionality
- [ ] Visual selection highlighting
- [ ] Hover tooltips with node information
- [ ] Basic context menu for selected nodes

### PATH 3B: Layout Options (Optional - Deferred)
**Goal**: Multiple graph layout algorithms

#### Layout Components
- **Multiple Layouts**
  - Hierarchical layout option
  - Circular layout option
  - Grid layout option

#### Features List
- [ ] Hierarchical layout algorithm
- [ ] Circular layout algorithm
- [ ] Grid layout algorithm
- [ ] Layout switching UI controls

### PATH 4A: Enhanced Styling (Optional - Deferred)
**Goal**: Enhanced visual encodings and styling

#### Styling Components
- **Advanced Visual Encoding**
  - Node size based on priority/frequency
  - Border thickness for confidence
  - Edge thickness for relationship strength
- **Visual Enhancements**
  - Directional arrows on edges
  - Edge labels
  - Animation for new elements

#### Features List
- [ ] Node sizing based on priority/frequency
- [ ] Border thickness based on confidence
- [ ] Edge thickness based on relationship strength
- [ ] Directional arrows on edges
- [ ] Edge labels for relationship types
- [ ] Basic animations for new nodes/edges

### PATH 4B: Filtering & Search (Optional - Deferred)
**Goal**: Enable filtering and searching of graph elements

#### Filtering Components
- **Node/Edge Filtering**
  - Filter by type (concepts, tasks, beliefs, goals, questions)
  - Filter by priority range
  - Filter by relationship type
- **Search Functionality**
  - Search by term content
  - Highlight search results

#### Features List
- [ ] Node type filtering controls
- [ ] Priority/range filtering
- [ ] Relationship type filtering
- [ ] Term content search
- [ ] Search result highlighting

### PATH 5A: Advanced Interactions (Optional - Deferred)
**Goal**: Advanced user interaction patterns

#### Advanced Interaction Components
- **Complex Selection**
  - Multi-node selection
  - Range selection
  - Related node highlighting
- **Advanced Context Menus**
  - Node-specific actions
  - Relationship-specific actions
  - Export options

#### Features List
- [ ] Multi-node selection
- [ ] Range selection tools
- [ ] Related node highlighting
- [ ] Advanced context menus with actions
- [ ] Node inspection panel

### PATH 5B: Performance Optimization (Optional - Deferred)
**Goal**: Optimize performance for larger graphs (Defer until needed)

#### Performance Components
- **Optimization Strategies**
  - Virtual rendering for large graphs (only render visible nodes)
  - Data update throttling (limit frequency of updates)
  - Memory management (cleanup old/unused elements)
  - Efficient rendering algorithms (debounce/redraw optimization)

#### Features List (Performance - Consider deferring until actually needed)
- [ ] Virtual rendering for large graphs (only render visible nodes) - *Consider deferring until performance issues appear*
- [ ] Data update throttling (limit frequency of updates) - *Consider deferring until needed*
- [ ] Memory management and cleanup (remove old elements) - *Consider deferring until needed*
- [ ] Efficient rendering algorithms (debounce/redraw optimization) - *Consider deferring until needed*

### PATH 6A: Analysis Tools (Optional - Deferred)
**Goal**: Analytical capabilities for the graph data

#### Analysis Components
- **Graph Analysis**
  - Node centrality metrics
  - Relationship strength analysis
  - Pattern detection
- **Export Capabilities**
  - Export graph as image/PDF
  - Export analysis results

#### Features List
- [ ] Node centrality analysis
- [ ] Relationship strength analysis
- [ ] Pattern detection algorithms
- [ ] Image/PDF export functionality
- [ ] Analysis result export

### PATH 6B: Timeline Visualization (Optional - Deferred)
**Goal**: Temporal visualization of reasoning evolution

#### Timeline Components
- **Temporal View**
  - Reasoning timeline
  - State evolution visualization
  - Historical graph reconstruction

#### Features List
- [ ] Reasoning timeline view
- [ ] State evolution visualization
- [ ] Historical graph reconstruction
- [ ] Timeline scrubbing controls

### PATH 7A: Collaboration Features (Optional - Deferred)
**Goal**: Multi-user collaboration capabilities

#### Collaboration Components
- **Shared Sessions**
  - Multi-user graph viewing
  - Shared analysis sessions
- **Collaboration Tools**
  - Shared annotations
  - Collaborative filtering

#### Features List
- [ ] Multi-user graph viewing (shared sessions)
- [ ] Shared analysis sessions
- [ ] Collaborative annotations
- [ ] Shared filtering/selection

### PATH 7B: Component Embedding (Optional - Deferred)
**Goal**: Make graph components embeddable in other UIs

#### Embedding Components
- **Reusability Framework**
  - Standalone graph component
  - Configuration via props
  - Event callbacks for parent UIs

#### Features List
- [ ] Standalone, embeddable graph component
- [ ] Configuration via props
- [ ] Event callbacks for parent UI integration
- [ ] API for external integration

### Development Priorities & Pathways

#### PATH 1A & 1B: Core Foundation (Required for MVP)
- **PATH 1A**: Basic Graph Visualization - Simple graph canvas with concept/task nodes and basic relationships
- **PATH 1B**: Essential Controls - System controls and basic UI framework
- **Purpose**: Minimum viable visualization for demonstration and development
- **Success Criteria**: Graph displays real-time NAR data with basic controls

#### PATH 2A & 2B: Enhanced Visualization (Recommended)
- **PATH 2A**: Enhanced Node Types - Support for beliefs, goals, questions
- **PATH 2B**: Enhanced Relationships - Concept-concept relationships, inference chains
- **Purpose**: More comprehensive visualization of SeNARS reasoning
- **Success Criteria**: Visualizes all major SeNARS entity types and relationship categories

#### PATH 3A & 3B: User Interaction (Valuable additions)
- **PATH 3A**: Basic Interaction - Node selection, tooltips, context menus
- **PATH 3B**: Layout Options - Multiple layout algorithms (hierarchical, circular, etc.)
- **Purpose**: Enable user engagement with the visualization
- **Success Criteria**: Users can interact with and manipulate the graph view

#### PATH 4A & 4B: Enhanced Usability (Usability improvements)
- **PATH 4A**: Enhanced Styling - Visual encoding based on priority, confidence, etc.
- **PATH 4B**: Filtering & Search - Ability to filter and search graph elements
- **Purpose**: Improve information density and findability
- **Success Criteria**: Users can find and focus on specific elements of interest

#### PATH 5A, 6A, 6B: Advanced Analysis (Power user features)
- **PATH 5A**: Advanced Interactions - Multi-selection, complex operations
- **PATH 6A**: Analysis Tools - Centrality metrics, pattern detection
- **PATH 6B**: Timeline Visualization - Evolution of reasoning over time
- **Purpose**: Enable sophisticated analysis of reasoning patterns
- **Success Criteria**: Users can perform detailed analysis of SeNARS behavior

#### PATH 5B, 7A, 7B: Advanced Capabilities (Optional)
- **PATH 5B**: Performance Optimization - Only if performance issues arise
- **PATH 7A**: Collaboration Features - Multi-user capabilities
- **PATH 7B**: Component Embedding - Reusable components for other UIs
- **Purpose**: Scale and integrate with broader ecosystem
- **Success Criteria**: Performance is adequate for target use cases

### Pathway Implementation Strategy

**Sequential Dependencies**: Only PATH 1A & 1B are required before proceeding; all other pathways can be implemented independently.

**Parallel Development**: Multiple pathways can be developed concurrently by different team members.

**Progressive Enhancement**: Each pathway adds value without requiring other pathways to be implemented.

**Performance-First**: Never implement performance optimizations (PATH 5B) until actual performance problems are observed.

**Optional Nature**: Any pathway can be skipped entirely without impacting other pathways.

**Resource-Based Prioritization**: Teams should select pathways based on available resources and user needs.

## System Enhancement Impact

### Value to SeNARS Ecosystem
The graph visualizer implementation provides increasing value as pathways are implemented:

#### Core Value (PATH 1A & 1B)
- **Immediate Visualization**: Basic visualization of reasoning processes for debugging and education
- **Educational Tool**: Makes SeNARS concepts accessible to new users
- **Development Aid**: Simple visualization for developers to understand system behavior

#### Enhanced Value (PATH 2A, 2B, 3A, 3B)
- **Comprehensive Visualization**: Full representation of all SeNARS entity types and relationships
- **Interactive Exploration**: Users can engage with and understand complex reasoning chains
- **Insight Discovery**: Visual patterns reveal system behaviors not apparent in text logs

#### Advanced Value (PATH 4A, 4B, 5A, 6A, 6B)
- **Advanced Analysis**: Sophisticated tools for pattern recognition and performance analysis
- **Research Capabilities**: Timeline and analytical tools for studying reasoning evolution
- **Power User Features**: Filtering, search, and complex interactions for in-depth analysis

#### Scaling Value (PATH 7A, 7B)
- **Collaboration**: Multi-user capabilities for team-based analysis
- **Integration**: Embeddable components for broader ecosystem integration
- **Extensibility**: Foundation for additional visualization tools

### Architecture Benefits
- **Event System Enhancement**: Graph-specific events (PATH 2B) improve system observability
- **Data Transformation**: Improved data flow and transformation pipelines (enhanced across pathways)
- **Component Reusability**: Enhanced component architecture (PATH 7B) benefits broader system
- **API Consistency**: Extended WebSocket APIs support additional integrations

## Implementation Approach

### Progressive Enhancement Strategy
- **Start Small**: Begin with essential PATH 1A & 1B for immediate value
- **Add Value Incrementally**: Each pathway provides tangible benefits
- **Performance-Driven Optimization**: Only optimize (PATH 5B) when bottlenecks appear
- **User-Need Driven Features**: Implement pathways based on actual user requirements

### Resource Optimization
- **Parallel Development**: Multiple team members can work on independent pathways
- **Modular Architecture**: Each pathway can be developed and tested independently
- **Reusable Components**: Architecture designed to benefit other system components
- **Minimal Overhead**: Core functionality has minimal resource requirements

## Deployment & Integration

### Development Setup
- Command: `npm run web:graph:dev` (follows existing pattern from vite.config.js)
- Serves the graph visualizer at `/graph` (maintains existing routing patterns)
- Hot reloading enabled (consistent with existing development setup)
- Development tools available (extends existing development infrastructure)

### Production Deployment
- Build command: `npm run build:graph` (follows existing build patterns)
- Bundled version optimized for production (consistent with existing optimization)
- Separate from main UI build but shares common components (extends existing build architecture)

### Integration Approach
- **Extend `ui/src/components/GraphUI.js`** rather than creating duplicate functionality
- **Enhance `ui/src/components/TaskRelationshipGraph.js`** with additional capabilities
- **Integrate with `ui/src/stores/uiStore.js`** for unified state management
- **Build on `ui/src/services/WebSocketService.js`** for communication
- **Use existing theme system** from theme utilities
- **Follow existing panel patterns** from BasePanel.js and related components
- **Reuse existing visualization utilities** and component architecture

### NAR Integration
- **Extend existing WebSocketMonitor.js** rather than creating separate monitoring
- **Use existing NAR event system** (NAR_EVENTS from constants.js) with additional graph events
- **Integrate with existing WebSocket infrastructure** for real-time data streaming
- **Use existing control message patterns** for system control (pause, step, reset)
- **Transform existing NAR objects** to graph structures using existing data structures
- **Subscribe to existing NAR events** with additional graph-specific listeners

## Implementation Guidelines

### Best Practices
- **Extends**: `ui/src/components/GraphUI.js`, `ui/src/components/TaskRelationshipGraph.js` (enhancement, not duplication)
- **Integrates with**: Existing WebSocket communication patterns in WebSocketService.js
- **Leverages**: Existing layout algorithms and visualization utilities
- **Follows**: Established data transformation patterns throughout the system

### Example Integration
- **Uses existing example loading system** from main UI
- **Loads from `examples/` directory** (same as existing UI)
- **Uses same example format** as existing UIs
- **Clears state using existing reset functionality** (maintains consistency)

## Implementation Assessment

### Implementability Strengths
- **Well-structured pathways** that allow incremental development
- **Clear architectural integration** with existing SeNARS components
- **Good separation of concerns** between client and server components
- **Progressive enhancement approach** that delivers value early
- **Realistic dependencies** that align with existing tech stack
- **Clear MVP scope** in PATH 1A & 1B to deliver core functionality

### Implementation Concerns & Risk Mitigation

#### Critical Concerns (Address First)

1. **NAR Event Availability** - Verify that the required NAR events (`concept.created`, `task.processed`, etc.) are actually emitted by the NAR system:
   - **Risk**: GraphObserver may not receive necessary data if events aren't available
   - **Mitigation**: Verify event availability before implementation; implement fallback data mechanisms

2. **WebSocket Message Throughput** - Real-time streaming of graph data could overwhelm clients:
   - **Risk**: Performance degradation with active NAR systems
   - **Mitigation**: Implement conservative defaults and throttling from the start

3. **Data Transformation Complexity** - Converting NAR internal structures to graph structures may be complex:
   - **Risk**: Difficult to extract relationship information from NAR data
   - **Mitigation**: Start with simple transformations and validate with real data early

#### Moderate Concerns

4. **Graph Layout Performance** - Real-time layout calculations for dynamic graphs:
   - **Risk**: Layout algorithms consuming excessive CPU resources
   - **Mitigation**: Use efficient algorithms and only recalculate when necessary

5. **Memory Management** - Accumulating nodes and edges over long-running sessions:
   - **Risk**: Memory exhaustion with extended use
   - **Mitigation**: Implement retention policies from PATH 1A

6. **Synchronization** - Keeping client graph state consistent with NAR state:
   - **Risk**: Client view diverging from actual NAR state
   - **Mitigation**: Implement state reconciliation mechanisms

#### Implementation Recommendations

1. **Proof of Concept First**: Create a minimal working version with actual NAR data to validate assumptions before full development

2. **Event Verification Phase**: Spend initial time verifying NAR event availability and data structure formats

3. **Performance Monitoring**: Build in performance metrics from PATH 1A to detect issues early

4. **Incremental Integration**: Test each pathway with real NAR data as it's developed

5. **Fallback Mechanisms**: Implement graceful degradation when events aren't available or performance thresholds are exceeded

### Development Sequence for Risk Mitigation

1. **Phase 1**: Verify NAR event availability and data formats (before coding begins)
2. **Phase 2**: Implement PATH 1A & 1B with simple data transformations and conservative defaults
3. **Phase 3**: Test with real NAR sessions to validate performance and data availability
4. **Phase 4**: Add additional pathways based on validated requirements and performance