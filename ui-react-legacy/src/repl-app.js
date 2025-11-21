// REPL app loader that renders the main App with REPL-specific configuration
import React from 'react';
import App from './App.jsx';

// Check if specific REPL layout is requested via URL hash or search params
const getReplLayout = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const layoutFromParams = urlParams.get('layout');

    // Check URL hash for legacy support
    if (window.location.hash.includes('minimal')) {
        return 'minimal';
    }

    // Default to enhanced if no specific layout requested
    return layoutFromParams || 'enhanced'; // Changed from 'simple' to 'enhanced'
};

// This is a wrapper that passes the app ID and config to the main App component for REPL
const REPLApp = (props) => {
    const layoutType = getReplLayout();

    return React.createElement(App, {
        appId: 'repl',
        appConfig: {
            title: layoutType === 'minimal' ? 'Minimal REPL Interface' :
                layoutType === 'enhanced' ? 'Enhanced REPL Interface' : 'REPL Interface',
            layoutType
        },
        ...props
    });
};

export default REPLApp;