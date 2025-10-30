import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.js';
import './index.css';
import {initializeTheme} from './utils/theme.js';

// Initialize theme before rendering the app
initializeTheme();

createRoot(document.getElementById('root')).render(
    React.createElement(
        React.StrictMode,
        null,
        React.createElement(App, null)
    )
);