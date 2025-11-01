/**
 * Layout configuration following PLAN.ui.md architecture
 */

// Base layout building blocks - simple and extensible
const createTab = (name, component) => ({ type: 'tab', name, component });
const createTabSet = (children, weight = 50, id = null) => ({ type: 'tabset', weight, children, ...(id && { id }) });
const createRow = (children, weight = 100) => ({ type: 'row', weight, children });
const createColumn = (children, weight = 100) => ({ type: 'column', weight, children });
const createBorder = (location, size, children) => ({ type: 'border', location, size, children });

// Panel definitions - organized by purpose
const PANELS = {
  NAVIGATION: [
    { name: 'Tasks', component: 'TaskPanel' },
    { name: 'Concepts', component: 'ConceptPanel' },
    { name: 'Demos', component: 'DemoPanel' },
    { name: 'System', component: 'SystemStatusPanel' }
  ],
  
  MONITORING: [
    { name: 'Console', component: 'ConsolePanel' },
    { name: 'Priorities', component: 'PriorityFluctuationPanel' },
    { name: 'Priority Histogram', component: 'PriorityHistogram' },
    { name: 'Relationships', component: 'ConceptRelationshipPanel' },
    { name: 'Trace', component: 'ReasoningTracePanel' },
    { name: 'Time Series', component: 'TimeSeriesPanel' }
  ],
  
  DASHBOARD: [
    { name: 'Dashboard', component: 'DashboardPanel' },
    { name: 'Main', component: 'MainPanel' },
    { name: 'Task Monitor', component: 'TaskMonitorPanel' }
  ],
  
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

// Builder functions for creating flexible layouts
const buildBorderArea = (location, size, panelGroup) => 
  createBorder(location, size, 
    PANELS[panelGroup].map(panel => createTab(panel.name, panel.component))
  );

const buildMainArea = (panelGroup, weight, id) => 
  createTabSet(
    PANELS[panelGroup].map(panel => createTab(panel.name, panel.component)),
    weight,
    id
  );

// Default IDE-like layout following PLAN.ui.md
const defaultLayout = {
  global: GLOBAL_CONFIG,
  borders: [
    buildBorderArea('left', 250, 'NAVIGATION'),
    buildBorderArea('bottom', 250, 'MONITORING')
  ],
  layout: createRow([
    buildMainArea('DASHBOARD', 60, 'dashboard-area'),
    buildMainArea('EXECUTION', 40, 'execution-area')
  ])
};

export default defaultLayout;

// Export helpers for dynamic layout creation
export {
  createTab,
  createTabSet,
  createRow,
  createColumn,
  createBorder,
  PANELS
};