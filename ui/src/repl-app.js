// REPL app loader that renders the main App with REPL-specific configuration
import React from 'react';
import App from './App.js';
import MinimalRepl from './components/MinimalRepl.js';

// Check if minimal REPL is requested via URL hash
const isMinimalRepl = () => window.location.hash.includes('minimal');

// This is a wrapper that passes the app ID and config to the main App component for REPL
const REPLApp = (props) => {
  // If minimal REPL is requested, return the minimal interface instead
  if (isMinimalRepl()) {
    return React.createElement(MinimalRepl, { onBackToLauncher: () => window.location.href = '/' });
  }

  return React.createElement(App, {
    appId: 'repl',
    appConfig: {
      title: 'REPL Interface',
      layoutType: 'simple' // REPL uses a simple layout
    },
    ...props
  });
};

export default REPLApp;