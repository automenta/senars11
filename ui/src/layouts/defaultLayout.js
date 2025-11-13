/**
 * Layout configuration for the default UI layout
 * Defines the structure of panels and their arrangement
 */

// ====== LAYOUT BUILDING BLOCKS ======

/**
 * Create a tab with name and component
 * @param {string} name - Display name of the tab
 * @param {string} component - Component name to render in the tab
 * @returns {Object} Tab configuration
 */
const createTab = (name, component) => ({type: 'tab', name, component});

/**
 * Create a tab set containing multiple tabs
 * @param {Array} children - Array of tab configurations
 * @param {number} weight - Relative size weight (default: 50)
 * @param {string} id - Optional ID for the tab set
 * @returns {Object} Tab set configuration
 */
const createTabSet = (children, weight = 50, id = null) => ({type: 'tabset', weight, children, ...(id && {id})});

/**
 * Create a row layout containing multiple elements
 * @param {Array} children - Array of child configurations
 * @param {number} weight - Relative size weight (default: 100)
 * @returns {Object} Row layout configuration
 */
const createRow = (children, weight = 100) => ({type: 'row', weight, children});

/**
 * Create a column layout containing multiple elements
 * @param {Array} children - Array of child configurations
 * @param {number} weight - Relative size weight (default: 100)
 * @returns {Object} Column layout configuration
 */
const createColumn = (children, weight = 100) => ({type: 'column', weight, children});

/**
 * Create a border area for specific panel types
 * @param {string} location - Position of the border ('left', 'right', 'top', 'bottom')
 * @param {number} size - Size of the border area
 * @param {Array} children - Array of tab configurations
 * @returns {Object} Border configuration
 */
const createBorder = (location, size, children) => ({type: 'border', location, size, children});

// ====== PANEL CATALOG ======

/**
 * Organized collection of available panels grouped by functionality
 */
const PANELS = {
  NAVIGATION: [
    {name: 'Tasks', component: 'TaskPanel'},
    {name: 'Concepts', component: 'ConceptPanel'},
    {name: 'Demos', component: 'DemoPanel'},
    {name: 'System', component: 'SystemStatusPanel'}
  ],

  MONITORING: [
    {name: 'Console', component: 'ConsolePanel'},
    {name: 'Priorities', component: 'PriorityFluctuationPanel'},
    {name: 'Priority Histogram', component: 'PriorityHistogram'},
    {name: 'Relationships', component: 'ConceptRelationshipPanel'},
    {name: 'Trace', component: 'ReasoningTracePanel'},
    {name: 'Time Series', component: 'TimeSeriesPanel'},
    {name: 'Meta-Cognition', component: 'MetaCognitionPanel'},
    {name: 'Trace Inspector', component: 'TraceInspector'},
    {name: 'Visualization', component: 'VisualizationPanel'}
  ],

  DASHBOARD: [
    {name: 'Dashboard', component: 'DashboardPanel'},
    {name: 'Main', component: 'MainPanel'},
    {name: 'Task Monitor', component: 'TaskMonitorPanel'},
    {name: 'Self Analysis', component: 'SelfAnalysisPanel'},
    {name: 'Graph UI', component: 'GraphUI'},
    {name: 'Cognitive IDE', component: 'CognitiveIDE'}
  ],

  EXECUTION: [
    {name: 'Cycles', component: 'CyclePanel'},
    {name: 'Variables', component: 'VariablesPanel'},
    {name: 'Input', component: 'InputInterfacePanel'}
  ]
};

// ====== GLOBAL CONFIGURATION ======

/**
 * Global layout configuration settings
 */
const GLOBAL_CONFIG = {
  tabEnableClose: true,
  tabEnableFloat: true,
  splitterSize: 6,
  tabSetEnableDeleteWhenEmpty: true,
  tabSetEnableDrop: true
};

// ====== LAYOUT BUILDERS ======

/**
 * Build a border area containing panels from a specific group
 * @param {string} location - Border location
 * @param {number} size - Size of the border area
 * @param {string} panelGroup - Key of PANELS group to use
 * @returns {Object} Border layout configuration
 */
const buildBorderArea = (location, size, panelGroup) =>
  createBorder(location, size,
    PANELS[panelGroup]?.map(panel => createTab(panel.name, panel.component)) || []
  );

/**
 * Build a main area containing panels from a specific group
 * @param {string} panelGroup - Key of PANELS group to use
 * @param {number} weight - Weight of the area (default: 50)
 * @param {string} id - Optional ID for the area
 * @returns {Object} Tab set configuration
 */
const buildMainArea = (panelGroup, weight = 50, id = null) =>
  createTabSet(
    PANELS[panelGroup]?.map(panel => createTab(panel.name, panel.component)) || [],
    weight,
    id
  );

/**
 * Create a layout with the specified area arrangement
 * @param {Array} areas - Array of area configurations
 * @returns {Object} Complete layout configuration
 */
const createLayout = (areas) => createRow(areas);

// ====== DEFAULT LAYOUT ======

const defaultLayout = {
  global: GLOBAL_CONFIG,
  borders: [
    buildBorderArea('left', 250, 'NAVIGATION'),
    buildBorderArea('bottom', 250, 'MONITORING')
  ],
  layout: createLayout([
    buildMainArea('DASHBOARD', 60, 'dashboard-area'),
    buildMainArea('EXECUTION', 40, 'execution-area')
  ])
};

export default defaultLayout;

export {
  createTab,
  createTabSet,
  createRow,
  createColumn,
  createBorder,
  createLayout,
  PANELS,
  GLOBAL_CONFIG,
  buildBorderArea,
  buildMainArea
};