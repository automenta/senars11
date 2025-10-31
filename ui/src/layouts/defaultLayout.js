// Default FlexLayout configuration with organized structure
const createTab = (name, component) => ({
  type: 'tab',
  name,
  component
});

const createTabSet = (children, weight = 50) => ({
  type: 'tabset',
  weight,
  children
});

const createBorder = (location, size, children) => ({
  type: 'border',
  location,
  size,
  children
});

// Layout configuration organized by regions
const defaultLayout = {
  global: {
    tabEnableClose: true,
    tabEnableFloat: true,
  },
  borders: [
    // Left sidebar with navigation panels
    createBorder('left', 250, [
      createTab('Tasks', 'TaskPanel'),
      createTab('Concepts', 'ConceptPanel'),
      createTab('Demos', 'DemoPanel'),
      createTab('System', 'SystemStatusPanel')
    ]),
    // Bottom panel with monitoring and logs
    createBorder('bottom', 250, [
      createTab('Console', 'ConsolePanel'),
      createTab('Priorities', 'PriorityFluctuationPanel'),
      createTab('Relationships', 'ConceptRelationshipPanel'),
      createTab('Trace', 'ReasoningTracePanel'),
      createTab('Time Series', 'TimeSeriesPanel')
    ])
  ],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // Left main area with dashboard and monitoring
      createTabSet([
        createTab('Dashboard', 'DashboardPanel'),
        createTab('Main', 'MainPanel'),
        createTab('Task Monitor', 'TaskMonitorPanel')
      ], 60),
      // Right main area with execution and input
      createTabSet([
        createTab('Cycles', 'CyclePanel'),
        createTab('Variables', 'VariablesPanel'),
        createTab('Input', 'InputInterfacePanel')
      ], 40)
    ]
  }
};

export default defaultLayout;