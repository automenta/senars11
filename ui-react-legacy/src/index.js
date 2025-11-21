// Core components
export {default as BaseApp} from './components/BaseApp.js';
export {default as AppShell} from './components/AppShell.js';
export {useAppContext} from './components/AppShell.js';

// Shared components
export * from './components/shared/index.js';

// Layouts
export {default as AppLayout} from './layouts/AppLayout.js';
export {DEFAULT_LAYOUTS, createLayout, createLayoutElements} from './layouts/LayoutUtils.js';

// Hooks
export {useWebSocket, useUiData, useDataOperations} from './hooks/useWebSocket.js';

// Utilities
export {themeUtils} from './utils/themeUtils.js';
export {default as themeUtilsModule} from './utils/themeUtils.js';
export {THEME} from './utils/themeUtils.js';
export {createCollectionManager, createObjectManager, batchUpdate} from './utils/CollectionManager.js';

// Store
export {default as useUiStore} from './stores/uiStore.js';

// Constants
export {UI_APPS} from './constants/uiApps.js';
export {MERGED_LAYOUT_INFO} from './constants/layoutInfo.js';

// App Registry
export {default as appRegistry} from './AppRegistry.js';

// Core application components
export {default as App} from './App.jsx';
export {default as Launcher} from './Launcher.js';
export {default as MergedLauncher} from './MergedLauncher.js';

// Panel components for docking framework
export {default as AppLauncherPanel} from './components/AppLauncherPanel.js';
export {default as DiagnosticsPanel} from './components/DiagnosticsPanel.js';
export {default as ReplConsolePanel} from './components/ReplConsolePanel.js';