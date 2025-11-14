import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import Launcher from './Launcher.js';
import './index.css';
import { initializeTheme } from './utils/theme.js';
import { themeUtils } from './utils/themeUtils.js';
import RootErrorBoundary from './components/RootErrorBoundary.js';

// Determine which app to render based on URL
const getCurrentApp = () => {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // Based on path and hash, return the appropriate component
  if (path.includes('/repl') || hash.includes('minimal')) {
    // For REPL, we need to load the REPL app
    return () => import('./repl-app.js').then(module => {
      // If minimal REPL is requested, we'll handle it differently
      if (hash.includes('minimal')) {
        return () => React.createElement(() => {
          const [MinimalRepl, setMinimalRepl] = React.useState(null);

          React.useEffect(() => {
            import('./components/MinimalRepl.js').then(module => {
              setMinimalRepl(() => module.default);
            }).catch(err => {
              console.error('Error loading MinimalRepl:', err);
            });
          }, []);

          if (MinimalRepl) {
            return React.createElement(MinimalRepl, { onBackToLauncher: () => window.location.href = '/' });
          }

          return React.createElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              fontSize: '16px',
              color: themeUtils.get('TEXT.PRIMARY')
            }
          }, 'Loading minimal REPL...');
        });
      }
      return module.default;
    });
  } else if (path.includes('/simple-uis') || path.includes('/simple-ui')) {
    // For simple UIs, load the simple UI app
    return () => import('./simple-ui-app.js').then(module => module.default);
  } else if (path.includes('/?layout=graph') || path.includes('layout=graph')) {
    // For graph layout, load the main app with graph layout
    return () => Promise.resolve(App);
  } else if (path.includes('/?layout=self-analysis') || path.includes('layout=self-analysis')) {
    // For self-analysis layout, load the main app with self-analysis layout
    return () => Promise.resolve(App);
  } else if (path === '/' || path === '/index.html') {
    // For root path, show launcher
    return () => Promise.resolve(Launcher);
  } else {
    // Default to main app
    return () => Promise.resolve(App);
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
getCurrentApp()()
  .then(AppComponent => {
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
  })
  .catch(error => {
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
  });