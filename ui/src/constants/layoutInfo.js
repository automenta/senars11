// Panel configuration for the merged layout
const MERGED_PANELS = Object.freeze({
    leftBorder: Object.freeze([
        'AppLauncherPanel',
        'DiagnosticsPanel',
        'TaskPanel',
        'ConceptPanel'
    ]),
    bottomBorder: Object.freeze([
        'ReplConsolePanel',
        'ConsolePanel',
        'SystemStatusPanel',
        'ReasoningTracePanel'
    ]),
    mainLeft: Object.freeze([
        'MainPanel',
        'InputInterfacePanel',
        'CognitiveIDE'
    ]),
    mainRight: Object.freeze([
        'VariablesPanel',
        'CyclePanel',
        'DemoPanel'
    ])
});

export const MERGED_LAYOUT_INFO = Object.freeze({
    id: 'merged',
    name: 'Unified Interface',
    description: 'Comprehensive interface combining launcher, REPL, and IDE capabilities',
    panels: MERGED_PANELS
});