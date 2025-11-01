import React from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const ConsolePanel = () => {
  // For now, we'll add a simulated console log store to the UI store
  // In the real app, this would be populated by consoleBridge
  const consoleMessages = useUiStore(state => state.notifications); // Reusing notifications as sample data

  const renderConsoleMessage = (message, index) =>
    React.createElement('div',
      {
        key: message.id || index,
        style: {
          padding: '0.25rem 0.5rem',
          margin: '0.125rem 0',
          backgroundColor: message.type === 'error' ? '#ffe6e6' : message.type === 'warning' ? '#fff3e6' : message.type === 'success' ? '#e6ffe6' : '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '2px',
          fontSize: '0.8rem',
          fontFamily: 'monospace'
        }
      },
      React.createElement('span', {style: {fontWeight: 'bold'}},
        message.type ? `${(message.type).toUpperCase()}: ` : ''),
      React.createElement('span', null, message.message || message.title || 'Console message')
    );

  return React.createElement(GenericPanel, {
    title: 'Console',
    items: consoleMessages,
    renderItem: renderConsoleMessage,
    maxHeight: 'calc(100% - 2rem)',
    emptyMessage: 'Console is empty',
    withTimestamp: true,
    autoScroll: true,
    maxItems: 100,
    showCount: true
  });
};

export default ConsolePanel;