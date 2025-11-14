import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import Launcher from './Launcher.js';
import './index.css';
import { initializeTheme } from './utils/theme.js';
import RootErrorBoundary from './components/RootErrorBoundary.js';

// Route resolver that maps URLs to appropriate UI components
const getRouteComponent = () => {
  const { pathname: path, hash, search } = window.location;

  // REPL routes
  if (path.includes('/repl') || hash.includes('minimal')) {
    return async () => {
      if (hash.includes('minimal') || path.includes('minimal-repl')) {
        const { default: MinimalRepl } = await import('./components/MinimalRepl.js');
        return MinimalRepl;
      }
      const { default: ReplApp } = await import('./repl-app.js');
      return ReplApp;
    };
  }

  // Simple UI routes
  if (path.includes('/simple-uis') || path.includes('/simple-ui')) {
    return async () => {
      const { default: SimpleUIApp } = await import('./simple-ui-app.js');
      return SimpleUIApp;
    };
  }

  // Layout-specific routes
  const layoutParam = new URLSearchParams(search).get('layout');
  const layoutRoutes = {
    graph: 'Graph UI',
    'self-analysis': 'Self Analysis',
    merged: 'Unified Interface'
  };

  if (layoutParam && layoutRoutes[layoutParam]) {
    const title = layoutRoutes[layoutParam];
    const layoutType = layoutParam === 'self-analysis' ? 'analysis' : layoutParam;

    return () => (props) => React.createElement(App, {
      appId: 'ide',
      appConfig: { layoutType, title },
      ...props
    });
  }

  // Root route - main unified interface
  if (['/', '/index.html', ''].includes(path)) {
    return () => (props) => React.createElement(App, {
      appId: 'ide',
      appConfig: { layoutType: 'merged', title: 'Unified Interface' },
      ...props
    });
  }

  // Default case
  return () => App;
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
    const routeFunction = getRouteComponent();
    const rootElement = document.getElementById('root');
    const root = createRoot(rootElement);

    let ComponentToRender;

    if (typeof routeFunction === 'function') {
      if (routeFunction.constructor.name === 'AsyncFunction') {
        ComponentToRender = await routeFunction();
      } else {
        ComponentToRender = routeFunction();
      }
    } else {
      ComponentToRender = routeFunction;
    }

    root.render(
      React.createElement(React.StrictMode, null,
        React.createElement(RootErrorBoundary, null,
          typeof ComponentToRender === 'function'
            ? React.createElement(ComponentToRender, null)
            : ComponentToRender
        )
      )
    );
  } catch (error) {
    console.error('Error loading app:', error);
    // Fallback to launcher wrapped in error boundary if there's an error
    const rootElement = document.getElementById('root');
    const root = createRoot(rootElement);

    root.render(
      React.createElement(React.StrictMode, null,
        React.createElement(RootErrorBoundary, null,
          React.createElement(Launcher, null)
        )
      )
    );
  }
}

renderApp();