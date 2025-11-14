/**
 * Main Export Registry: Consolidated Access to UI Components and Utilities
 *
 * This file provides organized access to all major components and utilities
 * in the UI system, following the AGENTS.md guidelines for organization.
 *
 * Sections:
 * - Core components: Fundamental UI building blocks
 * - Shared components: Reusable elements from shared index
 * - Layouts: Docking framework and layout utilities
 * - Hooks: Custom React hooks for functionality
 * - Utilities: Helper functions and theme utilities
 * - Store: State management utilities
 * - Constants: Shared configuration data
 * - App Registry: Application registry system
 * - Core applications: Main UI application components
 * - Panel components: Specialized panels for docking framework
 *
 * Following AGENTS.md: Organized, Consolidated, Modular
 */

// Core components: Fundamental UI building blocks
export { default as BaseApp } from './components/BaseApp.js';
export { default as AppShell } from './components/AppShell.js';
export { useAppContext } from './components/AppShell.js';

// Shared components: Reusable elements from shared index
export * from './components/shared/index.js';

// Layouts: Docking framework and layout utilities
export { default as AppLayout } from './layouts/AppLayout.js';
export { DEFAULT_LAYOUTS, createLayout, createLayoutElements } from './layouts/LayoutUtils.js';

// Hooks: Custom React hooks for functionality
export { useWebSocket, useUiData, useDataOperations } from './hooks/useWebSocket.js';

// Utilities: Helper functions and theme utilities
export { themeUtils } from './utils/themeUtils.js';
export { default as themeUtilsModule } from './utils/themeUtils.js';
export { THEME } from './utils/themeUtils.js';
export { createCollectionManager, createObjectManager, batchUpdate } from './utils/CollectionManager.js';

// Store: State management utilities
export { default as useUiStore } from './stores/uiStore.js';

// Constants: Shared configuration data
export { UI_APPS } from './constants/uiApps.js';
export { MERGED_LAYOUT_INFO } from './constants/layoutInfo.js';

// App Registry: Application registry system
export { default as appRegistry } from './AppRegistry.js';

// Core application components: Main UI application components
export { default as App } from './App.js';
export { default as Launcher } from './Launcher.js';
export { default as MergedLauncher } from './MergedLauncher.js';

// Panel components: Specialized panels for docking framework
export { default as AppLauncherPanel } from './components/AppLauncherPanel.js';
export { default as DiagnosticsPanel } from './components/DiagnosticsPanel.js';
export { default as ReplConsolePanel } from './components/ReplConsolePanel.js';