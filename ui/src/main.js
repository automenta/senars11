import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import Launcher from './Launcher.js';
import MergedLauncher from './MergedLauncher.js';
import './index.css';
import { initializeTheme } from './utils/theme.js';
import { themeUtils } from './utils/themeUtils.js';
import RootErrorBoundary from './components/RootErrorBoundary.js';

// Determine which app to render based on URL
const getCurrentApp = () => {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  // Based on path, hash, and search params, return the appropriate component
  if (path.includes('/repl') || hash.includes('minimal')) {
    // For REPL, we need to load the REPL app
    return async () => {
      // If minimal REPL is requested (either via hash or path), load MinimalRepl
      if (hash.includes('minimal') || path.includes('minimal-repl')) {
        // For minimal REPL, return the actual component directly
        const minimalModule = await import('./components/MinimalRepl.js');
        return minimalModule.default;
      }
      const replModule = await import('./repl-app.js');
      return replModule.default;
    };
  } else if (path.includes('/simple-uis') || path.includes('/simple-ui')) {
    // For simple UIs, load the simple UI app
    return async () => {
      const simpleModule = await import('./simple-ui-app.js');
      return simpleModule.default;
    };
  } else if (search.includes('layout=graph') || hash.includes('layout=graph')) {
    // For graph layout, load the main app with graph layout
    return () => {
      // Update the appConfig with the graph layout
      const GraphApp = (props) => React.createElement(App, {
        appId: 'ide',
        appConfig: { layoutType: 'graph', title: 'Graph UI' },
        ...props
      });
      return GraphApp;
    };
  } else if (search.includes('layout=self-analysis') || hash.includes('layout=self-analysis')) {
    // For self-analysis layout, load the main app with self-analysis layout
    return () => {
      // Update the appConfig with the self-analysis layout
      const SelfAnalysisApp = (props) => React.createElement(App, {
        appId: 'ide',
        appConfig: { layoutType: 'analysis', title: 'Self Analysis' },
        ...props
      });
      return SelfAnalysisApp;
    };
  } else if (path === '/' || path === '/index.html' || path === '') {
    // For root path, use App component with merged layout
    return () => {
      const RootApp = (props) => React.createElement(App, {
        appId: 'merged',
        appConfig: { layoutType: 'merged', title: 'Merged Interface' },
        ...props
      });
      return RootApp;
    };
  } else {
    // Default to main app
    return () => App;
  }
};

// Initialize theme before rendering the app
initializeTheme();

// Add performance monitoring in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('./utils/performance.js').then(() => {
    console.debug('Performance monitoring enabled in development mode');
  });
}

// Render the appropriate app based on the current path with root error boundary
async function renderApp() {
  try {
    const getAppFunction = getCurrentApp();

    let AppComponent;

    if (typeof getAppFunction === 'function') {
      if (getAppFunction.constructor.name === 'AsyncFunction') {
        // If it's an async function, await the result
        AppComponent = await getAppFunction();
      } else {
        // If it's a sync function, just call it to get the component
        AppComponent = getAppFunction();
      }
    } else {
      // If it's already a component, use it directly
      AppComponent = getAppFunction;
    }

    const root = createRoot(document.getElementById('root'));
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(RootErrorBoundary, null,
          React.createElement(AppComponent, null)
        )
      )
    );
  } catch (error) {
    console.error('Error loading app:', error);
    // Fallback to launcher wrapped in error boundary if there's an error
    const root = createRoot(document.getElementById('root'));
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(RootErrorBoundary, null,
          React.createElement(Launcher, null)
        )
      )
    );
  }
}

renderApp();