import React from 'react';
import { Renderer } from '@nodegui/react-nodegui';
import { App } from './App.js';
import { useStore } from './store.js';

// Main entry point for the NodeGUI application
const main = () => {
  console.log('Starting SeNARS NodeGUI application...');

  // Initialize the store with default values
  useStore.getState().resetState();

  // Render the React-NodeGUI application
  Renderer.render(React.createElement(App));

  console.log('SeNARS NodeGUI application started');
};

// Handle application shutdown gracefully
const shutdown = () => {
  console.log('Shutting down SeNARS NodeGUI application...');
  // Cleanup any connections
  import('./nar-service.js').then(({ closeConnection }) => {
    closeConnection();
  });

  // Exit the process
  process.exit(0);
};

// Set up signal handlers for graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Log error to store if possible
  try {
    import('./nar-service.js').then(({ validateLogEntry }) => {
      const { corrected: validatedEntry } = validateLogEntry({
        type: 'error',
        message: `Uncaught exception: ${error.message}`,
        timestamp: Date.now()
      });
      useStore.getState().appendLog(validatedEntry);
    });
  } catch (logError) {
    console.error('Error logging uncaught exception:', logError);
  }
  shutdown();
});

// Start the application
main();