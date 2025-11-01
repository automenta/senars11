import React, { memo } from 'react';
import useUiStore from '../stores/uiStore.js';
import ErrorBoundary from './ErrorBoundary.js';
import { WebSocketStatus } from './GenericComponents.js';
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

  // Construct the class name with base styles and custom className
  const panelClassName = `${styles.panel} ${className || ''}`.trim();

  // Create header if showHeader is true
  const panelHeader = showHeader && React.createElement('div', { className: styles['panel-header'] },
    React.createElement('h3', { className: styles['panel-title'] }, title),
    showWebSocketStatus && React.createElement('div', { className: styles['panel-status'] },
      React.createElement(WebSocketStatus, { 
        showLabel: true,
        style: {
          fontSize: '0.8rem',
          marginLeft: '0.5rem',
          padding: '0.1rem 0.3rem',
          backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
          borderRadius: '3px'
        }
      })
    ),
    headerExtra
  );

  return React.createElement('div', { 
    className: panelClassName,
    style
  },
  panelHeader,
  React.createElement('div', { className: styles['panel-content'] }, 
    React.createElement(ErrorBoundary, null, children)
  )
  );
});

export default Panel;