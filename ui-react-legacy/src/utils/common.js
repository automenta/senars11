/**
 * Common utilities and constants
 * Following AGENTS.md: Organized, Modular, DRY
 */

// Use themeUtils instead of local constants to avoid duplication
export * from './themeUtils.js';

// Export common utility functions
export * from './helpers.js';

// Export common constants
export const BREAKPOINTS = Object.freeze({
    MOBILE: '768px',
    TABLET: '1024px',
    DESKTOP: '1200px'
});

export const PADDING = Object.freeze({
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem'
});

// Export common type definitions if needed
export const PANEL_TYPES = Object.freeze({
    EXPLORER: 'ExplorerPanel',
    MAIN: 'MainPanel',
    CONSOLE: 'ConsolePanel',
    VARIABLES: 'VariablesPanel',
    TASK: 'TaskPanel',
    CONCEPT: 'ConceptPanel',
    CYCLE: 'CyclePanel',
    DEMO: 'DemoPanel',
    SYSTEM_STATUS: 'SystemStatusPanel',
    INPUT_INTERFACE: 'InputInterfacePanel',
    REASONING_TRACE: 'ReasoningTracePanel',
    GRAPH: 'GraphUI',
    DASHBOARD: 'DashboardPanel',
    PRIORITY_FLUCTUATION: 'PriorityFluctuationPanel',
    PRIORITY_HISTOGRAM: 'PriorityHistogram',
    META_COGNITION: 'MetaCognitionPanel',
    SELF_ANALYSIS: 'SelfAnalysisPanel',
    TASK_MONITOR: 'TaskMonitorPanel',
    CONCEPT_RELATIONSHIP: 'ConceptRelationshipPanel',
    TIME_SERIES: 'TimeSeriesPanel',
    VISUALIZATION: 'VisualizationPanel',
    TRACE_INSPECTOR: 'TraceInspector',
    REASONER_CONTROLS: 'ReasonerControls',
    ENHANCED_INPUT: 'EnhancedInputInterface',
    LAYOUT_MANAGER: 'LayoutManager'
});

export const MESSAGE_TYPES = Object.freeze({
    REASONING_STEP: 'reasoningStep',
    TASK_UPDATE: 'taskUpdate',
    CONCEPT_UPDATE: 'conceptUpdate',
    BELIEF_UPDATE: 'beliefUpdate',
    GOAL_UPDATE: 'goalUpdate',
    CYCLE_UPDATE: 'cycleUpdate',
    SYSTEM_METRICS: 'systemMetrics',
    DEMO_STATE: 'demoState',
    DEMO_STEP: 'demoStep',
    DEMO_METRICS: 'demoMetrics',
    DEMO_LIST: 'demoList',
    NARSESE_INPUT: 'narseseInput',
    ERROR: 'error',
    NOTIFICATION: 'notification',
    LOG: 'log',
    CONNECTION: 'connection',
    LAYOUT_UPDATE: 'layoutUpdate',
    PANEL_UPDATE: 'panelUpdate',
    SESSION_UPDATE: 'sessionUpdate',
    REASONING_STATE: 'reasoningState',
    META_COGNITIVE_ANALYSIS: 'metaCognitiveAnalysis',
    SELF_CORRECTION: 'selfCorrection',
    NAR_INSTANCE: 'narInstance'
});