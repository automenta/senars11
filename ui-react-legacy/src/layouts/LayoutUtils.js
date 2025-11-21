/**
 * Layout configuration system for flexlayout-react
 * Provides all available UI layouts
 */

// Default layout element creators
const DEFAULT_CREATE_TAB = (name, component) => ({
    type: 'tab',
    name,
    component
});

const DEFAULT_CREATE_TABSET = (children, weight = 50, id = null) => ({
    type: 'tabset',
    weight,
    children,
    ...(id && {id})
});

const DEFAULT_CREATE_ROW = (children, weight = 100) => ({
    type: 'row',
    weight,
    children
});

const DEFAULT_CREATE_COLUMN = (children, weight = 100) => ({
    type: 'column',
    weight,
    children
});

const DEFAULT_CREATE_BORDER = (location, size, children) => ({
    type: 'border',
    location,
    size,
    children
});

/**
 * Common layout element creators
 */
export const createLayoutElements = (React, themeUtils) => {
    const createTab = (name, component) => DEFAULT_CREATE_TAB(name, component);
    const createTabSet = (children, weight = 50, id = null) => DEFAULT_CREATE_TABSET(children, weight, id);
    const createRow = (children, weight = 100) => DEFAULT_CREATE_ROW(children, weight);
    const createColumn = (children, weight = 100) => DEFAULT_CREATE_COLUMN(children, weight);
    const createBorder = (location, size, children) => DEFAULT_CREATE_BORDER(location, size, children);

    return Object.freeze({
        createTab,
        createTabSet,
        createRow,
        createColumn,
        createBorder
    });
};

// Global layout settings configuration for different layout types
const GLOBAL_LAYOUT_SETTINGS = Object.freeze({
    default: Object.freeze({
        tabEnableClose: true,
        tabEnableFloat: true,
        splitterSize: 6,
        tabSetEnableDeleteWhenEmpty: true,
        tabSetEnableDrop: true
    }),
    simple: Object.freeze({
        tabEnableClose: false,
        tabEnableFloat: false,
        splitterSize: 0,
        tabSetEnableDeleteWhenEmpty: false,
        tabSetEnableDrop: false
    })
});

// Default layouts with global settings
export const DEFAULT_LAYOUTS = Object.freeze({
    dashboard: Object.freeze({
        global: GLOBAL_LAYOUT_SETTINGS.default,
        layout: null,
        borders: []
    }),
    ide: Object.freeze({
        global: GLOBAL_LAYOUT_SETTINGS.default,
        layout: null,
        borders: []
    }),
    analysis: Object.freeze({
        global: GLOBAL_LAYOUT_SETTINGS.default,
        layout: null,
        borders: []
    }),
    visualization: Object.freeze({
        global: GLOBAL_LAYOUT_SETTINGS.default,
        layout: null,
        borders: []
    }),
    simple: Object.freeze({
        global: GLOBAL_LAYOUT_SETTINGS.simple,
        layout: null,
        borders: []
    })
});

// Helper function to create a standard tab for each layout type
const createStandardTab = (createTab, name, component) => createTab(name, component);

