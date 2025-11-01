/**
 * Layout configuration utilities and default layout definition
 */

// Layout building blocks
const createTab = (name, component) => ({
  type: 'tab',
  name,
  component
});

const createTabSet = (children, weight = 50, id = null) => ({
  type: 'tabset',
  weight,
  children,
  ...(id && { id }) // Add ID only if provided
});

const createRow = (children, weight = 100) => ({
  type: 'row',
  weight,
  children
});

const createColumn = (children, weight = 100) => ({
  type: 'column',
  weight,
  children
});

const createBorder = (location, size, children) => ({
  type: 'border',
  location,
  size,
  children
});

// Panel definitions for consistent naming and component mapping
const PANELS = {
  // Left sidebar panels
  NAVIGATION: [
    { name: 'Tasks', component: 'TaskPanel' },
    { name: 'Concepts', component: 'ConceptPanel' },
    { name: 'Demos', component: 'DemoPanel' },
    { name: 'System', component: 'SystemStatusPanel' }
  ],
  
  // Bottom panels
  MONITORING: [
    { name: 'Console', component: 'ConsolePanel' },
    { name: 'Priorities', component: 'PriorityFluctuationPanel' },
    { name: 'Priority Histogram', component: 'PriorityHistogramPanel' },
    { name: 'Relationships', component: 'ConceptRelationshipPanel' },
    { name: 'Trace', component: 'ReasoningTracePanel' },
    { name: 'Time Series', component: 'TimeSeriesPanel' }
  ],
  
  // Left main area panels
  DASHBOARD: [
    { name: 'Dashboard', component: 'DashboardPanel' },
    { name: 'Main', component: 'MainPanel' },
    { name: 'Task Monitor', component: 'TaskMonitorPanel' }
  ],
  
  // Right main area panels
  EXECUTION: [
    { name: 'Cycles', component: 'CyclePanel' },
    { name: 'Variables', component: 'VariablesPanel' },
    { name: 'Input', component: 'InputInterfacePanel' }
  ]
};

// Global layout configuration
const GLOBAL_CONFIG = {
  tabEnableClose: true,
  tabEnableFloat: true,
  splitterSize: 6,
  tabSetEnableDeleteWhenEmpty: true,
  tabSetEnableDrop: true
};

// Modular layout section builder functions
const buildSection = (location, size, panelGroup) => 
  createBorder(location, size, 
    PANELS[panelGroup].map(panel => createTab(panel.name, panel.component))
  );

// Modular layout area builder functions
const buildArea = (panelGroup, weight, id) => 
  createTabSet(
    PANELS[panelGroup].map(panel => createTab(panel.name, panel.component)),
    weight,
    id
  );

// Main layout definition
const defaultLayout = {
  global: GLOBAL_CONFIG,
  borders: [
    buildSection('left', 250, 'NAVIGATION'),
    buildSection('bottom', 250, 'MONITORING')
  ],
  layout: createRow([
    buildArea('DASHBOARD', 60, 'dashboard-area'),
    buildArea('EXECUTION', 40, 'execution-area')
  ])
};

export default defaultLayout;

// Export utility functions for dynamic layout creation
export {
  createTab,
  createTabSet,
  createRow,
  createColumn,
  createBorder,
  PANELS,
  GLOBAL_CONFIG
};