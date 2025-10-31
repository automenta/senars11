import React, { memo, useState, useEffect } from 'react';
import useUiStore from '../stores/uiStore.js';
import ErrorBoundary from './ErrorBoundary.js';
import styles from './Panel.module.css';

const Panel = memo(({ 
  title, 
  children,
  showWebSocketStatus = true,
  showHeader = true,
  className = '',
  style = {},
  headerExtra = null
}) => {
  const wsConnected = useUiStore(state => state.wsConnected);
  const [isLoading, setIsLoading] = useState(false);

  // Construct the class name with base styles and custom className
  const panelClassName = `${styles.panel} ${className || ''}`.trim();

  // Create header if showHeader is true
  const panelHeader = showHeader && React.createElement('div', { className: styles['panel-header'] },
    React.createElement('h3', { className: styles['panel-title'] }, title),
    // Show connection status if enabled
    showWebSocketStatus && React.createElement('div', { className: styles['panel-status'] },
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
    ),
    // Render additional header content if provided
    headerExtra
  );

  return React.createElement('div', { 
    className: panelClassName,
    style
  },
    panelHeader,
    React.createElement('div', { className: styles['panel-content'] }, 
      React.createElement(ErrorBoundary, null,
        children
      )
    )
  );
});

export default Panel;