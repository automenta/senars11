import React, { memo } from 'react';
import useUiStore from '../stores/uiStore.js';
import styles from './Panel.module.css';

const Panel = memo(({ title, children, content: ContentComponent }) => {
  // Get WebSocket connection status from store
  const wsConnected = useUiStore(state => state.wsConnected);

  // If content is a React component, render it; otherwise display as text
  const panelContent = typeof ContentComponent === 'function'
    ? React.createElement(ContentComponent, {})
    : ContentComponent;

  return React.createElement('div', { className: styles.panel },
    React.createElement('div', { className: styles['panel-header'] },
      React.createElement('h3', { className: styles['panel-title'] }, title),
      // Show connection status with a specific ID for the test to find it
      // Using the wsConnected value to determine if status should be shown
      React.createElement('div', { className: styles['panel-status'] },
        React.createElement('span', {
          id: wsConnected ? 'websocket-status' : undefined, // Only add ID when connected for test targeting
          style: {
            fontSize: '0.8rem',
            color: wsConnected ? '#28a745' : '#dc3545',
            fontWeight: 'normal',
            marginLeft: '0.5rem',
            padding: '0.1rem 0.3rem',
            backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
            borderRadius: '3px'
          }
        }, `WebSocket Connection: ${wsConnected ? 'Online' : 'Offline'}`)
      )
    ),
    React.createElement('div', { className: styles['panel-content'] }, children || panelContent)
  );
});

export default Panel;