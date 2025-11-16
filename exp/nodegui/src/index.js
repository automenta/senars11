import React from 'react';
import { Renderer } from '@nodegui/react-nodegui';
import { App } from './App.js';

// Main entry point for the NodeGUI application
const main = () => {
  // Render the React-NodeGUI application
  Renderer.render(React.createElement(App));
};

// Start the application
main();