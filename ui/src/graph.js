import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import GraphVisualizer from './components/Graph/GraphVisualizer.js';
import './App.css';
import { initializeTheme } from './utils/theme.js';
import BaseApp from './components/BaseApp.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { sendGraphInitialData } from './utils/graphInitialData.js';

// Component to handle initial data for Graph UI
const GraphWithInitialData = () => {
  const { wsService, wsConnected } = useWebSocket();

  useEffect(() => {
    // Send initial data when WebSocket is connected
    if (wsConnected && wsService) {
      // Small delay to ensure everything is set up
      setTimeout(() => {
        sendGraphInitialData(wsService);
      }, 100);
    }
  }, [wsConnected, wsService]);

  return React.createElement(GraphVisualizer, null);
};

// Initialize theme before rendering the app
initializeTheme();

// Render the graph visualization component wrapped in BaseApp to ensure WebSocket connectivity
const rootElement = document.getElementById('graph-root');
if (!rootElement) {
    throw new Error('Root element with id "graph-root" not found');
}

const root = createRoot(rootElement);
root.render(
    React.createElement(React.StrictMode, null,
        React.createElement(BaseApp,
            {
                appId: 'graph',
                appConfig: { title: 'Graph Visualization' },
                showWebSocketStatus: true
            },
            React.createElement(GraphWithInitialData, null)
        )
    )
);