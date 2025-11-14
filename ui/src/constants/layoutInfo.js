/**
 * Comprehensive layout configuration for the unified interface
 * 
 * The 'merged' layout combines the functionality of the original MergedLauncher
 * with the full Cognitive IDE capabilities, creating a unified workspace that
 * includes:
 * 
 * Left Border Panels:
 * - AppLauncherPanel: Quick access to different UI applications
 * - DiagnosticsPanel: Connection status and system diagnostics
 * - TaskPanel: Task management and monitoring
 * - ConceptPanel: Concept management and inspection
 * 
 * Bottom Border Panels:
 * - ReplConsolePanel: Interactive REPL console for Narsese commands
 * - ConsolePanel: General console output
 * - SystemStatusPanel: Real-time system metrics and status
 * - ReasoningTracePanel: Reasoning process visualization
 * 
 * Main Layout (Two Tab Sets):
 * Left Tab Set:
 * - MainPanel: Primary workspace area
 * - InputInterfacePanel: Narsese input interface
 * - CognitiveIDE: Full IDE view
 * 
 * Right Tab Set:
 * - VariablesPanel: Variable inspection
 * - CyclePanel: Cycle information
 * - DemoPanel: Demo controls and management
 * 
 * This layout serves as a foundation for future UI development, combining the
 * focused launcher functionality with the comprehensive IDE capabilities in a
 * flexible, dockable interface.
 * 
 * To use this layout, access with: ?layout=merged
 * The main / route continues to use the standalone MergedLauncher component.
 */

export const MERGED_LAYOUT_INFO = {
  id: 'merged',
  name: 'Unified Interface',
  description: 'Comprehensive interface combining launcher, REPL, and IDE capabilities',
  panels: {
    leftBorder: [
      'AppLauncherPanel',
      'DiagnosticsPanel', 
      'TaskPanel',
      'ConceptPanel'
    ],
    bottomBorder: [
      'ReplConsolePanel',
      'ConsolePanel',
      'SystemStatusPanel',
      'ReasoningTracePanel'
    ],
    mainLeft: [
      'MainPanel',
      'InputInterfacePanel',
      'CognitiveIDE'
    ],
    mainRight: [
      'VariablesPanel',
      'CyclePanel', 
      'DemoPanel'
    ]
  }
};