import React from 'react';
import { createRoot } from 'react-dom/client';
import GraphVisualizer from './components/Graph/GraphVisualizer.js';
import './App.css';
import { initializeTheme } from './utils/theme.js';
import BaseApp from './components/BaseApp.js';

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
            React.createElement(GraphVisualizer, null)
        )
    )
);