import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import AppLayout from './layouts/AppLayout.js';
import EnhancedRepl from './components/EnhancedRepl.js';
import MinimalRepl from './components/MinimalRepl.js';
import { applicationRegistry } from './ApplicationRegistry.js';

/**
 * App: Main application component with proper loading and error handling
 */
function App({ appId = 'ide', appConfig = {} }) {
  // Determine layout type from appConfig or URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const layoutParam = urlParams.get('layout');
  const layoutType = appConfig.layoutType || layoutParam || 'ide';

  // Special handling for REPL-specific layouts
  if (appId === 'repl' && layoutType === 'enhanced') {
    return React.createElement(BaseApp, {
      appId,
      appConfig: { title: 'Enhanced REPL Interface', ...appConfig },
      layoutComponent: () => React.createElement(EnhancedRepl, {
        onBackToLauncher: () => window.location.href = '/'
      })
    });
  } else if (appId === 'repl' && layoutType === 'minimal') {
    return React.createElement(BaseApp, {
      appId,
      appConfig: { title: 'Minimal REPL Interface', ...appConfig },
      layoutComponent: () => React.createElement(MinimalRepl, {
        onBackToLauncher: () => window.location.href = '/'
      })
    });
  }

  return React.createElement(BaseApp, {
    appId,
    appConfig: { title: 'Cognitive IDE', ...appConfig },
    layoutComponent: () => React.createElement(AppLayout, { layoutType })
  });
}

export default App;