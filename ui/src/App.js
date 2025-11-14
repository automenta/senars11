import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import AppLayout from './layouts/AppLayout.js';
import EnhancedRepl from './components/EnhancedRepl.js';
import MinimalRepl from './components/MinimalRepl.js';

/**
 * App: Main application router and layout coordinator
 *
 * This component serves as the central routing mechanism that determines which
 * interface layout to display based on URL parameters and app configuration.
 *
 * Key responsibilities:
 * - Parse URL parameters to determine desired layout
 * - Route to specific component layouts (REPL modes)
 * - Default to AppLayout with specified layout type for general interfaces
 * - Provide consistent BaseApp wrapper for all interfaces
 *
 * Layout types supported:
 * - 'ide': Standard IDE interface
 * - 'graph': Graph visualization interface
 * - 'analysis': Self-analysis interface
 * - 'merged': Unified docking framework with all panels (default main UI)
 * - 'enhanced'/'minimal': REPL-specific layouts
 *
 * URL parameter example: /?layout=merged
 */
function App({ appId = 'ide', appConfig = {} }) {
  // Extract layout type from configuration or URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlLayout = urlParams.get('layout');
  const layoutType = appConfig.layoutType || urlLayout || 'ide';

  // Special handling for REPL-specific layouts
  if (appId === 'repl') {
    const replConfig = {
      enhanced: { title: 'Enhanced REPL Interface', component: EnhancedRepl },
      minimal: { title: 'Minimal REPL Interface', component: MinimalRepl }
    };

    const config = replConfig[layoutType];
    if (config) {
      return React.createElement(BaseApp, {
        appId,
        appConfig: { title: config.title, ...appConfig },
        layoutComponent: () => React.createElement(config.component, {
          onBackToLauncher: () => window.location.href = '/'
        })
      });
    }
  }

  // Default: use AppLayout with specified layout type
  return React.createElement(BaseApp, {
    appId,
    appConfig: { title: 'Cognitive IDE', ...appConfig },
    layoutComponent: () => React.createElement(AppLayout, { layoutType })
  });
}

export default App;