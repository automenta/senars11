// Simple UI app loader that renders the main App with a simple layout
import React from 'react';
import App from './App.js';

// This is a simple wrapper that passes the app ID and config to the main App component
const SimpleUIApp = (props) => {
    return React.createElement(App, {
        appId: 'simple',
        appConfig: {
            title: 'Simple UI Collection',
            layoutType: 'simple'
        },
        ...props
    });
};

export default SimpleUIApp;