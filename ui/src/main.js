import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.js';
import './index.css';
import {initializeTheme} from './utils/theme.js';

// Initialize theme before rendering the app
initializeTheme();

// Add performance monitoring in development
if (process.env.NODE_ENV === 'development') {
    import('./utils/performance.js').then(() => {
        console.log('Performance monitoring enabled in development mode');
    });
}

const root = createRoot(document.getElementById('root'));
root.render(
    React.createElement(
        React.StrictMode,
        null,
        React.createElement(App, null)
    )
);