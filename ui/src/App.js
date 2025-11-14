import React, { useMemo } from 'react';
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

// Memoized function to get layout type
const getLayoutType = (appConfig, urlParams) => {
  const urlLayout = urlParams?.get('layout');
  return appConfig.layoutType || urlLayout || 'ide';
};

// Memoized function to get REPL component based on layout
const getReplComponent = (layoutType, onBackToLauncher) => {
  const config = REPL_CONFIG[layoutType];
  if (config) {
    return React.createElement(config.component, {
      onBackToLauncher
    });
  }
  return null;
};

function App({ appId = 'ide', appConfig = {} }) {
  // Memoize URL parameters to avoid repeated parsing
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const layoutType = getLayoutType(appConfig, urlParams);

  // Memoize the layout component to prevent unnecessary re-renders
  const layoutComponent = useMemo(() => {
    // Special handling for REPL-specific layouts
    if (appId === 'repl') {
      const replComponent = getReplComponent(layoutType, () => window.location.href = '/');
      if (replComponent) {
        return () => replComponent;
      }
    }

    // Default: use AppLayout with specified layout type
    return () => React.createElement(AppLayout, { layoutType });
  }, [appId, layoutType]);

  // Memoize app configuration to prevent unnecessary object creation
  const finalAppConfig = useMemo(() => {
    if (appId === 'repl') {
      const replConfig = REPL_CONFIG[layoutType];
      if (replConfig) {
        return { title: replConfig.title, ...appConfig };
      }
    }
    return { ...DEFAULT_APP_CONFIG, ...appConfig };
  }, [appId, appConfig, layoutType]);

  return React.createElement(BaseApp, {
    appId,
    appConfig: finalAppConfig,
    layoutComponent
  });
}

export default App;