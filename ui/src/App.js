import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import AppLayout from './layouts/AppLayout.js';
import { applicationRegistry } from './ApplicationRegistry.js';

/**
 * App: Main application component with proper loading and error handling
 */
function App({ appId = 'ide', appConfig = {} }) {
  // Determine layout type from appConfig or URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const layoutParam = urlParams.get('layout');
  const layoutType = appConfig.layoutType || layoutParam || 'ide';

  return React.createElement(BaseApp, {
    appId,
    appConfig: { title: 'Cognitive IDE', ...appConfig },
    layoutComponent: () => React.createElement(AppLayout, { layoutType })
  });
}

export default App;