// Layout factories for different layout types
const layoutFactories = Object.freeze({
    dashboard: (elements) => {
        const {createTab, createTabSet, createRow} = elements;
        return Object.freeze({
            layout: createRow([
                createTabSet([
                    createStandardTab(createTab, 'Dashboard', 'DashboardPanel'),
                    createStandardTab(createTab, 'Tasks', 'TaskPanel'),
                    createStandardTab(createTab, 'Concepts', 'ConceptPanel')
                ], 60),
                createTabSet([
                    createStandardTab(createTab, 'Console', 'ConsolePanel'),
                    createStandardTab(createTab, 'System Status', 'SystemStatusPanel')
                ], 40)
            ])
        });
    },

    ide: (elements) => {
        const {createTab, createTabSet, createRow, createBorder} = elements;
        return Object.freeze({
            borders: [
                createBorder('left', 250, [
                    createStandardTab(createTab, 'Explorer', 'ExplorerPanel'),
                    createStandardTab(createTab, 'Tasks', 'TaskPanel'),
                    createStandardTab(createTab, 'Concepts', 'ConceptPanel')
                ]),
                createBorder('bottom', 250, [
                    createStandardTab(createTab, 'Console', 'ConsolePanel'),
                    createStandardTab(createTab, 'Trace', 'ReasoningTracePanel'),
                    createStandardTab(createTab, 'Time Series', 'TimeSeriesPanel')
                ])
            ],
            layout: createRow([
                createTabSet([
                    createStandardTab(createTab, 'Main', 'MainPanel'),
                    createStandardTab(createTab, 'Input', 'InputInterfacePanel')
                ], 60),
                createTabSet([
                    createStandardTab(createTab, 'Variables', 'VariablesPanel'),
                    createStandardTab(createTab, 'Cycle', 'CyclePanel')
                ], 40)
            ])
        });
    },

    analysis: (elements) => {
        const {createTab, createTabSet, createRow, createColumn} = elements;
        return Object.freeze({
            layout: createColumn([
                createRow([
                    createTabSet([
                        createStandardTab(createTab, 'Self Analysis', 'SelfAnalysisPanel'),
                        createStandardTab(createTab, 'Meta Cognition', 'MetaCognitionPanel')
                    ], 70),
                    createTabSet([
                        createStandardTab(createTab, 'Priority Fluctuation', 'PriorityFluctuationPanel'),
                        createStandardTab(createTab, 'Priority Histogram', 'PriorityHistogram')
                    ], 30)
                ], 60),
                createTabSet([
                    createStandardTab(createTab, 'Trace Inspector', 'TraceInspector'),
                    createStandardTab(createTab, 'Visualization', 'VisualizationPanel')
                ], 40)
            ])
        });
    },

    visualization: (elements) => {
        const {createTab, createTabSet, createRow} = elements;
        return Object.freeze({
            layout: createRow([
                createTabSet([
                    createStandardTab(createTab, 'Graph UI', 'GraphUI'),
                    createStandardTab(createTab, 'Task Relationship Graph', 'TaskRelationshipGraph')
                ], 70),
                createTabSet([
                    createStandardTab(createTab, 'Task Flow Diagram', 'TaskFlowDiagram'),
                    createStandardTab(createTab, 'Concept Relationships', 'ConceptRelationshipPanel')
                ], 30)
            ])
        });
    },

    simple: (elements) => {
        const {createTab, createTabSet} = elements;
        return Object.freeze({
            layout: createTabSet([
                createStandardTab(createTab, 'Main', 'MainPanel')
            ], 100)
        });
    },

    merged: (elements) => {
        const {createTab, createTabSet, createRow, createBorder} = elements;
        return Object.freeze({
            borders: [
                createBorder('left', 300, [
                    createStandardTab(createTab, 'App Launcher', 'AppLauncherPanel'),
                    createStandardTab(createTab, 'Diagnostics', 'DiagnosticsPanel'),
                    createStandardTab(createTab, 'Tasks', 'TaskPanel'),
                    createStandardTab(createTab, 'Concepts', 'ConceptPanel')
                ]),
                createBorder('bottom', 250, [
                    createStandardTab(createTab, 'REPL Console', 'ReplConsolePanel'),
                    createStandardTab(createTab, 'Console', 'ConsolePanel'),
                    createStandardTab(createTab, 'System Status', 'SystemStatusPanel'),
                    createStandardTab(createTab, 'Reasoning Trace', 'ReasoningTracePanel')
                ])
            ],
            layout: createRow([
                createTabSet([
                    createStandardTab(createTab, 'Main', 'MainPanel'),
                    createStandardTab(createTab, 'Input Interface', 'InputInterfacePanel'),
                    createStandardTab(createTab, 'Cognitive IDE', 'CognitiveIDE')
                ], 60),
                createTabSet([
                    createStandardTab(createTab, 'Variables', 'VariablesPanel'),
                    createStandardTab(createTab, 'Cycle', 'CyclePanel'),
                    createStandardTab(createTab, 'Demo', 'DemoPanel')
                ], 40)
            ])
        });
    }
});

/**
 * Layout factory function to generate layouts based on type and configuration
 * @param {Object} layoutElements - Layout element creators from createLayoutElements
 * @param {string} layoutType - Type of layout to create
 * @param {Object} config - Additional configuration options
 * @returns {Object} - Complete layout configuration
 */
export const createLayout = (layoutElements, layoutType, config = {}) => {
    const baseLayout = DEFAULT_LAYOUTS[layoutType] || DEFAULT_LAYOUTS.simple;
    const layoutData = layoutFactories[layoutType]?.(layoutElements) || layoutFactories.simple(layoutElements);

    return Object.freeze({
        ...baseLayout,
        ...layoutData
    });
};