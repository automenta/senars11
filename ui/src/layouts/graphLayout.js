import { createTab, createTabSet, createRow, createColumn, createBorder } from './defaultLayout.js';

const GLOBAL_CONFIG = {
    tabEnableClose: true,
    tabEnableFloat: true,
    splitterSize: 6,
    tabSetEnableDeleteWhenEmpty: true,
    tabSetEnableDrop: true
};

// Dedicated Graph UI layout
const graphLayout = {
    global: GLOBAL_CONFIG,
    borders: [
        createBorder('left', 250, [
            createTab('Tasks', 'TaskPanel'),
            createTab('Concepts', 'ConceptPanel'),
            createTab('Demos', 'DemoPanel'),
            createTab('System', 'SystemStatusPanel')
        ]),
        createBorder('bottom', 250, [
            createTab('Console', 'ConsolePanel'),
            createTab('Trace', 'ReasoningTracePanel'),
            createTab('Meta-Cognition', 'MetaCognitionPanel')
        ])
    ],
    layout: createRow([
        createColumn([
            createTabSet([
                createTab('Graph View', 'GraphUI'),
                createTab('Dashboard', 'DashboardPanel')
            ], 100, 'graph-main-area')
        ])
    ])
};

export default graphLayout;