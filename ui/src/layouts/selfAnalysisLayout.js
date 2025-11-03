import { createTab, createTabSet, createRow, createColumn, createBorder } from './defaultLayout.js';

const GLOBAL_CONFIG = {
    tabEnableClose: true,
    tabEnableFloat: true,
    splitterSize: 6,
    tabSetEnableDeleteWhenEmpty: true,
    tabSetEnableDrop: true
};

// Self Analysis Dashboard layout
const selfAnalysisLayout = {
    global: GLOBAL_CONFIG,
    borders: [
        createBorder('left', 250, [
            createTab('Tasks', 'TaskPanel'),
            createTab('Concepts', 'ConceptPanel'),
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
                createTab('Self Analysis', 'SelfAnalysisPanel'),
                createTab('Dashboard', 'DashboardPanel'),
                createTab('Main', 'MainPanel')
            ], 70),
            createTabSet([
                createTab('Cycles', 'CyclePanel'),
                createTab('Variables', 'VariablesPanel')
            ], 30)
        ])
    ])
};

export default selfAnalysisLayout;