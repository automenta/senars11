/**
 * Layout System: Centralized Layout Configuration
 *
 * This module defines all available application layouts using a structured,
 * dockable panel system based on flexlayout-react.
 *
 * Architecture:
 * - Layout elements factory: Provides consistent building blocks (tabs, tabsets, rows, cols, borders)
 * - Layout definitions: Predefined configurations for different use cases
 * - The 'merged' layout: Comprehensive unified interface combining all functionality
 *
 * Layout Types:
 * - 'ide': Standard development environment layout
 * - 'dashboard': Overview and monitoring layout
 * - 'analysis': Meta-cognition and analysis layout
 * - 'visualization': Graph and data visualization layout
 * - 'simple': Minimal interface layout
 * - 'merged': Unified interface with launcher, REPL, diagnostics and IDE panels
 *
 * The 'merged' layout (added for unified UI) includes:
 * - Left border: AppLauncher, Diagnostics, Tasks, Concepts
 * - Bottom border: REPL Console, Console, System Status, Reasoning Trace
 * - Main area: Primary workspace with Input Interface and IDE components
 *
 * Following AGENTS.md: DRY, Modular, Organized
 */

/**
 * Common layout element creators with theme integration
 * @param {React} React - React instance
 * @param {Object} themeUtils - Theme utilities for styling
 */
export const createLayoutElements = (React, themeUtils) => {
  /**
   * Create a standardized tab element with consistent styling
   * @param {string} name - Tab name
   * @param {string} component - Component name
   * @returns {Object} - Tab configuration object
   */
  const createTab = (name, component) => ({
    type: 'tab',
    name,
    component
  });

  /**
   * Create a tab set with configurable children and weight
   * @param {Array} children - Child elements
   * @param {number} weight - Layout weight (default: 50)
   * @param {string} id - Optional ID
   * @returns {Object} - Tab set configuration object
   */
  const createTabSet = (children, weight = 50, id = null) => ({
    type: 'tabset',
    weight,
    children,
    ...(id && { id })
  });

  /**
   * Create a row layout element
   * @param {Array} children - Child elements
   * @param {number} weight - Layout weight (default: 100)
   * @returns {Object} - Row configuration object
   */
  const createRow = (children, weight = 100) => ({
    type: 'row',
    weight,
    children
  });

  /**
   * Create a column layout element
   * @param {Array} children - Child elements
   * @param {number} weight - Layout weight (default: 100)
   * @returns {Object} - Column configuration object
   */
  const createColumn = (children, weight = 100) => ({
    type: 'column',
    weight,
    children
  });

  /**
   * Create a border element for fixed panels
   * @param {string} location - Border location ('left', 'right', 'top', 'bottom')
   * @param {number} size - Border size in pixels
   * @param {Array} children - Child elements
   * @returns {Object} - Border configuration object
   */
  const createBorder = (location, size, children) => ({
    type: 'border',
    location,
    size,
    children
  });

  return {
    createTab,
    createTabSet,
    createRow,
    createColumn,
    createBorder
  };
};

/**
 * Default layout configurations for different application types
 * Using Object.freeze for performance and immutability
 * Following AGENTS.md: Organized, Modularized, Terse syntax
 */
export const DEFAULT_LAYOUTS = Object.freeze({
  // Dashboard-style layout
  dashboard: Object.freeze({
    global: Object.freeze({
      tabEnableClose: false,
      tabEnableFloat: true,
      splitterSize: 6,
      tabSetEnableDeleteWhenEmpty: true,
      tabSetEnableDrop: true
    }),
    layout: null // Will be populated by factory functions
  }),

  // Development/IDE style layout
  ide: Object.freeze({
    global: Object.freeze({
      tabEnableClose: true,
      tabEnableFloat: true,
      splitterSize: 6,
      tabSetEnableDeleteWhenEmpty: true,
      tabSetEnableDrop: true
    }),
    borders: Object.freeze([]), // Will be populated by factory functions
    layout: null // Will be populated by factory functions
  }),

  // Analysis-style layout
  analysis: Object.freeze({
    global: Object.freeze({
      tabEnableClose: true,
      tabEnableFloat: true,
      splitterSize: 6,
      tabSetEnableDeleteWhenEmpty: true,
      tabSetEnableDrop: true
    }),
    layout: null // Will be populated by factory functions
  }),

  // Visualization-focused layout
  visualization: Object.freeze({
    global: Object.freeze({
      tabEnableClose: true,
      tabEnableFloat: true,
      splitterSize: 6,
      tabSetEnableDeleteWhenEmpty: true,
      tabSetEnableDrop: true
    }),
    layout: null // Will be populated by factory functions
  }),

  // Simple/minimal layout
  simple: Object.freeze({
    global: Object.freeze({
      tabEnableClose: false,
      tabEnableFloat: false,
      splitterSize: 0,
      tabSetEnableDeleteWhenEmpty: false,
      tabSetEnableDrop: false
    }),
    layout: null // Will be populated by factory functions
  })
});

