import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import AppLayout from './layouts/AppLayout.js';
import EnhancedRepl from './components/EnhancedRepl.js';
import MinimalRepl from './components/MinimalRepl.js';

// REPL configuration mapping
const REPL_CONFIG = Object.freeze({
  enhanced: { title: 'Enhanced REPL Interface', component: EnhancedRepl },
  minimal: { title: 'Minimal REPL Interface', component: MinimalRepl }
});

// Default app configuration
const DEFAULT_APP_CONFIG = Object.freeze({
  title: 'Cognitive IDE'
});

function App({ appId = 'ide', appConfig = {} }) {
  // Extract layout type from configuration or URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlLayout = urlParams.get('layout');
  const layoutType = appConfig.layoutType || urlLayout || 'ide';

  // Special handling for REPL-specific layouts
  if (appId === 'repl') {
    const config = REPL_CONFIG[layoutType];
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
    appConfig: { ...DEFAULT_APP_CONFIG, ...appConfig },
    layoutComponent: () => React.createElement(AppLayout, { layoutType })
  });
}

export default App;