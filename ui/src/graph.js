import React from 'react';
import { createRoot } from 'react-dom/client';
import GraphVisualizer from './components/Graph/GraphVisualizer.js';
import './App.css';
import { initializeTheme } from './utils/theme.js';
import BaseApp from './components/BaseApp.js';
import { useWebSocket } from './hooks/useWebSocket.js';

// Configuration constants
const GRAPH_CONFIG = Object.freeze({
  appId: 'graph',
  title: 'Graph Visualization',
  containerId: 'graph-root',
  initialDataDelay: 100
});

// Component to handle Graph UI without initial data (start with empty memory)
const GraphWithInitialData = () => {
  const { wsService, wsConnected } = useWebSocket();

  // No initial data is sent - start with empty memory and let user input define content
  // The graph will update automatically when real NAR events occur

  return React.createElement(GraphVisualizer, null);
};

// Initialize theme before rendering the app
initializeTheme();

// Render function with error handling
const renderApp = () => {
  const rootElement = document.getElementById(GRAPH_CONFIG.containerId);
  if (!rootElement) {
    throw new Error(`Root element with id "${GRAPH_CONFIG.containerId}" not found`);
  }

  const root = createRoot(rootElement);
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(BaseApp,
        {
          appId: GRAPH_CONFIG.appId,
          appConfig: { title: GRAPH_CONFIG.title },
          showWebSocketStatus: true
        },
        React.createElement(GraphWithInitialData, null)
      )
    )
  );
};

// Initialize and render the app
renderApp();