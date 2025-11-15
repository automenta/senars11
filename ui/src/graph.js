import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import GraphVisualizer from './components/Graph/GraphVisualizer.js';
import './App.css';
import { initializeTheme } from './utils/theme.js';
import BaseApp from './components/BaseApp.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { sendGraphInitialData } from './utils/graphInitialData.js';

// Configuration constants
const GRAPH_CONFIG = Object.freeze({
  appId: 'graph',
  title: 'Graph Visualization',
  containerId: 'graph-root',
  initialDataDelay: 100
});

// Component to handle initial data for Graph UI
const GraphWithInitialData = () => {
  const { wsService, wsConnected } = useWebSocket();

  useEffect(() => {
    // Send initial data regardless of WebSocket connection status
    // This ensures the graph has data to display even without backend connection
    // The sendGraphInitialData function works by routing messages directly to the store
    if (wsService) {
      // Small delay to ensure everything is set up
      setTimeout(() => {
        sendGraphInitialData(wsService);
      }, GRAPH_CONFIG.initialDataDelay);
    }
  }, [wsService, wsConnected]); // Include wsConnected to ensure trigger on connection status changes

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