/**
 * Layout factory function to generate layouts based on type and configuration
 * @param {Object} layoutElements - Layout element creators from createLayoutElements
 * @param {string} layoutType - Type of layout to create
 * @param {Object} config - Additional configuration options
 * @returns {Object} - Complete layout configuration
 */
export const createLayout = (layoutElements, layoutType, config = {}) => {
  const { createTab, createTabSet, createRow, createColumn, createBorder } = layoutElements;

  switch (layoutType) {
    case 'dashboard':
      return {
        ...DEFAULT_LAYOUTS.dashboard,
        layout: createRow([
          createTabSet([
            createTab('Dashboard', 'DashboardPanel'),
            createTab('Tasks', 'TaskPanel'),
            createTab('Concepts', 'ConceptPanel')
          ], 60),
          createTabSet([
            createTab('Console', 'ConsolePanel'),
            createTab('System Status', 'SystemStatusPanel')
          ], 40)
        ])
      };

    case 'ide':
      return {
        ...DEFAULT_LAYOUTS.ide,
        borders: [
          createBorder('left', 250, [
            createTab('Explorer', 'ExplorerPanel'),
            createTab('Tasks', 'TaskPanel'),
            createTab('Concepts', 'ConceptPanel')
          ]),
          createBorder('bottom', 250, [
            createTab('Console', 'ConsolePanel'),
            createTab('Trace', 'ReasoningTracePanel'),
            createTab('Time Series', 'TimeSeriesPanel')
          ])
        ],
        layout: createRow([
          createTabSet([
            createTab('Main', 'MainPanel'),
            createTab('Input', 'InputInterfacePanel')
          ], 60),
          createTabSet([
            createTab('Variables', 'VariablesPanel'),
            createTab('Cycle', 'CyclePanel')
          ], 40)
        ])
      };

    case 'analysis':
      return {
        ...DEFAULT_LAYOUTS.analysis,
        layout: createColumn([
          createRow([
            createTabSet([
              createTab('Self Analysis', 'SelfAnalysisPanel'),
              createTab('Meta Cognition', 'MetaCognitionPanel')
            ], 70),
            createTabSet([
              createTab('Priority Fluctuation', 'PriorityFluctuationPanel'),
              createTab('Priority Histogram', 'PriorityHistogram')
            ], 30)
          ], 60),
          createTabSet([
            createTab('Trace Inspector', 'TraceInspector'),
            createTab('Visualization', 'VisualizationPanel')
          ], 40)
        ])
      };

    case 'visualization':
      return {
        ...DEFAULT_LAYOUTS.visualization,
        layout: createRow([
          createTabSet([
            createTab('Graph UI', 'GraphUI'),
            createTab('Task Relationship Graph', 'TaskRelationshipGraph')
          ], 70),
          createTabSet([
            createTab('Task Flow Diagram', 'TaskFlowDiagram'),
            createTab('Concept Relationships', 'ConceptRelationshipPanel')
          ], 30)
        ])
      };

    case 'simple':
      return {
        ...DEFAULT_LAYOUTS.simple,
        layout: createTabSet([
          createTab('Main', 'MainPanel')
        ], 100)
      };

    case 'merged':
    // Unified workspace: combines launcher, diagnostics, REPL, and IDE capabilities
    const unifiedLayoutConfiguration = {
      ...DEFAULT_LAYOUTS.ide,
      borders: [
        // Left sidebar with control and monitoring panels
        createBorder('left', 300, [
          createTab('App Launcher', 'AppLauncherPanel'),    // Application selector
          createTab('Diagnostics', 'DiagnosticsPanel'),     // Connection & system status
          createTab('Tasks', 'TaskPanel'),                  // Task management
          createTab('Concepts', 'ConceptPanel')             // Concept management
        ]),
        // Bottom panel with logs and trace information
        createBorder('bottom', 250, [
          createTab('REPL Console', 'ReplConsolePanel'),    // Interactive console
          createTab('Console', 'ConsolePanel'),             // General output
          createTab('System Status', 'SystemStatusPanel'),  // Health metrics
          createTab('Reasoning Trace', 'ReasoningTracePanel') // Process visualization
        ])
      ],
      // Main workspace area split into two sections
      layout: createRow([
        // Left section: primary work area
        createTabSet([
          createTab('Main', 'MainPanel'),                    // Primary workspace
          createTab('Input Interface', 'InputInterfacePanel'), // Narsese input
          createTab('Cognitive IDE', 'CognitiveIDE')         // Full IDE
        ], 60),
        // Right section: supplementary tools
        createTabSet([
          createTab('Variables', 'VariablesPanel'),          // Variable inspection
          createTab('Cycle', 'CyclePanel'),                  // Cycle tracking
          createTab('Demo', 'DemoPanel')                     // Demo controls
        ], 40)
      ])
    };

    return unifiedLayoutConfiguration;

    default:
      return {
        ...DEFAULT_LAYOUTS.simple,
        layout: createTabSet([
          createTab('Main', 'MainPanel')
        ], 100)
      };
  }
};