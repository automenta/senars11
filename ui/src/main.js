import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import Launcher from './Launcher.js';
import './index.css';
import { initializeTheme } from './utils/theme.js';

// Determine which app to render based on URL
const getCurrentApp = () => {
  const path = window.location.pathname;
  
  // Based on path, return the appropriate component
  if (path.includes('/repl')) {
    // For REPL, we need to load the REPL app
    return () => import('./repl-app.js').then(module => module.default);
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

// Render the appropriate app based on the current path
getCurrentApp()()
  .then(AppComponent => {
    const root = createRoot(document.getElementById('root'));
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(AppComponent, null)
      )
    );
  })
  .catch(error => {
    console.error('Error loading app:', error);
    // Fallback to launcher if there's an error
    const root = createRoot(document.getElementById('root'));
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Launcher, null)
      )
    );
  });