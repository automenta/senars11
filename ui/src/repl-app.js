// REPL app loader that renders the main App with REPL-specific configuration
import React from 'react';
import App from './App.js';

// This is a wrapper that passes the app ID and config to the main App component for REPL
const REPLApp = (props) => {
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